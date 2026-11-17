import { describe, expect, it } from 'vitest';
import { IndexedDbUpgradePlan } from '../../../../src/infrastructure/indexeddb/connection/indexed-db-upgrade-plan';
import { IndexedDbSchema } from '../../../../src/infrastructure/indexeddb/indexed-db-schema';
import type { IndexedDbIndex } from '../../../../src/infrastructure/indexeddb/indexed-db-schema';
import { freshIndexedDb, openDatabase } from '../../../support/indexed-db-environment';

async function storeWith(
  prepare: (store: IDBObjectStore) => void,
  options: IDBObjectStoreParameters = { keyPath: 'id' },
): Promise<IDBObjectStore> {
  const database = await openDatabase(await freshIndexedDb(), 'shop', 1, (upgrading) =>
    prepare(upgrading.createObjectStore('orders', options)),
  );
  database.onversionchange = () => database.close();
  return database.transaction('orders', 'readonly').objectStore('orders');
}

const ordersWith = (indexes: Record<string, IndexedDbIndex>): IndexedDbSchema<{ id: string }> =>
  new IndexedDbSchema({ name: 'orders', indexes });

describe('IndexedDbUpgradePlan: what a store lacks to match its schema', () => {
  it('changes nothing when the store already has the declared indexes', async () => {
    const store = await storeWith((created) => {
      created.createIndex('byCustomer', 'customerId');
      created.createIndex('byCustomerAndTotal', ['customerId', 'total']);
      created.createIndex('byEmail', 'email', { unique: true });
      created.createIndex('byTag', 'tags', { multiEntry: true });
    });
    const schema = ordersWith({
      byCustomer: 'customerId',
      byCustomerAndTotal: ['customerId', 'total'],
      byEmail: { keyPath: 'email', unique: true },
      byTag: { keyPath: 'tags', multiEntry: true },
    });

    expect(IndexedDbUpgradePlan.indexes(store, schema)).toStrictEqual({ remove: [], create: [] });
  });

  it('creates the indexes the store lacks and removes the ones nobody declares', async () => {
    const store = await storeWith((created) => created.createIndex('byColour', 'colour'));

    expect(
      IndexedDbUpgradePlan.indexes(store, ordersWith({ byCustomer: 'customerId' })),
    ).toStrictEqual({
      remove: ['byColour'],
      create: [['byCustomer', { keyPath: 'customerId', unique: false, multiEntry: false }]],
    });
  });

  it.each<[string, string | string[], IDBIndexParameters, IndexedDbIndex]>([
    ['another field', 'customer', {}, 'customerId'],
    ['one field instead of several', 'customerId', {}, ['customerId', 'total']],
    ['several fields instead of one', ['customerId', 'total'], {}, 'customerId'],
    ['fewer fields', ['customerId'], {}, ['customerId', 'total']],
    ['other fields', ['customerId', 'status'], {}, ['customerId', 'total']],
    ['no uniqueness', 'customerId', {}, { keyPath: 'customerId', unique: true }],
    ['one entry per row', 'customerId', {}, { keyPath: 'customerId', multiEntry: true }],
  ])('recreates an index stored with %s', async (_case, keyPath, options, declared) => {
    const store = await storeWith((created) => created.createIndex('byCustomer', keyPath, options));

    const { remove, create } = IndexedDbUpgradePlan.indexes(
      store,
      ordersWith({ byCustomer: declared }),
    );

    expect(remove).toStrictEqual(['byCustomer']);
    expect(create.map(([name]) => name)).toStrictEqual(['byCustomer']);
  });

  it.each([
    ['another key', { keyPath: 'code' }],
    ['a generated key', { keyPath: 'id', autoIncrement: true }],
  ])('refuses a store kept with %s', async (_case, options) => {
    const store = await storeWith(() => undefined, options);

    expect(() => IndexedDbUpgradePlan.indexes(store, ordersWith({}))).toThrow(
      'IndexedDB schema_mismatch: store "orders" exists with another key: a table keeps its id in "id" without autoIncrement',
    );
  });

  it('runs the migrations after the recorded version, and none on a database without data', () => {
    const steps = [2, 3, 4].map((version) => ({ version, table: 'orders', migrate: () => null }));

    expect(IndexedDbUpgradePlan.migrations(steps, 2)).toStrictEqual([steps[1], steps[2]]);
    expect(IndexedDbUpgradePlan.migrations(steps, 4)).toStrictEqual([]);
    expect(IndexedDbUpgradePlan.migrations(steps, 0)).toStrictEqual([]);
  });
});
