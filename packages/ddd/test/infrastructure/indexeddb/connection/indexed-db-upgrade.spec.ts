import { afterEach, describe, expect, it } from 'vitest';
import { IndexedDbUpgrade } from '../../../../src/infrastructure/indexeddb/connection/indexed-db-upgrade';
import { IndexedDbSchema } from '../../../../src/infrastructure/indexeddb/indexed-db-schema';
import { anotherPage, openDatabase } from '../../../support/indexed-db-environment';
import {
  anotherShop,
  closeShops,
  CustomerSchema,
  openShop,
  order,
  OrderSchema,
  SIX_ORDERS,
} from '../../../support/indexed-db-shop';

interface Structure {
  readonly version: number;
  readonly stores: Record<string, string[]>;
  readonly dataVersion: unknown;
}

async function structure(): Promise<Structure> {
  const database = await openDatabase(anotherPage(), 'shop');
  const names = Array.from(database.objectStoreNames);
  const transaction = database.transaction(names, 'readonly');
  const stores = Object.fromEntries(
    names.map((name) => [name, Array.from(transaction.objectStore(name).indexNames)]),
  );
  const dataVersion = await new Promise((resolve) => {
    const request = transaction.objectStore(IndexedDbUpgrade.store).getAll();
    request.onsuccess = () => resolve(request.result);
  });
  database.close();
  return { version: database.version, stores, dataVersion };
}

describe('IndexedDbUpgrade: bringing a database to what the code declares', () => {
  afterEach(closeShops);

  it('creates the stores, their indexes and the record of the data version in a new database', async () => {
    await (await openShop({ version: 3 })).table(new OrderSchema()).count();

    expect(await structure()).toStrictEqual({
      version: 1,
      stores: {
        '@archi-code/database': [],
        orders: ['byCustomer', 'byCustomerAndTotal', 'byTag'],
      },
      dataVersion: [{ id: 'data-version', version: 3 }],
    });
  });

  it('runs no migration on a new database', async () => {
    const orders = (
      await openShop({ version: 2, migrations: { 2: { orders: () => null } } })
    ).table(new OrderSchema());

    await orders.persist(order(1));

    expect(await orders.count()).toBe(1);
  });

  it('adds the indexes a newer schema declares and removes the ones it dropped', async () => {
    await (await openShop()).table(new OrderSchema()).persistMany(SIX_ORDERS);
    closeShops();
    const orders = anotherShop().table(
      new IndexedDbSchema<{ id: string; total: number }>({
        name: 'orders',
        indexes: { byCustomer: { keyPath: 'customerId', unique: false }, byTotal: 'total' },
      }),
    );

    const page = await orders.find({ index: 'byTotal', direction: 'prev', limit: 1 });

    expect(page.items[0].id).toBe('ord-6');
    expect((await structure()).stores.orders).toStrictEqual(['byCustomer', 'byTotal']);
  });

  it('migrates the rows of every table, version by version, keeping each rowVersion', async () => {
    const first = await openShop();
    await first.table(new OrderSchema()).persistMany([order(1), order(2), order(2), order(3)]);
    await first.table(new CustomerSchema()).persist({ id: 'cus-1', email: 'ANA@shop.test' });
    closeShops();

    const upgraded = anotherShop({
      version: 3,
      migrations: {
        3: {
          orders: (row: { id: string; amount: number }) =>
            row.amount >= 30 ? null : { ...row, amount: row.amount * 100 },
        },
        2: {
          orders: ({ total, ...row }: { total: number }) => ({ ...row, amount: total }),
          customers: (row: { email: string }) => ({ ...row, email: row.email.toLowerCase() }),
          invoices: () => null,
        },
      },
    });
    const orders = upgraded.table(new IndexedDbSchema<{ id: string }>({ name: 'orders' }));

    expect((await orders.find()).items).toStrictEqual([
      expect.objectContaining({ id: 'ord-1', amount: 1000, rowVersion: 1 }),
      expect.objectContaining({ id: 'ord-2', amount: 2000, rowVersion: 2 }),
    ]);
    expect((await orders.get('ord-1')) as object).not.toHaveProperty('total');
    expect(await upgraded.table(new CustomerSchema()).get('cus-1')).toMatchObject({
      email: 'ana@shop.test',
    });
    expect((await structure()).dataVersion).toStrictEqual([{ id: 'data-version', version: 3 }]);
  });

  it('runs only the migrations newer than the data', async () => {
    await (await openShop({ version: 2 })).table(new OrderSchema()).persist(order(1));
    closeShops();
    const ran: number[] = [];
    const note = (version: number) => (row: object) => {
      ran.push(version);
      return row;
    };

    await anotherShop({
      version: 3,
      migrations: { 2: { orders: note(2) }, 3: { orders: note(3) } },
    })
      .table(new OrderSchema())
      .count();

    expect(ran).toStrictEqual([3]);
  });

  it('changes nothing when a migration fails', async () => {
    await (await openShop()).table(new OrderSchema()).persistMany([order(1), order(2)]);
    closeShops();
    const broken = new Error('total is missing');
    const failing = anotherShop({
      version: 2,
      migrations: {
        2: {
          orders: (row: { id: string }) => {
            if (row.id === 'ord-2') {
              throw broken;
            }
            return { ...row, migrated: true };
          },
        },
      },
    });

    await expect(failing.table(new OrderSchema()).count()).rejects.toMatchObject({
      reason: 'request_failed',
      cause: broken,
    });
    closeShops();

    expect(await anotherShop().table(new OrderSchema()).get('ord-1')).not.toHaveProperty(
      'migrated',
    );
    expect((await structure()).dataVersion).toStrictEqual([{ id: 'data-version', version: 1 }]);
  });
});
