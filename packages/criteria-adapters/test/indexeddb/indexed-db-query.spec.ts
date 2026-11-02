import { describe, expect, it } from 'vitest';
import { Criteria } from '@archi-code/ddd/domain';
import { runCriteriaContract } from '../contract/run-criteria-contract';
import type { ContractDocument } from '../contract/contract-documents';
import { toIndexedDbQuery } from '../../src/indexeddb/indexed-db-query';
import { readIndexes } from '../../src/indexeddb/read-indexes';
import { IndexInfo } from '../../src/indexeddb/plan-query';
import { openDatabase, readStore, StoreSpec } from '../support/open-store';
import { runIndexedDbQuery } from '../support/run-indexed-db-query';
import { Keyed, Row, UserAge, UserName } from '../support/user';
import type { CriteriaAggregate } from '@archi-code/ddd/domain';

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

const INDEXES: IndexInfo[] = [
  { name: null, keyPath: 'id' },
  { name: 'by-age', keyPath: 'age' },
];

function search<A extends CriteriaAggregate>(
  database: IDBDatabase,
  criteria: Criteria<A>,
  withTotal = false,
) {
  const store = readStore(database);
  return runIndexedDbQuery(store, toIndexedDbQuery(criteria, readIndexes(store)), { withTotal });
}

describe('toIndexedDbQuery', () => {
  it.each(Object.entries(CONTRACT_STORES))(
    'gives the native reads that pass the criteria contract %s',
    async (_name, spec) => {
      let database: IDBDatabase | null = null;
      const failures = await runCriteriaContract({
        setup: async (documents) => {
          database = await openDatabase(spec, documents);
        },
        search: (criteria, options) => {
          const store = readStore(database as unknown as IDBDatabase);
          return runIndexedDbQuery<ContractDocument>(
            store,
            toIndexedDbQuery(criteria, readIndexes(store)),
            options,
          );
        },
      });
      expect(failures).toEqual([]);
    },
  );

  it('turns the chosen condition into the index, key range and direction of a cursor', () => {
    const query = toIndexedDbQuery(
      Criteria.create<Row>({
        where: { age: { gte: new UserAge(18) } },
        orderBy: { age: 'desc' },
        limit: 3,
      }),
      INDEXES,
    );
    expect(query.index).toBe('by-age');
    expect(query.range).toMatchObject({ lower: 18, lowerOpen: false, upper: undefined });
    expect(query.direction).toBe('prev');
    expect(query.compare).toBeNull();
    expect([query.offset, query.limit]).toEqual([0, 3]);
  });

  it('builds closed, upper-only and missing key ranges', () => {
    const range = (where: Criteria<Row>) => toIndexedDbQuery(where, INDEXES).range;
    expect(
      range(
        Criteria.create<Row>({ where: { age: { between: [new UserAge(1), new UserAge(9)] } } }),
      ),
    ).toMatchObject({
      lower: 1,
      upper: 9,
    });
    expect(range(Criteria.create<Row>({ where: { age: { lt: new UserAge(9) } } }))).toMatchObject({
      lower: undefined,
      upper: 9,
      upperOpen: true,
    });
    expect(range(Criteria.create<Row>({ where: { name: new UserName('Ana') } }))).toBeNull();
  });

  it('checks a record against the whole filter, also what the key range cannot express', () => {
    const query = toIndexedDbQuery(
      Criteria.create<Row>({
        where: { age: { gt: new UserAge(1) }, name: { contains: 'an', mode: 'insensitive' } },
      }),
      INDEXES,
    );
    expect(query.filter({ id: 1, age: 5, name: 'Ana' })).toBe(true);
    expect(query.filter({ id: 2, age: 5, name: 'Eva' })).toBe(false);
    expect(query.filter({ id: 3, age: 'z', name: 'Ana' })).toBe(false);
  });

  it('gives a criteria comparison when the index does not give the order', () => {
    const query = toIndexedDbQuery(
      Criteria.create<Row>({
        where: { age: { gt: new UserAge(3) } },
        orderBy: { name: 'asc' },
        offset: 2,
      }),
      INDEXES,
    );
    const rows = [
      { id: 1, age: 5, name: 'b' },
      { id: 2, age: 6, name: 'a' },
    ];
    expect(rows.sort(query.compare as (left: object, right: object) => number)).toEqual([
      { id: 2, age: 6, name: 'a' },
      { id: 1, age: 5, name: 'b' },
    ]);
    expect([query.offset, query.limit]).toEqual([2, null]);
  });

  it('reads the page in index order and counts every match on a real store', async () => {
    const rows = Array.from({ length: 50 }, (_, index) => ({
      id: index,
      age: index % 10,
      name: `n${index}`,
    }));
    const database = await openDatabase(
      { keyPath: 'id', indexes: [{ name: 'age', keyPath: 'age' }] },
      rows,
    );
    const criteria = Criteria.create<Row>({
      where: { age: { gte: new UserAge(8) } },
      orderBy: { age: 'desc' },
      limit: 3,
      offset: 1,
    });
    expect((await search(database, criteria)).items.map((row) => row.id)).toEqual([39, 29, 19]);
    expect((await search(database, criteria, true)).total).toBe(10);
  });

  it('sorts text in memory, because IndexedDB orders it by UTF-16 code unit', async () => {
    const database = await openDatabase(
      { keyPath: 'id', indexes: [{ name: 'name', keyPath: 'name' }] },
      [
        { id: 1, name: 'a' },
        { id: 2, name: 'ｱ' },
        { id: 3, name: '\u{1F600}' },
      ],
    );
    const page = (direction: 'asc' | 'desc') =>
      search(
        database,
        Criteria.create<Row>({
          where: { name: { gte: new UserName('a') } },
          orderBy: { name: direction },
          limit: 1,
        }),
      );
    expect((await page('desc')).items).toEqual([{ id: 3, name: '\u{1F600}' }]);
    expect((await page('asc')).items).toEqual([{ id: 1, name: 'a' }]);
  });

  it('sorts in memory without a key range, because a key may mix dates and text', async () => {
    const mixed = await openDatabase({ keyPath: 'k' }, [
      { k: new Date(0) },
      { k: 'b' },
      { k: 'a' },
    ]);
    const first = (direction: 'asc' | 'desc') =>
      search<Keyed>(mixed, Criteria.create<Keyed>({ orderBy: { k: direction }, limit: 1 }));
    expect((await first('asc')).items).toEqual([{ k: 'a' }]);
    expect((await first('desc')).items).toEqual([{ k: new Date(0) }]);
  });
});
