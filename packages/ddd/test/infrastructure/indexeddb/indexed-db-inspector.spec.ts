import { freshIndexedDb } from '../../support/indexed-db-environment';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IndexedDbInspector } from '../../../src/infrastructure/indexeddb/indexed-db-inspector';
import { IndexedDbTable } from '../../../src/infrastructure/indexeddb/indexed-db-table';
import { IndexedDbException } from '../../../src/infrastructure/exceptions/indexed-db.exception';

interface OrderRow {
  id: string;
  customerId: string;
  tags: string[];
}

interface PaymentRow {
  id: string;
  amount: number;
  currency?: string;
}

let factory: IDBFactory;

beforeEach(async () => {
  factory = await freshIndexedDb();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const uuid = (prefix: string, number: number): string =>
  `${prefix}-0000-4000-8000-${String(number).padStart(12, '0')}`;

const orderId = (number: number): string => uuid('00000000', number);
const customerId = (number: number): string => uuid('c0000000', number);

const ORDER_INDEXES = {
  byCustomer: { keyPath: 'customerId' },
  byTag: { keyPath: 'tags', multiEntry: true },
} as const;

const ORDERS = [
  { id: orderId(1), customerId: customerId(1), tags: ['gift', 'express'] },
  { id: orderId(2), customerId: customerId(1), tags: ['gift'] },
  { id: orderId(3), customerId: customerId(2), tags: [] },
];

async function shop(): Promise<IndexedDbInspector> {
  const orders = IndexedDbTable.of<OrderRow>('orders', {
    database: 'shop',
    factory,
    indexes: ORDER_INDEXES,
  });
  const payments = IndexedDbTable.of<PaymentRow>('payments', {
    database: 'shop',
    factory,
    version: 2,
    migrations: { 2: (row: PaymentRow) => ({ ...row, currency: 'EUR' }) },
  });
  await orders.insertMany(ORDERS);
  await payments.count();
  IndexedDbTable.close('shop', { factory });
  return new IndexedDbInspector({ database: 'shop', factory });
}

function changeSchema(
  database: string,
  change: (opened: IDBDatabase, transaction: IDBTransaction) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const current = factory.open(database);
    current.onerror = () => reject(current.error);
    current.onsuccess = () => {
      const version = current.result.version;
      current.result.close();
      const request = factory.open(database, version + 1);
      request.onupgradeneeded = () => change(request.result, request.transaction as IDBTransaction);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
    };
  });
}

describe('IndexedDbInspector: what a database holds, without changing it', () => {
  it('needs the name of a database and an IndexedDB', () => {
    expect(() => new IndexedDbInspector({ database: '', factory })).toThrow(
      'a database needs a non-empty name',
    );
    vi.stubGlobal('indexedDB', undefined);
    expect(() => new IndexedDbInspector({ database: 'shop' })).toThrow(
      'this environment has no indexedDB',
    );
  });

  it('describes the version, the stores with their table version and every index', async () => {
    const inspector = await shop();

    expect(await inspector.structure()).toStrictEqual({
      name: 'shop',
      version: 1,
      stores: [
        {
          name: 'orders',
          keyPath: 'id',
          autoIncrement: false,
          indexes: [
            { name: 'byCustomer', keyPath: 'customerId', unique: false, multiEntry: false },
            { name: 'byTag', keyPath: 'tags', unique: false, multiEntry: true },
          ],
          tableVersion: 1,
        },
        { name: 'payments', keyPath: 'id', autoIncrement: false, indexes: [], tableVersion: 2 },
      ],
    });
    expect(await inspector.exists()).toBe(true);
    expect(await inspector.store('payments')).toMatchObject({ tableVersion: 2 });
    expect(await inspector.store('refunds')).toBeNull();
  });

  it('hides the store where the tables keep their versions', async () => {
    const inspector = await shop();

    expect(await inspector.store('@archi-code/tables')).toBeNull();
    expect((await inspector.statistics())?.stores.map((store) => store.name)).toStrictEqual([
      'orders',
      'payments',
    ]);
    await expect(inspector.sample('@archi-code/tables')).rejects.toMatchObject({
      reason: 'schema_mismatch',
    });
  });

  it('describes a database no table created, whose stores have no table version', async () => {
    await changeSchema('legacy-crm', (opened) => {
      opened.createObjectStore('customers', { keyPath: 'code', autoIncrement: true });
      opened.createObjectStore('notes');
    });

    expect(
      await new IndexedDbInspector({ database: 'legacy-crm', factory }).structure(),
    ).toStrictEqual({
      name: 'legacy-crm',
      version: 2,
      stores: [
        {
          name: 'customers',
          keyPath: 'code',
          autoIncrement: true,
          indexes: [],
          tableVersion: null,
        },
        { name: 'notes', keyPath: null, autoIncrement: false, indexes: [], tableVersion: null },
      ],
    });
  });

  it('answers null for a database that does not exist, and does not create it', async () => {
    const inspector = new IndexedDbInspector({ database: 'missing', factory });

    expect(await inspector.structure()).toBeNull();
    expect(await inspector.statistics()).toBeNull();
    expect(await inspector.exists()).toBe(false);
    expect(await inspector.sample('orders')).toStrictEqual([]);
    expect(await inspector.store('orders')).toBeNull();
    expect(await inspector.compare()).toStrictEqual([]);
    expect(await IndexedDbInspector.databases(factory)).toStrictEqual([]);
  });

  it('counts the records of every store and the entries and distinct keys of every index', async () => {
    const inspector = await shop();

    expect(await inspector.statistics()).toStrictEqual({
      name: 'shop',
      version: 1,
      stores: [
        {
          name: 'orders',
          records: 3,
          firstKey: orderId(1),
          lastKey: orderId(3),
          indexes: [
            {
              name: 'byCustomer',
              entries: 3,
              distinctKeys: 2,
              firstKey: customerId(1),
              lastKey: customerId(2),
            },
            { name: 'byTag', entries: 3, distinctKeys: 2, firstKey: 'express', lastKey: 'gift' },
          ],
        },
        { name: 'payments', records: 0, firstKey: null, lastKey: null, indexes: [] },
      ],
    });
  });

  it('samples the first records of a store', async () => {
    const inspector = await shop();

    expect(await inspector.sample('orders', 2)).toStrictEqual(ORDERS.slice(0, 2));
    expect(await inspector.sample('orders')).toHaveLength(3);
    expect(await inspector.sample('orders', 0)).toStrictEqual([]);
  });

  it('refuses to sample a store that does not exist or with an invalid limit', async () => {
    const inspector = await shop();

    await expect(inspector.sample('refunds')).rejects.toMatchObject({
      reason: 'schema_mismatch',
      message: expect.stringContaining('database "shop" has no store "refunds"'),
    });
    await expect(inspector.sample('orders', -1)).rejects.toMatchObject({ reason: 'invalid_query' });
  });

  it('finds nothing to report when the database matches its declared tables', async () => {
    const inspector = await shop();

    expect(await inspector.compare()).toStrictEqual([]);
  });

  it('reports every declared table whose database was never opened as missing', async () => {
    const invoices = IndexedDbTable.of('invoices', { database: 'billing', factory });

    expect(await new IndexedDbInspector({ database: 'billing', factory }).compare()).toStrictEqual([
      {
        store: 'invoices',
        kind: 'missing_store',
        index: null,
        expected: invoices.definition,
        actual: null,
      },
    ]);
  });

  it('compares what is on disk with the tables declared for its database', async () => {
    const inspector = await shop();
    await changeSchema('shop', (opened, transaction) => {
      const orders = transaction.objectStore('orders');
      orders.deleteIndex('byCustomer');
      orders.createIndex('byCustomer', 'customerId', { multiEntry: true });
      orders.deleteIndex('byTag');
      orders.createIndex('byStatus', 'status');
      opened.createObjectStore('refunds', { keyPath: 'code', autoIncrement: true });
    });
    IndexedDbTable.of('refunds', { database: 'shop', factory });
    const invoices = IndexedDbTable.of('invoices', { database: 'shop', factory });

    expect(await inspector.compare()).toStrictEqual([
      {
        store: 'orders',
        kind: 'index_definition',
        index: 'byCustomer',
        expected: { name: 'byCustomer', keyPath: 'customerId', unique: false, multiEntry: false },
        actual: { name: 'byCustomer', keyPath: 'customerId', unique: false, multiEntry: true },
      },
      {
        store: 'orders',
        kind: 'missing_index',
        index: 'byTag',
        expected: { name: 'byTag', keyPath: 'tags', unique: false, multiEntry: true },
        actual: null,
      },
      {
        store: 'orders',
        kind: 'extra_index',
        index: 'byStatus',
        expected: null,
        actual: { name: 'byStatus', keyPath: 'status', unique: false, multiEntry: false },
      },
      { store: 'refunds', kind: 'key_path', index: null, expected: 'id', actual: 'code' },
      { store: 'refunds', kind: 'auto_increment', index: null, expected: false, actual: true },
      {
        store: 'invoices',
        kind: 'missing_store',
        index: null,
        expected: invoices.definition,
        actual: null,
      },
    ]);
  });

  it('lists the databases of the browser, sorted by name', async () => {
    await shop();
    await changeSchema('legacy-crm', (opened) => {
      opened.createObjectStore('customers', { keyPath: 'code' });
    });
    await changeSchema('legacy-crm', (opened) => {
      opened.createObjectStore('contacts', { keyPath: 'code' });
    });

    expect(await IndexedDbInspector.databases(factory)).toStrictEqual([
      { name: 'legacy-crm', version: 3 },
      { name: 'shop', version: 1 },
    ]);
  });

  it('reports the storage usage, quota and persistence of the page', async () => {
    const storage = await IndexedDbInspector.storage();

    expect(storage.usage).toBeTypeOf('number');
    expect(storage.quota).toBeTypeOf('number');
    expect(storage.persisted).toBeTypeOf('boolean');
    expect(await IndexedDbInspector.persist()).toBeTypeOf('boolean');
  });

  it('reports what the storage manager answers', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: async () => ({ usage: 2048, quota: 1_000_000 }),
        persisted: async () => false,
        persist: async () => true,
      },
    });

    expect(await IndexedDbInspector.storage()).toStrictEqual({
      usage: 2048,
      quota: 1_000_000,
      persisted: false,
    });
    expect(await IndexedDbInspector.persist()).toBe(true);
  });

  it('reports unknown storage figures where the environment has no storage manager', async () => {
    vi.stubGlobal('navigator', { storage: { estimate: async () => ({}) } });
    expect(await IndexedDbInspector.storage()).toStrictEqual({
      usage: null,
      quota: null,
      persisted: null,
    });

    vi.stubGlobal('navigator', undefined);
    expect(await IndexedDbInspector.storage()).toStrictEqual({
      usage: null,
      quota: null,
      persisted: null,
    });
    await expect(IndexedDbInspector.persist()).rejects.toBeInstanceOf(IndexedDbException);
  });
});
