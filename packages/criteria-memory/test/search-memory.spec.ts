import { describe, expect, it } from '@jest/globals';
import { Criteria, runCriteriaContract } from '@archi-code/criteria';
import type { ContractDocument } from '@archi-code/criteria';
import { searchMemory } from '../src/search-memory';

interface Item {
  id: string;
  age: number;
}

const items: Item[] = [
  { id: 'a', age: 30 },
  { id: 'b', age: 15 },
  { id: 'c', age: 40 },
  { id: 'd', age: 22 },
];

describe('searchMemory', () => {
  it('passes the criteria contract', async () => {
    let documents: ContractDocument[] = [];
    const failures = await runCriteriaContract({
      setup: (seed) => {
        documents = seed;
      },
      search: (criteria, options) => searchMemory(documents, criteria, options),
    });
    expect(failures).toEqual([]);
  });

  it('returns every item in its original order without criteria', () => {
    expect(searchMemory(items, Criteria.create<Item>())).toEqual({ items });
  });

  it('filters, sorts, paginates and counts', () => {
    const criteria = Criteria.create<Item>({
      where: { age: { gte: 18 } },
      orderBy: { age: 'asc' },
      limit: 2,
      offset: 1,
    });
    expect(searchMemory(items, criteria, { withTotal: true })).toEqual({
      items: [
        { id: 'a', age: 30 },
        { id: 'c', age: 40 },
      ],
      total: 3,
    });
  });

  it('does not change the input list', () => {
    const input = [...items];
    searchMemory(input, Criteria.create<Item>({ orderBy: { age: 'desc' } }));
    expect(input).toEqual(items);
  });

  it('returns the same item objects', () => {
    expect(searchMemory(items, Criteria.create<Item>({ where: { id: 'b' } })).items[0]).toBe(
      items[1],
    );
  });
});
