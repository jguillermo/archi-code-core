import { anotherPage, freshIndexedDb } from '../../support/indexed-db-environment';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IndexedDbConnections } from '../../../src/infrastructure/indexeddb/indexed-db-connections';
import { IndexedDbInspector } from '../../../src/infrastructure/indexeddb/indexed-db-inspector';
import { IndexedDbTable } from '../../../src/infrastructure/indexeddb/indexed-db-table';
import { IndexedDbException } from '../../../src/infrastructure/exceptions/indexed-db.exception';

interface OrderRow {
  id: string;
  customerId: string;
  total: number;
}

let factory: IDBFactory;

beforeEach(async () => {
  factory = await freshIndexedDb();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const uuid = (number: number): string =>
  `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;

function openRaw(
  version: number,
  upgrade: (database: IDBDatabase) => void = () => undefined,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open('shop', version);
    request.onupgradeneeded = () => upgrade(request.result);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function seedRaw(store: string, rows: readonly object[], options: IDBObjectStoreParameters) {
  return openRaw(1, (database) => {
    const created = database.createObjectStore(store, options);
    rows.forEach((row) => created.add(row));
  }).then((database) => database.close());
}

function structure(page: IDBFactory = factory) {
  return new IndexedDbInspector({ database: 'shop', factory: page }).structure();
}

async function rejection(promise: Promise<unknown>): Promise<IndexedDbException> {
  const error = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(IndexedDbException);
  return error as IndexedDbException;
}

const order = (number: number, total = number * 10): OrderRow => ({
  id: uuid(number),
  customerId: `cus-${number % 2}`,
  total,
});

describe('IndexedDbConnections: one connection per database that manages its own version', () => {
  describe('the version of the database', () => {
    it('creates the database with the store of every declared table and records their versions', async () => {
      const orders = IndexedDbTable.of<OrderRow>('orders', { database: 'shop', factory });
      IndexedDbTable.of('payments', {
        database: 'shop',
        factory,
        version: 3,
        migrations: {
          2: (row) => row,
          3: (row) => row,
        },
      });

      await orders.put(order(1));

      expect(await structure()).toMatchObject({
        version: 1,
        stores: [
          { name: 'orders', keyPath: 'id', autoIncrement: false, tableVersion: 1 },
          { name: 'payments', tableVersion: 3 },
        ],
      });
    });

    it('opens an up-to-date database without raising its version', async () => {
      await IndexedDbTable.of<OrderRow>('orders', { database: 'shop', factory }).put(order(1));
      IndexedDbTable.close('shop', { factory });

      const page = anotherPage();
      const orders = IndexedDbTable.of<OrderRow>('orders', { database: 'shop', factory: page });

      expect(await orders.get(uuid(1))).toStrictEqual(order(1));
      expect((await structure())?.version).toBe(1);
    });

    it('raises the version once to create a table declared after the connection was opened', async () => {
      const orders = IndexedDbTable.of<OrderRow>('orders', { database: 'shop', factory });
      await orders.put(order(1));

      const invoices = IndexedDbTable.of<{ id: string }>('invoices', { database: 'shop', factory });
      await invoices.put({ id: uuid(9) });

      expect(await orders.count()).toBe(1);
      expect(await structure()).toMatchObject({
        version: 2,
        stores: [{ name: 'invoices' }, { name: 'orders' }],
      });
    });

    it('adds a new index of the same table version and indexes the rows already stored', async () => {
      await IndexedDbTable.of<OrderRow>('orders', { database: 'shop', factory }).putMany([
        order(1),
        order(2),
        order(3),
      ]);

      const page = anotherPage();
      const orders = IndexedDbTable.of<OrderRow>('orders', {
        database: 'shop',
        factory: page,
        indexes: { byCustomer: { keyPath: 'customerId' } },
      });

      expect(
        (await orders.find({ index: 'byCustomer', range: { equals: 'cus-1' } })).items,
      ).toStrictEqual([order(1), order(3)]);
      expect((await structure())?.version).toBe(2);
    });

    it('asks to raise the table version to change an index, and keeps an index the code no longer declares', async () => {
      await IndexedDbTable.of<OrderRow>('orders', {
        database: 'shop',
        factory,
        indexes: { byCustomer: { keyPath: 'customerId' }, byTotal: { keyPath: 'total' } },
      }).put(order(1));

      const changed = IndexedDbTable.of<OrderRow>('orders', {
        database: 'shop',
        factory: anotherPage(),
        indexes: { byCustomer: { keyPath: 'customerId', unique: true } },
      });

      expect(await rejection(changed.get(uuid(1)))).toMatchObject({
        reason: 'schema_mismatch',
        message: expect.stringContaining(
          'index "byCustomer" of table "orders" changed: raise the version of the table',
        ),
      });
      const fewer = IndexedDbTable.of<OrderRow>('orders', {
        database: 'shop',
        factory: anotherPage(),
      });
      expect(await fewer.get(uuid(1))).toStrictEqual(order(1));
      expect((await structure())?.stores[0].indexes.map((index) => index.name)).toStrictEqual([
        'byCustomer',
        'byTotal',
      ]);
    });

    it('makes the indexes match the declaration exactly when the table version rises', async () => {
      await IndexedDbTable.of<OrderRow>('orders', {
        database: 'shop',
        factory,
        indexes: { byCustomer: { keyPath: 'customerId' }, byTotal: { keyPath: 'total' } },
      }).putMany([order(1), order(2)]);

      const orders = IndexedDbTable.of<OrderRow>('orders', {
        database: 'shop',
        factory: anotherPage(),
        version: 2,
        migrations: { 2: (row) => row },
        indexes: {
          byCustomer: { keyPath: 'customerId', unique: true },
          byCustomerTotal: { keyPath: ['customerId', 'total'] },
        },
      });

      expect(await orders.count({ index: 'byCustomerTotal' })).toBe(2);
      expect((await structure())?.stores[0]).toMatchObject({
        tableVersion: 2,
        indexes: [
          { name: 'byCustomer', unique: true },
          { name: 'byCustomerTotal', keyPath: ['customerId', 'total'] },
        ],
      });
    });

    it('refuses a store kept under another key or with autoIncrement, and closes what it opened', async () => {
      await seedRaw('orders', [{ code: 'A-1' }], { keyPath: 'code' });
      const orders = IndexedDbTable.of<OrderRow>('orders', { database: 'shop', factory });

      expect(await rejection(orders.get(uuid(1)))).toMatchObject({
        reason: 'schema_mismatch',
        message: expect.stringContaining('store "orders" exists with another key'),
      });
      await IndexedDbTable.deleteDatabase('shop', { factory });

      await seedRaw('orders', [], { keyPath: 'id', autoIncrement: true });
      expect(await rejection(orders.get(uuid(1)))).toMatchObject({ reason: 'schema_mismatch' });
      await IndexedDbTable.deleteDatabase('shop', { factory });

      await orders.put(order(1));
      expect(await orders.get(uuid(1))).toStrictEqual(order(1));
    });
  });

  describe('migrations of a table', () => {
    const migrated = (seen: string[]) => ({
      2: (row: OrderRow) => {
        seen.push(`2:${row.id.slice(-1)}`);
        return row.total === 0 ? null : { ...row, amount: row.total };
      },
      3: (row: OrderRow & { amount: number }) => {
        seen.push(`3:${row.id.slice(-1)}`);
        return { ...row, currency: 'EUR' };
      },
      4: ({ total, ...row }: OrderRow & { amount: number; currency: string }) => {
        seen.push(`4:${row.id.slice(-1)}`);
        return { ...row, cents: total * 100 };
      },
    });

    it('takes data of the oldest version to the last one, one whole version after another', async () => {
      await IndexedDbTable.of<OrderRow>('orders', { database: 'shop', factory }).putMany([
        order(1),
        order(2, 0),
        order(3),
      ]);
      const seen: string[] = [];

      const orders = IndexedDbTable.of<any>('orders', {
        database: 'shop',
        factory: anotherPage(),
        version: 4,
        migrations: migrated(seen),
      });

      expect((await orders.find()).items).toStrictEqual([
        { id: uuid(1), customerId: 'cus-1', amount: 10, currency: 'EUR', cents: 1000 },
        { id: uuid(3), customerId: 'cus-1', amount: 30, currency: 'EUR', cents: 3000 },
      ]);
      expect(seen).toStrictEqual(['2:1', '2:2', '2:3', '3:1', '3:3', '4:1', '4:3']);
      expect((await structure())?.stores[0].tableVersion).toBe(4);
    });

    it('runs only the migrations after the version the data already has', async () => {
      await IndexedDbTable.of<OrderRow>('orders', { database: 'shop', factory }).put(order(1));
      const atThree: string[] = [];
      const { 2: two, 3: three } = migrated(atThree);
      await IndexedDbTable.of('orders', {
        database: 'shop',
        factory: anotherPage(),
        version: 3,
        migrations: { 2: two, 3: three },
      }).count();
      const atFour: string[] = [];

      const orders = IndexedDbTable.of<any>('orders', {
        database: 'shop',
        factory: anotherPage(),
        version: 4,
        migrations: migrated(atFour),
      });

      expect(await orders.get(uuid(1))).toStrictEqual({
        id: uuid(1),
        customerId: 'cus-1',
        amount: 10,
        currency: 'EUR',
        cents: 1000,
      });
      expect(atThree).toStrictEqual(['2:1', '3:1']);
      expect(atFour).toStrictEqual(['4:1']);
    });

    it('creates a new table at its version without running any migration', async () => {
      const seen: string[] = [];
      const orders = IndexedDbTable.of<any>('orders', {
        database: 'shop',
        factory,
        version: 4,
        migrations: migrated(seen),
      });

      await orders.put({ id: uuid(1), cents: 500 });

      expect(seen).toStrictEqual([]);
      expect((await structure())?.stores[0].tableVersion).toBe(4);
    });

    it('treats a store that has no recorded version as version 1', async () => {
      await seedRaw('orders', [order(1)], { keyPath: 'id' });
      const seen: string[] = [];
      const { 2: two } = migrated(seen);

      const orders = IndexedDbTable.of<any>('orders', {
        database: 'shop',
        factory,
        version: 2,
        migrations: { 2: two },
      });

      expect(await orders.get(uuid(1))).toMatchObject({ amount: 10 });
      expect(seen).toStrictEqual(['2:1']);
      expect(await structure()).toMatchObject({ version: 2, stores: [{ tableVersion: 2 }] });
    });

    it('lets older code keep working on data a newer version already migrated', async () => {
      await IndexedDbTable.of<any>('orders', {
        database: 'shop',
        factory,
        version: 2,
        migrations: { 2: (row) => row },
        indexes: { byCustomer: { keyPath: 'customerId' } },
      }).put(order(1));

      const older = IndexedDbTable.of<OrderRow>('orders', {
        database: 'shop',
        factory: anotherPage(),
        indexes: { byTotal: { keyPath: 'total' } },
      });

      expect(await older.get(uuid(1))).toStrictEqual(order(1));
      expect(await structure()).toMatchObject({ version: 1, stores: [{ tableVersion: 2 }] });
    });

    it('aborts the whole upgrade when a migration throws: the data keeps its version and rows', async () => {
      await IndexedDbTable.of<OrderRow>('orders', { database: 'shop', factory }).putMany([
        order(1),
        order(2),
      ]);
      const broken = new Error('no exchange rate');

      const failing = IndexedDbTable.of<any>('orders', {
        database: 'shop',
        factory: anotherPage(),
        version: 3,
        migrations: {
          2: (row) => ({ ...row, amount: row.total }),
          3: (row) => {
            if (row.id === uuid(2)) {
              throw broken;
            }
            return row;
          },
        },
      });

      expect(await rejection(failing.count())).toMatchObject({
        reason: 'request_failed',
        message: expect.stringContaining('the migration of table "orders" to version 3 failed'),
        cause: broken,
      });
      expect(await structure()).toMatchObject({ version: 1, stores: [{ tableVersion: 1 }] });
      const fixed = IndexedDbTable.of<any>('orders', {
        database: 'shop',
        factory: anotherPage(),
        version: 3,
        migrations: { 2: (row) => ({ ...row, amount: row.total }), 3: (row) => row },
      });
      expect(await fixed.get(uuid(2))).toMatchObject({ amount: 20 });
    });

    it('aborts the upgrade when a migration changes the id of a row', async () => {
      await IndexedDbTable.of<OrderRow>('orders', { database: 'shop', factory }).put(order(1));

      const orders = IndexedDbTable.of<any>('orders', {
        database: 'shop',
        factory: anotherPage(),
        version: 2,
        migrations: { 2: (row) => ({ ...row, id: uuid(7) }) },
      });

      expect(await rejection(orders.count())).toMatchObject({
        reason: 'invalid_key',
        message: expect.stringContaining('to version 2 wrote a row IndexedDB refuses'),
      });
    });

    it('aborts the upgrade when the migrated rows break a unique index', async () => {
      await IndexedDbTable.of<OrderRow>('orders', { database: 'shop', factory }).putMany([
        order(1),
        order(2),
      ]);

      const orders = IndexedDbTable.of<any>('orders', {
        database: 'shop',
        factory: anotherPage(),
        version: 2,
        migrations: { 2: (row) => ({ ...row, reference: 'same' }) },
        indexes: { byReference: { keyPath: 'reference', unique: true } },
      });

      expect(await rejection(orders.count())).toMatchObject({ reason: 'duplicate_key' });
      expect((await structure())?.stores[0]).toMatchObject({ tableVersion: 1, indexes: [] });
    });

    it.each([
      [{ version: 3, migrations: { 2: (row: object) => row } }, 'has no migration for version 3'],
      [{ version: 2, migrations: {} }, 'has no migration for version 2'],
      [
        { version: 2, migrations: { 1: (row: object) => row, 2: (row: object) => row } },
        'has a migration for version 1',
      ],
      [
        { version: 2, migrations: { 2: (row: object) => row, 3: (row: object) => row } },
        'has a migration for version 3',
      ],
      [{ version: 2, migrations: { 2: 'rename' as never } }, 'must be a function of the row'],
      [{ version: 0 }, 'must be a positive integer, received 0'],
    ])('refuses the migrations %o of a table', (options, message) => {
      expect(() => IndexedDbTable.of('orders', { database: 'shop', factory, ...options })).toThrow(
        message,
      );
    });
  });

  describe('lifecycle of the connection', () => {
    it('closes when another page installs a newer version and opens again on demand', async () => {
      const orders = IndexedDbTable.of<OrderRow>('orders', { database: 'shop', factory });
      await orders.put(order(1));

      await IndexedDbTable.of('invoices', { database: 'shop', factory: anotherPage() }).count();

      expect(await orders.get(uuid(1))).toStrictEqual(order(1));
      expect((await structure())?.version).toBe(2);
    });

    it('rejects as blocked while a connection elsewhere ignores the new version, then recovers', async () => {
      const elsewhere = await openRaw(1, (database) => database.createObjectStore('notes'));
      const orders = IndexedDbTable.of<OrderRow>('orders', { database: 'shop', factory });

      expect(await rejection(orders.count())).toMatchObject({
        reason: 'blocked',
        message: expect.stringContaining('database "shop" is open elsewhere'),
      });

      elsewhere.close();
      expect(await orders.count()).toBe(0);
    });

    it('closes the connection on demand and opens it again on the next call', async () => {
      const orders = IndexedDbTable.of<OrderRow>('orders', { database: 'shop', factory });
      await orders.put(order(1));

      IndexedDbTable.close('shop', { factory });
      IndexedDbTable.close('unknown', { factory });

      expect(await orders.get(uuid(1))).toStrictEqual(order(1));
    });

    it('closes a connection that is still opening and serves the call with a new one', async () => {
      const orders = IndexedDbTable.of<OrderRow>('orders', { database: 'shop', factory });

      const counting = orders.count();
      IndexedDbTable.close('shop', { factory });

      expect(await counting).toBe(0);
    });

    it('closes every connection when the page is hidden and opens it again on demand', async () => {
      const orders = IndexedDbTable.of<OrderRow>('orders', { database: 'shop', factory });
      await orders.put(order(1));
      const close = vi.spyOn(IDBDatabase.prototype, 'close');

      window.dispatchEvent(new Event('pagehide'));

      expect(close).toHaveBeenCalled();
      close.mockRestore();
      expect(await orders.get(uuid(1))).toStrictEqual(order(1));
    });

    it('forgets a connection that failed after it was closed, so the next call tries again', async () => {
      await seedRaw('orders', [], { keyPath: 'code' });
      const orders = IndexedDbTable.of<OrderRow>('orders', { database: 'shop', factory });

      const reading = orders.get(uuid(1));
      IndexedDbTable.close('shop', { factory });

      expect(await rejection(reading)).toMatchObject({ reason: 'schema_mismatch' });
      await IndexedDbTable.deleteDatabase('shop', { factory });
      expect(await orders.get(uuid(1))).toBeNull();
    });

    it('lets a newer version in while the inspector reads a database', async () => {
      await IndexedDbTable.of<OrderRow>('orders', { database: 'shop', factory }).put(order(1));
      IndexedDbTable.close('shop', { factory });
      const reading = (await IndexedDbConnections.openExisting(factory, 'shop')) as IDBDatabase;

      const newer = await openRaw(2);

      expect(newer.version).toBe(2);
      newer.close();
      reading.close();
    });

    it('needs indexedDB in the environment', () => {
      vi.stubGlobal('indexedDB', undefined);
      try {
        expect(() => IndexedDbTable.close('shop')).toThrow('this environment has no indexedDB');
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  describe('deleting', () => {
    it('deletes a database, and refuses while a connection elsewhere keeps it open', async () => {
      const orders = IndexedDbTable.of<OrderRow>('orders', { database: 'shop', factory });
      await orders.put(order(1));

      await IndexedDbTable.deleteDatabase('shop', { factory });
      expect(await IndexedDbInspector.databases(factory)).toStrictEqual([]);

      const elsewhere = await openRaw(1);
      expect(await rejection(IndexedDbTable.deleteDatabase('shop', { factory }))).toMatchObject({
        reason: 'blocked',
      });
      elsewhere.close();
    });

    it('drops a table no code declares, with its recorded version', async () => {
      await IndexedDbTable.of('legacy', { database: 'shop', factory }).put({ id: uuid(1) });
      const orders = IndexedDbTable.of<OrderRow>('orders', {
        database: 'shop',
        factory: anotherPage(),
      });
      await orders.put(order(1));

      expect(await IndexedDbTable.drop('shop', 'legacy', { factory: anotherPage() })).toBe(true);

      expect((await structure())?.stores.map((store) => store.name)).toStrictEqual(['orders']);
      expect(await orders.get(uuid(1))).toStrictEqual(order(1));
    });

    it('drops a store of a database the tables never managed', async () => {
      await seedRaw('notes', [], { keyPath: 'id' });

      expect(await IndexedDbTable.drop('shop', 'notes', { factory })).toBe(true);
      expect((await structure())?.stores).toStrictEqual([]);
    });

    it('answers false when the database or the store is not there', async () => {
      expect(await IndexedDbTable.drop('shop', 'legacy', { factory })).toBe(false);
      expect(await IndexedDbInspector.databases(factory)).toStrictEqual([]);

      await IndexedDbTable.of('orders', { database: 'shop', factory }).count();
      expect(await IndexedDbTable.drop('shop', 'legacy', { factory })).toBe(false);
    });

    it('refuses to drop a declared table or the store of the table versions', async () => {
      IndexedDbTable.of('orders', { database: 'shop', factory });

      expect(await rejection(IndexedDbTable.drop('shop', 'orders', { factory }))).toMatchObject({
        message: expect.stringContaining('table "orders" is still declared'),
      });
      expect(
        await rejection(IndexedDbTable.drop('shop', '@archi-code/tables', { factory })),
      ).toMatchObject({ message: expect.stringContaining('cannot be dropped') });
    });
  });
});
