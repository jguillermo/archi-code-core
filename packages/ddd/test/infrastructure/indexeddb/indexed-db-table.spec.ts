import { freshIndexedDb } from '../../support/indexed-db-environment';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { IndexedDbTable } from '../../../src/infrastructure/indexeddb/indexed-db-table';
import type { IndexedDbTableOptions } from '../../../src/infrastructure/indexeddb/indexed-db-table';
import { IndexedDbInspector } from '../../../src/infrastructure/indexeddb/indexed-db-inspector';
import { IndexedDbException } from '../../../src/infrastructure/exceptions/indexed-db.exception';

interface OrderRow {
  id: string;
  customerId: string;
  status: string;
  total: number;
  tags: string[];
  placedOn: string;
}

interface PaymentRow {
  id: string;
  orderId: string;
  amount: number;
}

let factory: IDBFactory;

beforeEach(async () => {
  factory = await freshIndexedDb();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const uuid = (prefix: string, number: number): string =>
  `${prefix}-0000-4000-8000-${String(number).padStart(12, '0')}`;

const orderId = (number: number): string => uuid('00000000', number);
const customerId = (number: number): string => uuid('c0000000', number);
const paymentId = (number: number): string => uuid('p0000000', number);
const orderIds = (...numbers: number[]): string[] => numbers.map(orderId);

const ORDER_INDEXES = {
  byCustomer: { keyPath: 'customerId' },
  byStatusDate: { keyPath: ['status', 'placedOn'] },
  byTag: { keyPath: 'tags', multiEntry: true },
} as const;

function ordersTable(
  options: Partial<IndexedDbTableOptions> = {},
  name = 'orders',
): IndexedDbTable<OrderRow> {
  return IndexedDbTable.of<OrderRow>(name, {
    database: 'shop',
    factory,
    indexes: ORDER_INDEXES,
    ...options,
  });
}

function paymentsTable(): IndexedDbTable<PaymentRow> {
  return IndexedDbTable.of<PaymentRow>('payments', {
    database: 'shop',
    factory,
    indexes: { byOrder: { keyPath: 'orderId' } },
  });
}

function order(number: number, overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: orderId(number),
    customerId: customerId(number % 3),
    status: number % 2 === 0 ? 'paid' : 'pending',
    total: number * 10,
    tags: number % 2 === 0 ? ['gift'] : ['express', 'fragile'],
    placedOn: `2026-03-${String((number % 28) + 1).padStart(2, '0')}`,
    ...overrides,
  };
}

function payment(number: number): PaymentRow {
  return { id: paymentId(number), orderId: orderId(number), amount: number * 10 };
}

async function seeded(count = 12): Promise<IndexedDbTable<OrderRow>> {
  const orders = ordersTable();
  await orders.insertMany(Array.from({ length: count }, (_, at) => order(at)));
  return orders;
}

const ids = (rows: readonly OrderRow[]): string[] => rows.map((row) => row.id);

async function rejection(promise: Promise<unknown>): Promise<IndexedDbException> {
  const error = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(IndexedDbException);
  return error as IndexedDbException;
}

function thrown(create: () => unknown): IndexedDbException {
  try {
    create();
  } catch (error) {
    expect(error).toBeInstanceOf(IndexedDbException);
    return error as IndexedDbException;
  }
  throw new Error('expected the call to throw');
}

describe('IndexedDbTable: one object store of IndexedDB, with plain rows keyed by their id', () => {
  describe('declaring a table', () => {
    it('types the index names a table declares, so a query on another index does not compile', async () => {
      const orders = IndexedDbTable.of<OrderRow, 'byCustomer' | 'byStatus'>('orders', {
        database: 'shop',
        factory,
        indexes: { byCustomer: { keyPath: 'customerId' }, byStatus: { keyPath: 'status' } },
      });

      expectTypeOf<NonNullable<Parameters<typeof orders.count>[0]>['index']>().toEqualTypeOf<
        'byCustomer' | 'byStatus' | null | undefined
      >();
      // @ts-expect-error the table declares no index named byCustomr
      await rejection(orders.count({ index: 'byCustomr' }));
      expect(await orders.count({ index: 'byStatus' })).toBe(0);
    });

    it('keys the rows by their id, without indexes nor migrations by default', () => {
      const notes = IndexedDbTable.of('notes', { database: 'notebook', factory });

      expect(notes.definition).toStrictEqual({
        name: 'notes',
        keyPath: 'id',
        autoIncrement: false,
        indexes: [],
        version: 1,
        migrations: [],
      });
      expect([notes.database, notes.name]).toStrictEqual(['notebook', 'notes']);
    });

    it('keeps the indexes it declares, sorted by name, with unique and multiEntry', () => {
      const customers = IndexedDbTable.of('customers', {
        database: 'crm',
        factory,
        indexes: {
          byTag: { keyPath: 'tags', multiEntry: true },
          byEmail: { keyPath: 'email', unique: true },
          byCountry: { keyPath: 'country' },
        },
      });

      expect(customers.definition.indexes).toStrictEqual([
        { name: 'byCountry', keyPath: 'country', unique: false, multiEntry: false },
        { name: 'byEmail', keyPath: 'email', unique: true, multiEntry: false },
        { name: 'byTag', keyPath: 'tags', unique: false, multiEntry: true },
      ]);
    });

    it('keeps the version and the migrations of its data, sorted by version', () => {
      const addCurrency = (row: object) => ({ ...row, currency: 'EUR' });
      const addMethod = (row: object) => ({ ...row, method: 'card' });
      const declare = () =>
        IndexedDbTable.of('payments', {
          database: 'billing',
          factory,
          version: 3,
          migrations: { 3: addMethod, 2: addCurrency },
        });

      const payments = declare();

      expect(payments.definition.version).toBe(3);
      expect(payments.definition.migrations).toStrictEqual([
        [2, addCurrency],
        [3, addMethod],
      ]);
      expect(declare()).toBe(payments);
    });

    it('returns the same table for the same options and for a lookup by name', () => {
      const orders = ordersTable();

      expect(ordersTable()).toBe(orders);
      expect(IndexedDbTable.of<OrderRow>('orders', { factory })).toBe(orders);
    });

    it('lets two places of the code declare the same table alike', () => {
      const declaredBySales = ordersTable({ durability: 'strict' });
      const declaredByShipping = IndexedDbTable.of<OrderRow>('orders', {
        database: 'shop',
        factory,
        durability: 'strict',
        indexes: {
          byTag: { keyPath: 'tags', multiEntry: true },
          byCustomer: { keyPath: 'customerId' },
          byStatusDate: { keyPath: ['status', 'placedOn'] },
        },
      });

      expect(declaredByShipping).toBe(declaredBySales);
    });

    it.each([
      ['other indexes', { indexes: {} }],
      ['another durability', { durability: 'strict' as const }],
      ['another version', { version: 2, migrations: { 2: (row: object) => row } }],
    ])('refuses the same table declared again with %s', (_, options) => {
      ordersTable();

      const error = thrown(() => ordersTable(options));

      expect(error.reason).toBe('schema_mismatch');
      expect(error.message).toContain('table "orders" is declared twice with different options');
    });

    it('refuses a table name already used by another database', () => {
      ordersTable();

      expect(thrown(() => ordersTable({ database: 'warehouse' })).message).toContain(
        'table "orders" already belongs to database "shop"',
      );
    });

    it('refuses to look up a table nobody declared', () => {
      expect(thrown(() => IndexedDbTable.of('refunds', { factory })).message).toContain(
        'table "refunds" is not declared',
      );
    });

    it.each([
      ['an unknown durability', 'orders', { durability: 'eventual' as never }, 'durability must'],
      ['an empty database name', 'orders', { database: '' }, 'a database needs a non-empty name'],
      ['an empty table name', '', {}, 'a table needs a non-empty name'],
      [
        'the name of the store that keeps the table versions',
        '@archi-code/tables',
        {},
        'is the store where the tables keep their versions',
      ],
      ['version 0', 'orders', { version: 0 }, 'must be a positive integer'],
      ['a fractional version', 'orders', { version: 1.5 }, 'must be a positive integer'],
      [
        'a version without its migration',
        'orders',
        { version: 3, migrations: { 2: (row: object) => row } },
        'has no migration for version 3',
      ],
      [
        'a migration beyond its version',
        'orders',
        { migrations: { 2: (row: object) => row } },
        'has a migration for version 2; migrations go from version 2 to 1',
      ],
      [
        'a migration that is not a function',
        'orders',
        { version: 2, migrations: { 2: 'add currency' as never } },
        'must be a function of the row',
      ],
      [
        'a multiEntry index on a compound keyPath',
        'orders',
        { indexes: { byPair: { keyPath: ['status', 'tags'], multiEntry: true } } },
        'cannot be multiEntry with a compound keyPath',
      ],
    ])('refuses %s, a wiring mistake', (_, name, options, message) => {
      const error = thrown(() => ordersTable(options as Partial<IndexedDbTableOptions>, name));

      expect(error.reason).toBe('schema_mismatch');
      expect(error.message).toContain(message);
    });

    it('needs IndexedDB and IDBKeyRange in the environment', () => {
      vi.stubGlobal('indexedDB', undefined);
      const declare = () => IndexedDbTable.of('orders', { database: 'shop' });

      const missing = thrown(declare);
      expect(missing.reason).toBe('unavailable');
      expect(missing.message).toContain('this environment has no indexedDB');

      vi.stubGlobal('indexedDB', factory);
      vi.stubGlobal('IDBKeyRange', undefined);
      expect(thrown(declare).message).toContain('this environment has no IDBKeyRange');
    });

    it('uses the global indexedDB when no factory is passed', async () => {
      vi.stubGlobal('indexedDB', factory);
      const notes = IndexedDbTable.of<{ id: string; text: string }>('notes', {
        database: 'notebook',
      });

      await notes.put({ id: orderId(1), text: 'call the carrier' });

      expect(IndexedDbTable.of('notes')).toBe(notes);
      expect(await notes.get(orderId(1))).toStrictEqual({
        id: orderId(1),
        text: 'call the carrier',
      });
      IndexedDbTable.close('notebook');
      await IndexedDbTable.deleteDatabase('notebook');
      expect(await IndexedDbTable.drop('notebook', 'drafts')).toBe(false);
    });
  });

  describe('tables sharing a database', () => {
    it('opens one connection for every table of a database, declared from different places', async () => {
      const open = vi.spyOn(factory, 'open');
      const orders = ordersTable();
      const payments = paymentsTable();

      await Promise.all([orders.insert(order(1)), payments.insert(payment(1))]);

      expect(open).toHaveBeenCalledTimes(1);
      expect(await orders.get(orderId(1))).toStrictEqual(order(1));
      expect(
        await payments.findOne({ index: 'byOrder', range: { equals: orderId(1) } }),
      ).toStrictEqual(payment(1));
    });

    it('creates the store of a table declared after the database was opened, and the earlier table keeps working', async () => {
      const orders = await seeded(2);

      const payments = paymentsTable();
      await payments.insert(payment(1));

      expect(await payments.get(paymentId(1))).toStrictEqual(payment(1));
      expect(await orders.get(orderId(1))).toStrictEqual(order(1));
      await orders.insert(order(2));
      expect(await orders.ids()).toStrictEqual(orderIds(0, 1, 2));
      expect(
        (await new IndexedDbInspector({ database: 'shop', factory }).structure())?.stores.map(
          (store) => store.name,
        ),
      ).toStrictEqual(['orders', 'payments']);
    });

    it('refuses a store that already exists with another key', async () => {
      await new Promise<void>((resolve, reject) => {
        const request = factory.open('shop', 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore('orders', { keyPath: 'code', autoIncrement: true });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          request.result.close();
          resolve();
        };
      });
      const orders = ordersTable();

      const error = await rejection(orders.count());

      expect(error.reason).toBe('schema_mismatch');
      expect(error.message).toContain('store "orders" exists with another key');
    });

    it('reopens the database on the next call after it was closed', async () => {
      const orders = await seeded(2);

      IndexedDbTable.close('shop', { factory });
      IndexedDbTable.close('warehouse', { factory });

      expect(await orders.count()).toBe(2);
    });

    it('deletes the whole database and creates it again on the next call', async () => {
      const orders = await seeded(2);

      await IndexedDbTable.deleteDatabase('shop', { factory });

      expect(await orders.count()).toBe(0);
    });

    it('drops only stores no table declares, and answers false when there is none to drop', async () => {
      const orders = await seeded(2);

      await expect(IndexedDbTable.drop('shop', 'orders', { factory })).rejects.toMatchObject({
        reason: 'schema_mismatch',
      });
      expect(await IndexedDbTable.drop('shop', 'refunds', { factory })).toBe(false);
      expect(await orders.count()).toBe(2);
    });
  });

  describe('writing rows', () => {
    it('inserts a row and returns its id', async () => {
      const orders = ordersTable();

      expect(await orders.insert(order(1))).toBe(orderId(1));
      expect(await orders.get(orderId(1))).toStrictEqual(order(1));
    });

    it('refuses to insert an id that already exists', async () => {
      const orders = ordersTable();
      await orders.insert(order(1));

      const error = await rejection(orders.insert(order(1, { total: 99 })));

      expect(error.reason).toBe('duplicate_key');
      expect(error.cause).toMatchObject({ name: 'ConstraintError' });
      expect(await orders.get(orderId(1))).toStrictEqual(order(1));
    });

    it('refuses a row without an id', async () => {
      const orders = ordersTable();

      const error = await rejection(orders.insert({ ...order(1), id: undefined } as never));

      expect(error.reason).toBe('invalid_key');
      expect(error.cause).toMatchObject({ name: 'DataError' });
    });

    it('refuses a row that breaks a unique index', async () => {
      const customers = IndexedDbTable.of<{ id: string; email: string }>('customers', {
        database: 'crm',
        factory,
        indexes: { byEmail: { keyPath: 'email', unique: true } },
      });
      await customers.put({ id: customerId(1), email: 'ana@example.com' });

      expect(
        (await rejection(customers.put({ id: customerId(2), email: 'ana@example.com' }))).reason,
      ).toBe('duplicate_key');
    });

    it('puts a row, creating it or replacing the one with its id', async () => {
      const orders = ordersTable();

      await orders.put(order(1));
      await orders.put(order(1, { status: 'shipped' }));

      expect(await orders.get(orderId(1))).toMatchObject({ status: 'shipped' });
      expect(await orders.count()).toBe(1);
    });

    it('inserts many rows in one transaction: all of them or none', async () => {
      const orders = ordersTable();
      await orders.insert(order(2));

      expect((await rejection(orders.insertMany([order(1), order(2), order(3)]))).reason).toBe(
        'duplicate_key',
      );
      expect(await orders.ids()).toStrictEqual(orderIds(2));

      expect(await orders.insertMany([order(1), order(3)])).toStrictEqual(orderIds(1, 3));
      expect(await orders.count()).toBe(3);
    });

    it('puts many rows in one transaction and returns their ids in order', async () => {
      const orders = await seeded(2);

      expect(await orders.putMany([order(1, { total: 1 }), order(5)])).toStrictEqual(
        orderIds(1, 5),
      );
      expect(await orders.get(orderId(1))).toMatchObject({ total: 1 });
    });

    it('refuses a row IndexedDB cannot clone', async () => {
      const orders = ordersTable();

      const error = await rejection(
        orders.put({ ...order(1), total: (() => 1) as unknown as number }),
      );

      expect(error.reason).toBe('request_failed');
      expect(error.cause).toMatchObject({ name: 'DataCloneError' });
    });

    it('writes with the durability it was given', async () => {
      const orders = ordersTable({ durability: 'strict' });

      await orders.put(order(1));

      expect(await orders.exists(orderId(1))).toBe(true);
    });
  });

  describe('updating rows', () => {
    it('replaces a row that exists', async () => {
      const orders = await seeded(3);

      await orders.update(order(1, { status: 'cancelled' }));

      expect(await orders.get(orderId(1))).toMatchObject({ status: 'cancelled' });
    });

    it('refuses to update a row that does not exist, and writes nothing', async () => {
      const orders = await seeded(3);

      const error = await rejection(orders.update(order(9)));

      expect(error.reason).toBe('not_found');
      expect(error.message).toContain(`table "orders" has no row with the id "${orderId(9)}"`);
      expect(await orders.exists(orderId(9))).toBe(false);
    });

    it('patches the fields it receives and returns the whole row', async () => {
      const orders = await seeded(3);

      expect(await orders.patch(orderId(2), { status: 'shipped' })).toStrictEqual(
        order(2, { status: 'shipped' }),
      );
      expect(await orders.get(orderId(2))).toMatchObject({ status: 'shipped', total: 20 });
    });

    it('accepts a patch that repeats the id of the row', async () => {
      const orders = await seeded(3);

      expect(await orders.patch(orderId(2), { id: orderId(2), total: 25 })).toStrictEqual(
        order(2, { total: 25 }),
      );
    });

    it('refuses to patch a row that does not exist', async () => {
      const orders = await seeded(3);

      expect((await rejection(orders.patch(orderId(404), { status: 'shipped' }))).reason).toBe(
        'not_found',
      );
    });

    it('refuses a patch that changes or removes the id, and writes nothing', async () => {
      const orders = await seeded(3);

      const changed = await rejection(orders.patch(orderId(1), { id: orderId(777) }));
      expect(changed.reason).toBe('invalid_key');
      expect(changed.message).toContain('a patch cannot change the id of a row of table "orders"');
      expect((await rejection(orders.patch(orderId(1), { id: {} } as never))).reason).toBe(
        'invalid_key',
      );
      expect((await rejection(orders.patch(orderId(1), { id: undefined } as never))).reason).toBe(
        'invalid_key',
      );
      expect(await orders.exists(orderId(777))).toBe(false);
      expect(await orders.get(orderId(1))).toStrictEqual(order(1));
    });
  });

  describe('reading rows by id', () => {
    it('gets a row, or null when the id is not there', async () => {
      const orders = await seeded(3);

      expect(await orders.get(orderId(0))).toStrictEqual(order(0));
      expect(await orders.get(orderId(404))).toBeNull();
    });

    it('gets many rows in the order of the ids, null where an id is missing', async () => {
      const orders = await seeded(3);

      expect(await orders.getMany(orderIds(2, 404, 0))).toStrictEqual([order(2), null, order(0)]);
      expect(await orders.getMany([])).toStrictEqual([]);
    });

    it('tells whether an id exists', async () => {
      const orders = await seeded(1);

      expect(await orders.exists(orderId(0))).toBe(true);
      expect(await orders.exists(orderId(404))).toBe(false);
    });

    it('refuses a value that is not a valid key', async () => {
      const orders = ordersTable();

      expect((await rejection(orders.get({} as never))).reason).toBe('invalid_key');
    });
  });

  describe('deleting rows', () => {
    it('deletes one row, many rows or all of them', async () => {
      const orders = await seeded(5);

      await orders.delete(orderId(0));
      await orders.delete(orderId(404));
      await orders.deleteMany(orderIds(1, 2));

      expect(await orders.ids()).toStrictEqual(orderIds(3, 4));
      await orders.clear();
      expect(await orders.count()).toBe(0);
    });

    it('deletes the rows a query selects and returns how many', async () => {
      const orders = await seeded(12);

      expect(
        await orders.deleteWhere({
          index: 'byCustomer',
          range: { equals: customerId(1) },
          filter: (row) => row.total > 10,
        }),
      ).toBe(3);
      expect(await orders.count({ index: 'byCustomer', range: { equals: customerId(1) } })).toBe(1);
    });

    it('applies offset and limit to what it deletes', async () => {
      const orders = await seeded(6);

      expect(await orders.deleteWhere({ offset: 1, limit: 2 })).toBe(2);
      expect(await orders.ids()).toStrictEqual(orderIds(0, 3, 4, 5));
      expect(await orders.deleteWhere({ limit: 0 })).toBe(0);
      expect(await orders.deleteWhere({ range: { gt: orderId(900) } })).toBe(0);
    });
  });

  describe('querying', () => {
    it('finds every row in id order with the total when there is no query', async () => {
      const orders = await seeded(4);

      const page = await orders.find();

      expect(ids(page.items)).toStrictEqual(orderIds(0, 1, 2, 3));
      expect(page.total).toBe(4);
    });

    it('finds a page through an index: the total counts the whole range', async () => {
      const orders = await seeded(12);

      const page = await orders.find({
        index: 'byCustomer',
        range: { equals: customerId(1) },
        direction: 'prev',
        offset: 1,
        limit: 2,
      });

      expect(ids(page.items)).toStrictEqual(orderIds(7, 4));
      expect(page.total).toBe(4);
    });

    it('reads the first page with a limit straight from the index', async () => {
      const orders = await seeded(12);

      expect(
        ids(
          (await orders.find({ index: 'byCustomer', range: { equals: customerId(2) }, limit: 2 }))
            .items,
        ),
      ).toStrictEqual(orderIds(2, 5));
    });

    it('stops a page at its limit and returns nothing for limit 0', async () => {
      const orders = await seeded(12);

      expect(ids((await orders.find({ offset: 2, limit: 3 })).items)).toStrictEqual(
        orderIds(2, 3, 4),
      );
      expect(await orders.find({ limit: 0 })).toStrictEqual({ items: [], total: 12, next: null });
      expect(ids((await orders.find({ offset: 10 })).items)).toStrictEqual(orderIds(10, 11));
      expect(ids((await orders.find({ offset: 9, limit: null })).items)).toStrictEqual(
        orderIds(9, 10, 11),
      );
      expect((await orders.find({ offset: 40 })).items).toStrictEqual([]);
    });

    it.each([
      ['equals', { equals: orderId(3) }, [3]],
      ['startsWith', { startsWith: orderId(10).slice(0, -1) }, [10, 11]],
      ['gt', { gt: orderId(9) }, [10, 11]],
      ['gte', { gte: orderId(10) }, [10, 11]],
      ['lt', { lt: orderId(2) }, [0, 1]],
      ['lte', { lte: orderId(1) }, [0, 1]],
      ['gte and lte (between)', { gte: orderId(4), lte: orderId(6) }, [4, 5, 6]],
      ['gt and lt', { gt: orderId(4), lt: orderId(6) }, [5]],
    ])('finds by a %s range', async (_, range, expected) => {
      const orders = await seeded(12);

      expect(ids((await orders.find({ range })).items)).toStrictEqual(orderIds(...expected));
    });

    it('finds, counts and walks by a native IDBKeyRange, also on an index', async () => {
      const orders = await seeded(12);
      const range = IDBKeyRange.bound(orderId(4), orderId(6), false, true);

      expect(ids((await orders.find({ range })).items)).toStrictEqual(orderIds(4, 5));
      expect(await orders.count({ range: IDBKeyRange.upperBound(orderId(2)) })).toBe(3);
      expect(
        ids(
          (await orders.find({ index: 'byCustomer', range: IDBKeyRange.only(customerId(1)) }))
            .items,
        ),
      ).toStrictEqual(
        ids((await orders.find({ index: 'byCustomer', range: { equals: customerId(1) } })).items),
      );
    });

    it('reads the rows by their id when the index is null', async () => {
      const orders = await seeded(4);

      expect(await orders.count({ index: null, range: null })).toBe(4);

      expect(
        ids((await orders.find({ index: null, direction: 'prev', limit: 2 })).items),
      ).toStrictEqual(orderIds(3, 2));
      expect(
        await orders.count({ index: null, range: IDBKeyRange.lowerBound(orderId(1), true) }),
      ).toBe(2);
    });

    it('finds by a compound index and by each value of a multiEntry index', async () => {
      const orders = await seeded(6);

      expect(
        ids(
          (
            await orders.find({
              index: 'byStatusDate',
              range: { gte: ['paid', '2026-03-02'], lte: ['paid', '2026-03-05'] },
            })
          ).items,
        ),
      ).toStrictEqual(orderIds(2, 4));
      expect(await orders.count({ index: 'byTag', range: { equals: 'fragile' } })).toBe(3);
    });

    it('filters rows no index covers: offset, limit and total count only the matches', async () => {
      const orders = await seeded(12);

      const page = await orders.find({ filter: (row) => row.total >= 50, offset: 1, limit: 2 });

      expect(ids(page.items)).toStrictEqual(orderIds(6, 7));
      expect(page.total).toBe(7);
      expect(
        ids((await orders.find({ filter: (row) => row.total >= 50, offset: 3, limit: 1 })).items),
      ).toStrictEqual(orderIds(8));
    });

    it('walks an index once per distinct value with the unique directions', async () => {
      const orders = await seeded(12);

      expect(
        (await orders.find({ index: 'byCustomer', direction: 'nextunique' })).items.map(
          (row) => row.customerId,
        ),
      ).toStrictEqual([customerId(0), customerId(1), customerId(2)]);
      expect(await orders.count({ index: 'byCustomer', direction: 'prevunique' })).toBe(3);
    });

    it('counts all rows, a range, or the rows a filter keeps', async () => {
      const orders = await seeded(12);

      expect(await orders.count()).toBe(12);
      expect(await orders.count({ range: { lt: orderId(3) } })).toBe(3);
      expect(
        await orders.count({ filter: (row) => row.status === 'paid', offset: 4, limit: 1 }),
      ).toBe(6);
    });

    it('finds one row or null', async () => {
      const orders = await seeded(12);

      expect(
        await orders.findOne({
          index: 'byCustomer',
          range: { equals: customerId(2) },
          direction: 'prev',
        }),
      ).toMatchObject({ id: orderId(11) });
      expect(await orders.findOne({ filter: (row) => row.total === 70 })).toMatchObject({
        id: orderId(7),
      });
      expect(await orders.findOne({ range: { equals: orderId(404) } })).toBeNull();
    });

    it('lists the ids a query selects', async () => {
      const orders = await seeded(12);

      expect(
        await orders.ids({ index: 'byCustomer', range: { equals: customerId(0) } }),
      ).toStrictEqual(orderIds(0, 3, 6, 9));
      expect(
        await orders.ids({
          index: 'byCustomer',
          range: { equals: customerId(0) },
          direction: 'prev',
          limit: 2,
        }),
      ).toStrictEqual(orderIds(9, 6));
      expect(await orders.ids({ filter: (row) => row.total > 90, limit: 1 })).toStrictEqual(
        orderIds(10),
      );
      expect(await orders.ids({ index: 'byCustomer', direction: 'nextunique' })).toStrictEqual(
        orderIds(0, 1, 2),
      );
    });

    it('refuses an index the table does not have, naming the ones it has', async () => {
      const orders = await seeded(1);

      const error = await rejection(orders.find({ index: 'byEmail' }));

      expect(error.reason).toBe('unknown_index');
      expect(error.message).toContain(
        'table "orders" has no index "byEmail"; it has byCustomer, byStatusDate, byTag',
      );
      const notes = IndexedDbTable.of('notes', { database: 'shop', factory });
      expect((await rejection(notes.count({ index: 'byAuthor' }))).message).toContain(
        'it has none',
      );
    });

    it.each([
      ['an unknown direction', { direction: 'sideways' }, 'direction must be one of'],
      ['a filter that is not a function', { filter: 'paid' }, 'filter must be a function'],
      ['an empty index name', { index: '' }, 'index must be the name of an index'],
      ['a negative offset', { offset: -1 }, 'offset must be a whole number'],
      ['a fractional limit', { limit: 1.5 }, 'limit must be a whole number'],
      ['a null offset', { offset: null }, 'offset must be a whole number'],
      ['gt and gte together', { range: { gt: 1, gte: 1 } }, 'use gt or gte, not both'],
      ['lt and lte together', { range: { lt: 1, lte: 1 } }, 'use lt or lte, not both'],
      ['an empty range', { range: {} }, 'a range needs equals, startsWith or at least one of'],
      ['startsWith without text', { range: { startsWith: 1 } }, 'startsWith needs a text'],
      [
        'a lower bound above the upper one',
        { range: { gte: orderId(2), lte: orderId(1) } },
        'not a valid key range',
      ],
      ['a value that is not a key', { range: { equals: true } }, 'not a valid key range'],
    ])('refuses %s', async (_, query, message) => {
      const orders = ordersTable();

      const error = await rejection(Promise.resolve().then(() => orders.find(query as never)));

      expect(error.reason).toBe('invalid_query');
      expect(error.message).toContain(message);
    });

    it('rejects with the error a filter throws as its cause', async () => {
      const orders = await seeded(2);
      const broken = new Error('filter broke');

      const error = await rejection(
        orders.find({
          filter: () => {
            throw broken;
          },
        }),
      );

      expect(error.reason).toBe('request_failed');
      expect(error.cause).toBe(broken);
    });
  });

  describe('iterating', () => {
    const collect = async (rows: AsyncIterable<OrderRow>): Promise<string[]> => {
      const seen: string[] = [];
      for await (const row of rows) {
        seen.push(row.id);
      }
      return seen;
    };

    it('walks every row in batches, each in its own transaction', async () => {
      const orders = await seeded(10);

      expect(await collect(orders.iterate({}, { batchSize: 3 }))).toStrictEqual(
        orderIds(0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
      );
    });

    it('walks an index whose values repeat across batches without losing or repeating rows', async () => {
      const orders = await seeded(12);

      expect(
        await collect(orders.iterate({ index: 'byCustomer' }, { batchSize: 2 })),
      ).toStrictEqual(orderIds(0, 3, 6, 9, 1, 4, 7, 10, 2, 5, 8, 11));
      expect(
        await collect(orders.iterate({ index: 'byCustomer', direction: 'prev' }, { batchSize: 3 })),
      ).toStrictEqual(orderIds(11, 8, 5, 2, 10, 7, 4, 1, 9, 6, 3, 0));
    });

    it('walks backwards with a filter, an offset and a limit', async () => {
      const orders = await seeded(12);

      expect(
        await collect(
          orders.iterate(
            { direction: 'prev', filter: (row) => row.status === 'paid', offset: 1, limit: 3 },
            { batchSize: 2 },
          ),
        ),
      ).toStrictEqual(orderIds(8, 6, 4));
    });

    it('walks the distinct values of an index and the rows of a bounded range', async () => {
      const orders = await seeded(12);

      expect(
        await collect(
          orders.iterate({ index: 'byCustomer', direction: 'nextunique' }, { batchSize: 1 }),
        ),
      ).toStrictEqual(orderIds(0, 1, 2));
      expect(
        await collect(
          orders.iterate({ index: 'byCustomer', direction: 'prevunique' }, { batchSize: 1 }),
        ),
      ).toStrictEqual(orderIds(2, 1, 0));
      expect(
        await collect(
          orders.iterate({ range: { gte: orderId(3), lte: orderId(5) } }, { batchSize: 1 }),
        ),
      ).toStrictEqual(orderIds(3, 4, 5));
      expect(
        await collect(
          orders.iterate(
            { range: { gte: orderId(3), lte: orderId(5) }, direction: 'prev' },
            { batchSize: 1 },
          ),
        ),
      ).toStrictEqual(orderIds(5, 4, 3));
      expect(
        await collect(orders.iterate({ range: { equals: orderId(4) } }, { batchSize: 1 })),
      ).toStrictEqual(orderIds(4));
    });

    it('ends at once on an empty table or a limit of 0', async () => {
      const orders = ordersTable();

      expect(await collect(orders.iterate())).toStrictEqual([]);
      expect(await collect((await seeded(3)).iterate({ limit: 0 }))).toStrictEqual([]);
    });

    it('refuses a batch size below 1', async () => {
      const orders = ordersTable();

      const error = await rejection(collect(orders.iterate({}, { batchSize: 0 })));

      expect(error.reason).toBe('invalid_query');
      expect(error.message).toContain('batchSize must be a whole number of 1 or more');
    });
  });

  describe('paging with the next token', () => {
    const pages = async (
      orders: IndexedDbTable<OrderRow>,
      query: Parameters<IndexedDbTable<OrderRow>['find']>[0],
    ): Promise<string[][]> => {
      const seen: string[][] = [];
      let after: string | undefined;
      do {
        const page = await orders.find({ ...query, after });
        seen.push(ids(page.items));
        after = page.next ?? undefined;
      } while (after !== undefined);
      return seen;
    };

    it('walks every page of the ids and stops with a null next', async () => {
      const orders = await seeded(7);

      expect(await pages(orders, { limit: 3 })).toStrictEqual([
        orderIds(0, 1, 2),
        orderIds(3, 4, 5),
        orderIds(6),
      ]);
    });

    it('gives no next when the last page is exactly full', async () => {
      const orders = await seeded(6);

      const second = await orders.find({
        limit: 3,
        after: (await orders.find({ limit: 3 })).next ?? undefined,
      });

      expect(ids(second.items)).toStrictEqual(orderIds(3, 4, 5));
      expect(second.next).toBeNull();
      expect(second.total).toBe(6);
    });

    it('pages an index whose values repeat, backwards, with a filter', async () => {
      const orders = await seeded(12);

      expect(
        await pages(orders, { index: 'byCustomer', direction: 'prev', limit: 5 }),
      ).toStrictEqual([orderIds(11, 8, 5, 2, 10), orderIds(7, 4, 1, 9, 6), orderIds(3, 0)]);
      expect(
        await pages(orders, {
          index: 'byCustomer',
          filter: (row) => row.status === 'paid',
          limit: 2,
        }),
      ).toStrictEqual([orderIds(0, 6), orderIds(4, 10), orderIds(2, 8)]);
    });

    it('pages the distinct values of an index and a bounded range', async () => {
      const orders = await seeded(12);

      expect(
        await pages(orders, { index: 'byCustomer', direction: 'nextunique', limit: 2 }),
      ).toStrictEqual([orderIds(0, 1), orderIds(2)]);
      expect(
        await pages(orders, {
          range: { gte: orderId(2), lte: orderId(6) },
          direction: 'prev',
          limit: 2,
        }),
      ).toStrictEqual([orderIds(6, 5), orderIds(4, 3), orderIds(2)]);
    });

    it('applies an offset after the position of the token', async () => {
      const orders = await seeded(10);
      const first = await orders.find({ limit: 2 });

      expect(
        ids((await orders.find({ limit: 2, offset: 1, after: first.next ?? undefined })).items),
      ).toStrictEqual(orderIds(3, 4));
    });

    it('continues from the token even if the row it points to was deleted', async () => {
      const orders = await seeded(6);
      const first = await orders.find({ limit: 2 });
      await orders.delete(orderId(1));

      expect(
        ids((await orders.find({ limit: 2, after: first.next ?? undefined })).items),
      ).toStrictEqual(orderIds(2, 3));
    });

    it('keeps date and binary index keys in the token', async () => {
      const readings = IndexedDbTable.of<{ id: string; at: Date; raw: ArrayBuffer }>('readings', {
        database: 'sensors',
        factory,
        indexes: { byAt: { keyPath: 'at' }, byRaw: { keyPath: 'raw' } },
      });
      await readings.putMany(
        [1, 2, 3].map((number) => ({
          id: orderId(number),
          at: new Date(Date.UTC(2026, 2, number)),
          raw: new Uint8Array([number, 255 - number]).buffer,
        })),
      );

      for (const index of [undefined, 'byAt', 'byRaw']) {
        const first = await readings.find({ index, limit: 1 });
        const second = await readings.find({ index, limit: 2, after: first.next ?? undefined });
        expect(second.items.map((row) => row.id)).toStrictEqual(orderIds(2, 3));
        expect(second.next).toBeNull();
      }
    });

    it('refuses a token of another index or direction, or one it did not issue', async () => {
      const orders = await seeded(6);
      const next = (await orders.find({ limit: 2 })).next as string;

      expect((await rejection(orders.find({ after: next, direction: 'prev' }))).message).toContain(
        'the after token belongs to another index or direction',
      );
      expect((await rejection(orders.find({ after: next, index: 'byCustomer' }))).reason).toBe(
        'invalid_query',
      );
      for (const forged of [
        'not a token',
        btoa('{"v":2}'),
        btoa('{"v":1,"i":null,"r":"next","k":{},"p":{}}'),
      ]) {
        expect((await rejection(orders.find({ after: forged }))).message).toContain(
          'after is not a token returned by find',
        );
      }
      expect((await rejection(orders.find({ after: 7 as never }))).message).toContain(
        'after must be the next token of a page',
      );
    });

    it('gives an empty page for a token past the end of the range', async () => {
      const orders = await seeded(3);
      const next = (await orders.find({ limit: 1 })).next as string;

      expect(await orders.find({ range: { lte: orderId(0) }, after: next })).toStrictEqual({
        items: [],
        total: 1,
        next: null,
      });
    });

    it('counts the whole selection whatever the token', async () => {
      const orders = await seeded(6);
      const next = (await orders.find({ limit: 2 })).next as string;

      expect(await orders.count({ after: next })).toBe(6);
      expect(await orders.ids({ after: next, limit: 1 })).toStrictEqual(orderIds(2));
      expect(await orders.deleteWhere({ after: next, limit: 1 })).toBe(1);
    });
  });

  describe('transactions over several tables', () => {
    interface OutboxRow {
      id: string;
      eventName: string;
      orderId: string;
    }

    const eventId = (number: number): string => uuid('e0000000', number);

    function shop(): { orders: IndexedDbTable<OrderRow>; outbox: IndexedDbTable<OutboxRow> } {
      return {
        orders: ordersTable(),
        outbox: IndexedDbTable.of<OutboxRow>('outbox', {
          database: 'shop',
          factory,
          durability: 'strict',
        }),
      };
    }

    it('writes an order and its event together and returns what the work returns', async () => {
      const { orders, outbox } = shop();

      const saved = await IndexedDbTable.transaction([orders, outbox], 'readwrite', async (tx) => {
        await tx.insert(orders, order(1));
        await tx.put(outbox, { id: eventId(1), eventName: 'order.placed', orderId: orderId(1) });
        return tx.count(orders);
      });

      expect(saved).toBe(1);
      expect(await outbox.get(eventId(1))).toMatchObject({ orderId: orderId(1) });
    });

    it('reads, decides and writes in the same transaction', async () => {
      const { orders, outbox } = shop();
      await orders.insert(order(1));

      await IndexedDbTable.transaction([orders, outbox], 'readwrite', async (tx) => {
        const current = (await tx.get(orders, orderId(1))) as OrderRow;
        await tx.update(orders, { ...current, status: 'shipped' });
        await tx.insert(outbox, {
          id: eventId(2),
          eventName: 'order.shipped',
          orderId: current.id,
        });
      });

      expect(await orders.get(orderId(1))).toMatchObject({ status: 'shipped' });
      expect(await outbox.count()).toBe(1);
    });

    it('rolls every table back when one write fails', async () => {
      const { orders, outbox } = shop();
      await outbox.put({ id: eventId(1), eventName: 'order.placed', orderId: orderId(0) });

      const error = await rejection(
        IndexedDbTable.transaction([orders, outbox], 'readwrite', async (tx) => {
          await tx.insert(orders, order(1));
          await tx.insert(outbox, {
            id: eventId(1),
            eventName: 'order.placed',
            orderId: orderId(1),
          });
        }),
      );

      expect(error.reason).toBe('duplicate_key');
      expect(await orders.count()).toBe(0);
    });

    it('rolls back and rejects with a business error the work throws', async () => {
      const { orders, outbox } = shop();
      const refused = new Error('the order is already paid');

      await expect(
        IndexedDbTable.transaction([orders, outbox], 'readwrite', async (tx) => {
          await tx.insert(orders, order(1));
          throw refused;
        }),
      ).rejects.toBe(refused);
      expect(await orders.count()).toBe(0);
    });

    it('offers every operation of a table', async () => {
      const { orders, outbox } = shop();

      const result = await IndexedDbTable.transaction([orders, outbox], 'readwrite', async (tx) => {
        await tx.insertMany(orders, [order(1), order(2), order(3)]);
        await tx.putMany(outbox, [
          { id: eventId(1), eventName: 'order.placed', orderId: orderId(1) },
          { id: eventId(2), eventName: 'order.placed', orderId: orderId(2) },
        ]);
        await tx.put(orders, order(4));
        const patched = await tx.patch(orders, orderId(4), { status: 'cancelled' });
        await tx.delete(outbox, eventId(2));
        await tx.deleteMany(orders, orderIds(3));
        return {
          patched: patched.status,
          many: (await tx.getMany(orders, orderIds(1, 404))).map((row) => row?.id ?? null),
          exists: await tx.exists(outbox, eventId(2)),
          page: await tx.find(orders, { limit: 1 }),
          one: (await tx.findOne(orders, { range: { equals: orderId(2) } }))?.id,
          ids: await tx.ids(orders),
          deleted: await tx.deleteWhere(orders, { range: { equals: orderId(1) } }),
          left: await tx.count(orders),
        };
      });

      expect(result).toMatchObject({
        patched: 'cancelled',
        many: [orderId(1), null],
        exists: false,
        page: { total: 3, items: [{ id: orderId(1) }] },
        one: orderId(2),
        ids: orderIds(1, 2, 4),
        deleted: 1,
        left: 2,
      });
      await IndexedDbTable.transaction([outbox], 'readwrite', (tx) => tx.clear(outbox));
      expect(await outbox.count()).toBe(0);
    });

    it('uses the strongest durability of its tables, whatever their order', async () => {
      const { orders, outbox } = shop();

      await IndexedDbTable.transaction([outbox, orders], 'readwrite', (tx) =>
        tx.put(orders, order(1)),
      );

      expect(await orders.count()).toBe(1);
    });

    it('refuses writes in a readonly transaction', async () => {
      const { orders } = shop();

      expect(
        (
          await rejection(
            IndexedDbTable.transaction([orders], 'readonly', (tx) => tx.put(orders, order(1))),
          )
        ).reason,
      ).toBe('request_failed');
    });

    it('refuses no tables, tables of another database and a table it did not open', async () => {
      const { orders, outbox } = shop();
      const notes = IndexedDbTable.of('notes', { database: 'notebook', factory });

      expect(
        (await rejection(IndexedDbTable.transaction([], 'readonly', () => undefined))).message,
      ).toContain('a transaction needs at least one table');
      expect(
        (await rejection(IndexedDbTable.transaction([orders, notes], 'readonly', () => undefined)))
          .message,
      ).toContain('every table of a transaction must belong to database "shop"');
      expect(
        (
          await rejection(
            IndexedDbTable.transaction([orders], 'readonly', (tx) => tx.count(outbox)),
          )
        ).message,
      ).toContain('table "outbox" is not part of this transaction');
    });
  });

  describe('raw access', () => {
    it('runs any request on the store and resolves with its result', async () => {
      const orders = await seeded(3);

      expect(
        await orders.withStore('readonly', (store) =>
          store.index('byCustomer').count(customerId(0)),
        ),
      ).toBe(1);
      expect(
        await orders.withStore('readwrite', (store) => {
          store.delete(orderId(0));
          return undefined;
        }),
      ).toBeUndefined();
      expect(await orders.count()).toBe(2);
    });

    it('rejects when the work aborts the transaction', async () => {
      const orders = await seeded(3);

      const error = await rejection(
        orders.withStore('readwrite', (store, transaction) => {
          store.clear();
          transaction.abort();
          return undefined;
        }),
      );

      expect(error.reason).toBe('request_failed');
      expect(error.message).toContain('the transaction on "orders" was aborted');
      expect(await orders.count()).toBe(3);
    });
  });
});
