import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConcurrencyException } from '../../../../src/application/index';
import { IndexedDbException, IndexedDbSchema } from '../../../../src/infrastructure/index';
import type { IndexedDbDatabaseOptions } from '../../../../src/infrastructure/index';
import { anotherPage, freshIndexedDb, openDatabase } from '../../../support/indexed-db-environment';
import { IndexedDbOrderRepository } from './indexeddb-order-repository';
import { CustomerId, Order, OrderId, OrderStatus, Sku } from './order';
import { renameNewStatusAndDropCancelled, stampMissingUpdatedAt } from './order.migrations';
import type { OrderRowV1, OrderRowV2 } from './order.migrations';
import { SALES_DATA_VERSION, SALES_MIGRATIONS, SalesDb } from './sales.db';

const placedOrderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';
const shippedOrderId = '3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f';
const cancelledOrderId = '7d8e9f0a-1b2c-4d3e-9f4a-5b6c7d8e9f0a';
const placedOn = new Date('2025-03-14T09:30:00.000Z');
const updatedOn = new Date('2025-06-01T12:00:00.000Z');

class OrderSchemaV1 extends IndexedDbSchema<OrderRowV1> {
  constructor() {
    super({ name: 'orders', indexes: { byCustomer: 'customerId' } });
  }
}

class OrderSchemaV2 extends IndexedDbSchema<OrderRowV2> {
  constructor() {
    super({ name: 'orders', indexes: { byCustomer: 'customerId' } });
  }
}

function rowV1(id: string, status: OrderRowV1['status']): OrderRowV1 {
  return { id, customerId: 'cus-ana', lines: ['TORCH-01'], status, createdAt: placedOn };
}

const RELEASE_1_ORDERS: readonly OrderRowV1[] = [
  rowV1(placedOrderId, 'new'),
  rowV1(shippedOrderId, 'shipped'),
  rowV1(cancelledOrderId, 'cancelled'),
];

async function recordedDataVersion(): Promise<number | undefined> {
  const database = await openDatabase(indexedDB, 'sales');
  const record = await new Promise<{ version: number } | undefined>((resolve, reject) => {
    const request = database
      .transaction('@archi-code/database')
      .objectStore('@archi-code/database')
      .get('data-version');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return record?.version;
}

describe('IndexedDbOrderRepository: orders stored by an older release of the shop are migrated', () => {
  const databases: SalesDb[] = [];

  function openSales(options: Omit<IndexedDbDatabaseOptions, 'name'> = {}): SalesDb {
    const database = new SalesDb({ factory: anotherPage(), ...options });
    databases.push(database);
    return database;
  }

  function currentRelease(options: Omit<IndexedDbDatabaseOptions, 'name'> = {}) {
    return new IndexedDbOrderRepository(openSales(options));
  }

  function closeAll(): void {
    for (const database of databases.splice(0)) {
      database.close();
    }
  }

  async function storedByRelease1(rows: readonly OrderRowV1[] = RELEASE_1_ORDERS): Promise<void> {
    const release1 = openSales({ version: 1, migrations: {} });
    await release1.table(new OrderSchemaV1()).persistMany(rows);
    closeAll();
  }

  async function loaded(id: string, repository: IndexedDbOrderRepository): Promise<Order | null> {
    return repository.findById(new OrderId(id));
  }

  beforeEach(async () => {
    await freshIndexedDb();
  });

  afterEach(closeAll);

  describe('the migration functions', () => {
    it('release 2 renames the new status to placed and keeps shipped orders', () => {
      expect(renameNewStatusAndDropCancelled(rowV1(placedOrderId, 'new'))).toStrictEqual({
        ...rowV1(placedOrderId, 'new'),
        status: OrderStatus.PLACED,
      });
      expect(renameNewStatusAndDropCancelled(rowV1(shippedOrderId, 'shipped'))?.status).toBe(
        OrderStatus.SHIPPED,
      );
    });

    it('release 2 drops cancelled orders, a status the business no longer has', () => {
      expect(renameNewStatusAndDropCancelled(rowV1(cancelledOrderId, 'cancelled'))).toBeNull();
    });

    it('release 3 stamps a missing update date with the creation date and keeps an existing one', () => {
      const withoutUpdate = { ...rowV1(placedOrderId, 'new'), status: OrderStatus.PLACED };

      expect(stampMissingUpdatedAt(withoutUpdate).updatedAt).toBe(placedOn);
      expect(stampMissingUpdatedAt({ ...withoutUpdate, updatedAt: updatedOn }).updatedAt).toBe(
        updatedOn,
      );
    });
  });

  it('a browser that never ran the shop runs no migration and starts at the current data version', async () => {
    const migrate = vi.fn((row: object) => row);
    const repository = currentRelease({
      migrations: { 2: { orders: migrate }, 3: { orders: migrate } },
    });
    const order = Order.place(new OrderId(placedOrderId), new CustomerId('cus-ana'));
    order.addLine(new Sku('TORCH-01'));

    await repository.save(order);

    expect(migrate).not.toHaveBeenCalled();
    expect(await recordedDataVersion()).toBe(SALES_DATA_VERSION);
    expect((await loaded(placedOrderId, repository))?.customerId.value).toBe('cus-ana');
  });

  describe('orders stored by release 1', () => {
    beforeEach(() => storedByRelease1());

    it('load as valid orders of the current release', async () => {
      const repository = currentRelease();

      const placed = await loaded(placedOrderId, repository);
      const shipped = await loaded(shippedOrderId, repository);

      expect(placed?.toPrimitives()).toEqual({
        id: placedOrderId,
        customerId: 'cus-ana',
        lines: ['TORCH-01'],
        status: OrderStatus.PLACED,
        createdAt: placedOn,
        updatedAt: placedOn,
      });
      expect(shipped?.status.value).toBe(OrderStatus.SHIPPED);
      expect(await recordedDataVersion()).toBe(SALES_DATA_VERSION);
    });

    it('lose the cancelled ones, which the business no longer keeps', async () => {
      expect(await loaded(cancelledOrderId, currentRelease())).toBeNull();
    });

    it('run every migration once, in order, on every stored order', async () => {
      const calls: string[] = [];
      const repository = currentRelease({
        migrations: {
          2: {
            orders: (row: OrderRowV1) => {
              calls.push(`2:${row.status}`);
              return renameNewStatusAndDropCancelled(row);
            },
          },
          3: {
            orders: (row: OrderRowV2) => {
              calls.push(`3:${row.status}`);
              return stampMissingUpdatedAt(row);
            },
          },
        },
      });

      await loaded(placedOrderId, repository);
      await loaded(shippedOrderId, repository);

      expect(calls.sort()).toStrictEqual([
        '2:cancelled',
        '2:new',
        '2:shipped',
        '3:placed',
        '3:shipped',
      ]);
    });

    it('keep the rowVersion they had, so the concurrency check goes on working', async () => {
      closeAll();
      await freshIndexedDb();
      const release1 = openSales({ version: 1, migrations: {} });
      const orders = release1.table(new OrderSchemaV1());
      await orders.persist(rowV1(placedOrderId, 'new'));
      for (const rowVersion of [1, 2, 3]) {
        await orders.persist({ ...rowV1(placedOrderId, 'new'), rowVersion });
      }
      closeAll();
      const repository = currentRelease();
      const byAna = (await loaded(placedOrderId, repository)) as Order;
      const byLuis = (await loaded(placedOrderId, repository)) as Order;

      byAna.ship();
      await repository.save(byAna);

      await expect(repository.save(byLuis)).rejects.toThrow(
        `Order with ID ${placedOrderId} was changed by someone else: expected version 4.`,
      );
      expect((await loaded(placedOrderId, repository))?.status.value).toBe(OrderStatus.SHIPPED);
    });
  });

  it('orders already at release 2 only run the migration of release 3', async () => {
    const release2 = openSales({ version: 2, migrations: { 2: SALES_MIGRATIONS[2] } });
    await release2.table(new OrderSchemaV2()).persistMany([
      { ...rowV1(placedOrderId, 'new'), status: OrderStatus.PLACED },
      { ...rowV1(shippedOrderId, 'shipped'), status: OrderStatus.SHIPPED, updatedAt: updatedOn },
    ]);
    closeAll();
    const release2Migration = vi.fn(renameNewStatusAndDropCancelled);
    const release3Migration = vi.fn(stampMissingUpdatedAt);
    const repository = currentRelease({
      migrations: { 2: { orders: release2Migration }, 3: { orders: release3Migration } },
    });

    const placed = await loaded(placedOrderId, repository);
    const shipped = await loaded(shippedOrderId, repository);

    expect(release2Migration).not.toHaveBeenCalled();
    expect(release3Migration).toHaveBeenCalledTimes(2);
    expect(placed?.updatedAt.value.toISOString()).toBe(placedOn.toISOString());
    expect(shipped?.updatedAt.value.toISOString()).toBe(updatedOn.toISOString());
  });

  describe('a migration that fails', () => {
    const corrupt = new Error('order without lines');

    beforeEach(() => storedByRelease1());

    it('rolls the whole upgrade back: no order changes and the data stays at release 1', async () => {
      const repository = currentRelease({
        migrations: {
          ...SALES_MIGRATIONS,
          3: {
            orders: (row: OrderRowV2) => {
              if (row.id === shippedOrderId) {
                throw corrupt;
              }
              return stampMissingUpdatedAt(row);
            },
          },
        },
      });

      const error = await repository.findById(new OrderId(placedOrderId)).catch((e) => e);

      expect(error).toBeInstanceOf(IndexedDbException);
      expect(error).not.toBeInstanceOf(ConcurrencyException);
      expect(error).toMatchObject({ reason: 'request_failed', cause: corrupt });
      closeAll();
      expect(await recordedDataVersion()).toBe(1);
      const untouched = await openSales({ version: 1, migrations: {} })
        .table(new OrderSchemaV1())
        .getMany([placedOrderId, cancelledOrderId]);
      expect(untouched.map((row) => row.status)).toStrictEqual(['new', 'cancelled']);
    });

    it('the fixed release migrates the same data afterwards', async () => {
      const broken = currentRelease({
        migrations: {
          ...SALES_MIGRATIONS,
          3: {
            orders: () => {
              throw corrupt;
            },
          },
        },
      });
      await expect(broken.findById(new OrderId(placedOrderId))).rejects.toThrow(IndexedDbException);
      closeAll();

      const fixed = currentRelease();

      expect((await loaded(placedOrderId, fixed))?.status.value).toBe(OrderStatus.PLACED);
      expect(await recordedDataVersion()).toBe(SALES_DATA_VERSION);
    });
  });

  it('a tab still running release 1 does not block the upgrade and is refused afterwards', async () => {
    const oldTab = openSales({ version: 1, migrations: {} });
    const oldOrders = oldTab.table(new OrderSchemaV1());
    await oldOrders.persistMany(RELEASE_1_ORDERS);

    expect((await loaded(placedOrderId, currentRelease()))?.status.value).toBe(OrderStatus.PLACED);

    await expect(oldOrders.get(placedOrderId)).rejects.toMatchObject({
      reason: 'schema_mismatch',
      message: `IndexedDB schema_mismatch: database "sales" holds data at version ${SALES_DATA_VERSION}, newer than version 1 of this code`,
    });
  });
});
