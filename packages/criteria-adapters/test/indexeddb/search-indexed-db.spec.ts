import { describe, expect, it } from 'vitest';
import { Criteria } from '@archi-code/criteria';
import { runCriteriaContract } from '../contract/run-criteria-contract';
import type { ContractDocument } from '../contract/contract-documents';
import { readIndexes, searchIndexedDb } from '../../src/indexeddb/search-indexed-db';
import { openDatabase, readStore, StoreSpec } from '../support/open-store';

const CONTRACT_STORES: Record<string, StoreSpec> = {
  'without indexes': { keyPath: 'id' },
  'without a key path': { keyPath: null },
  'with indexes': {
    keyPath: 'id',
    indexes: [
      { name: 'age', keyPath: 'age' },
      { name: 'status', keyPath: 'status' },
      { name: 'name', keyPath: 'name' },
      { name: 'createdAt', keyPath: 'createdAt' },
      { name: 'city', keyPath: 'address.city' },
      { name: 'zip', keyPath: 'address.zip' },
      { name: 'title', keyPath: 'title' },
      { name: 'tags', keyPath: 'tags', multiEntry: true },
    ],
  },
};

interface Row {
  id: number;
  age: number;
}

describe('searchIndexedDb', () => {
  it.each(Object.entries(CONTRACT_STORES))(
    'passes the criteria contract %s',
    async (_name, spec) => {
      let database: IDBDatabase | null = null;
      const failures = await runCriteriaContract({
        setup: async (documents) => {
          database = await openDatabase(spec, documents);
        },
        search: (criteria, options) =>
          searchIndexedDb<ContractDocument>(
            readStore(database as unknown as IDBDatabase),
            criteria,
            options,
          ),
      });
      expect(failures).toEqual([]);
    },
  );

  it('stops reading once the page is full and counts every match when asked', async () => {
    const rows: Row[] = Array.from({ length: 50 }, (_, index) => ({ id: index, age: index % 10 }));
    const database = await openDatabase(
      { keyPath: 'id', indexes: [{ name: 'age', keyPath: 'age' }] },
      rows,
    );
    const criteria = Criteria.create<Row>({
      where: { age: { gte: 8 } },
      orderBy: { age: 'desc' },
      limit: 3,
      offset: 1,
    });
    expect(await searchIndexedDb(readStore(database), criteria)).toEqual({
      items: [
        { id: 39, age: 9 },
        { id: 29, age: 9 },
        { id: 19, age: 9 },
      ],
    });
    expect((await searchIndexedDb(readStore(database), criteria, { withTotal: true })).total).toBe(
      10,
    );
  });

  it('sorts in memory once a sorted page meets text IndexedDB orders differently', async () => {
    const database = await openDatabase(
      { keyPath: 'id', indexes: [{ name: 'name', keyPath: 'name' }] },
      [
        { id: 1, name: 'a' },
        { id: 2, name: '\uFF71' },
        { id: 3, name: '\u{1F600}' },
      ],
    );
    const page = (direction: 'asc' | 'desc') =>
      searchIndexedDb(
        readStore(database),
        Criteria.create<{ id: number; name: string }>({
          where: { name: { gte: 'a' } },
          orderBy: { name: direction },
          limit: 1,
        }),
      );
    expect((await page('desc')).items).toEqual([{ id: 3, name: '\u{1F600}' }]);
    expect((await page('asc')).items).toEqual([{ id: 1, name: 'a' }]);
  });

  it('sorts in memory when the walked key mixes dates and text, which IndexedDB orders apart', async () => {
    const mixed = await openDatabase({ keyPath: 'k' }, [
      { k: new Date(0) },
      { k: 'b' },
      { k: 'a' },
    ]);
    const plain = await openDatabase({ keyPath: 'k' }, [{ k: 'b' }, { k: 'a' }, { k: 'c' }]);
    const first = (database: IDBDatabase, direction: 'asc' | 'desc') =>
      searchIndexedDb<{ k: unknown }>(
        readStore(database),
        Criteria.create<{ k: string }>({ orderBy: { k: direction }, limit: 1 }),
      );
    expect((await first(mixed, 'asc')).items).toEqual([{ k: 'a' }]);
    expect((await first(mixed, 'desc')).items).toEqual([{ k: new Date(0) }]);
    expect((await first(plain, 'desc')).items).toEqual([{ k: 'c' }]);
  });

  it('checks every record the index returns against the whole filter', async () => {
    const database = await openDatabase(
      { keyPath: 'id', indexes: [{ name: 'age', keyPath: 'age' }] },
      [
        { id: 1, age: 5 },
        { id: 2, age: 'z' },
      ],
    );
    const result = await searchIndexedDb(
      readStore(database),
      Criteria.create<Row>({ where: { age: { gt: 1 } } }),
    );
    expect(result).toEqual({ items: [{ id: 1, age: 5 }] });
  });

  it('ignores compound and multi-entry indexes and key paths that are not a string', async () => {
    const database = await openDatabase(
      {
        keyPath: null,
        indexes: [
          { name: 'pair', keyPath: ['age', 'id'] },
          { name: 'tags', keyPath: 'tags', multiEntry: true },
          { name: 'age', keyPath: 'age' },
        ],
      },
      [],
    );
    expect(readIndexes(readStore(database))).toEqual([{ name: 'age', keyPath: 'age' }]);
  });

  it('rejects when the cursor fails', async () => {
    const failing = {
      keyPath: 'id',
      indexNames: [],
      openCursor: () => {
        const request: { error: Error; onerror?: () => void; onsuccess?: () => void } = {
          error: new Error('broken'),
        };
        setTimeout(() => request.onerror?.(), 0);
        return request;
      },
    } as unknown as IDBObjectStore;
    await expect(searchIndexedDb(failing, Criteria.create())).rejects.toThrow('broken');
  });

  it('rejects when counting the key types fails', async () => {
    const failing = {
      keyPath: 'id',
      indexNames: [],
      count: () => {
        const request: { error: Error; onerror?: () => void; onsuccess?: () => void } = {
          error: new Error('count broken'),
        };
        setTimeout(() => request.onerror?.(), 0);
        return request;
      },
    } as unknown as IDBObjectStore;
    await expect(
      searchIndexedDb(failing, Criteria.create<{ id: string }>({ orderBy: { id: 'asc' } })),
    ).rejects.toThrow('count broken');
  });
});
