import { describe, expect, it } from '@jest/globals';
import { Criteria, runCriteriaContract } from '@archi-code/criteria';
import type { ContractDocument } from '@archi-code/criteria';
import { readIndexes, searchIndexedDb } from '../src/search-indexed-db';
import { openDatabase, readStore, StoreSpec } from './support/open-store';

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
});
