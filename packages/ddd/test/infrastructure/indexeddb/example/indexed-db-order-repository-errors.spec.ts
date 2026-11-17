import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConcurrencyException } from '../../../../src/application/index';
import {
  DomainException,
  RequiredValueException,
  TypePrimitiveException,
} from '../../../../src/domain/index';
import {
  ExceptionClassifier,
  ExceptionKind,
  IndexedDbException,
  IndexedDbSchema,
} from '../../../../src/infrastructure/index';
import type { IndexedDbDatabaseOptions } from '../../../../src/infrastructure/index';
import {
  anotherPage,
  freshIndexedDb,
  openDatabase,
  pause,
} from '../../../support/indexed-db-environment';
import { IndexedDbOrderRepository } from './indexeddb-order-repository';
import { CustomerId, Order, OrderAlreadyShipped, OrderId, OrderStatus, Sku } from './order';
import type { OrderRow } from './order.schema';
import { SALES_DATA_VERSION, SalesDb } from './sales.db';

const anaOrderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';
const luisOrderId = '3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f';

class LegacyOrderSchema extends IndexedDbSchema<OrderRow> {
  constructor() {
    super({ name: 'orders' });
  }
}

async function writeRawRow(row: Record<string, unknown>): Promise<void> {
  const database = await openDatabase(indexedDB, 'sales');
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction('orders', 'readwrite');
    transaction.objectStore('orders').put(row);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

function storedRow(row: Partial<Record<keyof OrderRow, unknown>>): Record<string, unknown> {
  return {
    id: anaOrderId,
    customerId: 'cus-ana',
    lines: ['TORCH-01'],
    status: 'placed',
    createdAt: new Date('2026-11-17T10:00:00.000Z'),
    updatedAt: new Date('2026-11-17T10:00:00.000Z'),
    rowVersion: 1,
    ...row,
  };
}

function failureOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => expect.fail('the operation was expected to fail'),
    (error: unknown) => error,
  );
}

describe('IndexedDbOrderRepository: what fails, and how, when orders are stored in a real browser', () => {
  const databases: SalesDb[] = [];
  let database: SalesDb;
  let repository: IndexedDbOrderRepository;

  function openSales(
    options: Omit<IndexedDbDatabaseOptions, 'name'> = {},
  ): [SalesDb, IndexedDbOrderRepository] {
    const opened = new SalesDb({ factory: anotherPage(), ...options });
    databases.push(opened);
    return [opened, new IndexedDbOrderRepository(opened)];
  }

  function placed(id = anaOrderId, customer = 'cus-ana'): Order {
    const order = Order.place(new OrderId(id), new CustomerId(customer));
    order.addLine(new Sku('TORCH-01'));
    return order;
  }

  async function loaded(id = anaOrderId, from = repository): Promise<Order> {
    return (await from.findById(new OrderId(id))) as Order;
  }

  beforeEach(async () => {
    await freshIndexedDb();
    [database, repository] = openSales();
    await repository.save(placed());
  });

  afterEach(() => {
    for (const opened of databases.splice(0)) {
      opened.close();
    }
  });

  describe('a row in the browser that is no longer a valid order', () => {
    it('refuses to load an order whose status is not one the business knows', async () => {
      await writeRawRow(storedRow({ status: 'lost_in_transit' }));

      const error = await failureOf(repository.findById(new OrderId(anaOrderId)));

      expect(error).toBeInstanceOf(DomainException);
      expect(ExceptionClassifier.classify(error)).not.toBe(ExceptionKind.Conflict);
    });

    it('refuses to load an order without a customer', async () => {
      await writeRawRow(storedRow({ customerId: null }));

      await expect(repository.findById(new OrderId(anaOrderId))).rejects.toThrow(
        RequiredValueException,
      );
    });

    it('refuses to load an order whose creation date is not a date', async () => {
      await writeRawRow(storedRow({ createdAt: 'yesterday' }));

      await expect(repository.findById(new OrderId(anaOrderId))).rejects.toThrow(
        TypePrimitiveException,
      );
    });

    it('refuses to load an order with a line without a product', async () => {
      await writeRawRow(storedRow({ lines: ['TORCH-01', null] }));

      await expect(repository.findById(new OrderId(anaOrderId))).rejects.toThrow(
        RequiredValueException,
      );
    });

    it('a corrupt order does not stop the other orders from loading', async () => {
      await repository.save(placed(luisOrderId, 'cus-luis'));
      await writeRawRow(storedRow({ status: 'lost_in_transit' }));

      await expect(repository.findById(new OrderId(anaOrderId))).rejects.toThrow(DomainException);
      expect((await loaded(luisOrderId)).customerId.value).toBe('cus-luis');
    });
  });

  describe('ids that never reach the browser', () => {
    it('an id that is not a UUID fails before the repository is called', () => {
      expect(() => new OrderId('ORD-0001')).toThrow(DomainException);
    });

    it('the nil UUID is not an order id', () => {
      expect(() => new OrderId('00000000-0000-0000-0000-000000000000')).toThrow(
        TypePrimitiveException,
      );
    });
  });

  describe('business rules broken before saving', () => {
    it('shipping an order twice fails in the aggregate and the browser keeps the first shipment', async () => {
      const order = await loaded();
      order.ship();
      await repository.save(order);

      expect(() => order.ship()).toThrow(OrderAlreadyShipped);
      expect(() => order.addLine(new Sku('HELMET-02'))).toThrow(
        `Order ${anaOrderId} is already shipped and can no longer change`,
      );
      await repository.save(order);
      const stored = await loaded();
      expect(stored.status.value).toBe(OrderStatus.SHIPPED);
      expect(stored.lines.map((line) => line.value)).toStrictEqual(['TORCH-01']);
    });
  });

  describe('conflicts between users', () => {
    it('a conflict is classified as a conflict, so an entry point can answer 409', async () => {
      const byAna = await loaded();
      const byLuis = await loaded();
      await repository.save(byAna);

      const error = await failureOf(repository.save(byLuis));

      expect(error).toBeInstanceOf(ConcurrencyException);
      expect(ExceptionClassifier.classify(error)).toBe(ExceptionKind.Conflict);
    });

    it('a failed save leaves the aggregate at its old version, so retrying it fails again', async () => {
      const byAna = await loaded();
      const byLuis = await loaded();
      await repository.save(byAna);

      await expect(repository.save(byLuis)).rejects.toThrow('expected version 1.');
      await expect(repository.save(byLuis)).rejects.toThrow('expected version 1.');
      await expect(repository.remove(byLuis)).rejects.toThrow('expected version 1.');
    });

    it('saving an order another user removed is a conflict, it does not bring the order back', async () => {
      const byAna = await loaded();
      const byLuis = await loaded();
      await repository.remove(byAna);
      byLuis.ship();

      await expect(repository.save(byLuis)).rejects.toThrow(
        `orders with ID ${anaOrderId} was changed by someone else: expected version 1.`,
      );
      expect(await repository.findById(new OrderId(anaOrderId))).toBeNull();
    });

    it('a stale remove from another tab fails and the order stays', async () => {
      const [, otherTab] = openSales();
      const inOtherTab = await loaded(anaOrderId, otherTab);
      const inThisTab = await loaded();
      inThisTab.ship();
      await repository.save(inThisTab);

      await expect(otherTab.remove(inOtherTab)).rejects.toThrow(ConcurrencyException);
      expect((await loaded()).status.value).toBe(OrderStatus.SHIPPED);
    });
  });

  describe('the database of the browser refuses the repository', () => {
    it('code older than the data in the browser cannot read nor write, and the data is kept', async () => {
      const [, newerRelease] = openSales({ version: SALES_DATA_VERSION + 1 });
      await newerRelease.save(placed(luisOrderId, 'cus-luis'));

      const [, olderRelease] = openSales();
      const reading = await failureOf(olderRelease.findById(new OrderId(anaOrderId)));
      const writing = await failureOf(olderRelease.save(placed(luisOrderId, 'cus-other')));

      for (const error of [reading, writing]) {
        expect(error).toBeInstanceOf(IndexedDbException);
        expect(error).not.toBeInstanceOf(ConcurrencyException);
        expect(error).toMatchObject({
          reason: 'schema_mismatch',
          message: `IndexedDB schema_mismatch: database "sales" holds data at version ${SALES_DATA_VERSION + 1}, newer than version ${SALES_DATA_VERSION} of this code`,
        });
        expect(ExceptionClassifier.classify(error)).toBe(ExceptionKind.Internal);
      }
      expect((await loaded(luisOrderId, newerRelease)).customerId.value).toBe('cus-luis');
    });

    it('another page that keeps the database open blocks its creation until it closes', async () => {
      database.close();
      const factory = await freshIndexedDb();
      const stubborn = await openDatabase(factory, 'sales');
      const [, blocked] = openSales({ openTimeout: 30 });

      await expect(blocked.save(placed())).rejects.toMatchObject({
        reason: 'blocked',
        message: expect.stringContaining('did not close within 30 ms'),
      });
      stubborn.close();
      await pause(30);

      await expect(blocked.save(placed())).resolves.toBeUndefined();
      expect(await loaded(anaOrderId, blocked)).not.toBeNull();
    });

    it('a second schema for the orders table of the same database is refused', () => {
      const shared = new SalesDb({ factory: anotherPage() });
      databases.push(shared);
      shared.table(new LegacyOrderSchema());

      expect(() => new IndexedDbOrderRepository(shared)).toThrow(
        'IndexedDB schema_mismatch: database "sales" already has a table "orders" declared with another schema',
      );
    });

    it('a browser that forbids IndexedDB fails with an IndexedDbException, not with its raw DOMException', async () => {
      const [, withoutIndexedDb] = openSales({
        factory: {
          open: () => {
            throw new DOMException('IndexedDB is disabled', 'SecurityError');
          },
        } as unknown as IDBFactory,
      });

      const error = await failureOf(withoutIndexedDb.findById(new OrderId(anaOrderId)));

      expect(error).toBeInstanceOf(IndexedDbException);
      expect(error).toMatchObject({ reason: 'unavailable', cause: expect.any(DOMException) });
    });
  });
});
