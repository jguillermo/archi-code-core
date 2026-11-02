import { describe, expect, it } from 'vitest';
import { Criteria } from '@archi-code/ddd/domain';
import type { CriteriaInput } from '@archi-code/ddd/domain';
import { IndexInfo, planIndexedDbQuery } from '../../src/indexeddb/plan-query';

import {
  User,
  UserActive,
  UserAge,
  UserCreatedAt,
  UserId,
  UserName,
  UserTag,
} from '../support/user';

const INDEXES: IndexInfo[] = [
  { name: null, keyPath: 'id' },
  { name: 'by-age', keyPath: 'age' },
  { name: 'by-name', keyPath: 'name' },
  { name: 'by-created', keyPath: 'createdAt' },
  { name: 'by-active', keyPath: 'active' },
  { name: 'by-age-again', keyPath: 'age' },
];

function plan(input: CriteriaInput<User>, indexes: IndexInfo[] = INDEXES) {
  return planIndexedDbQuery(Criteria.create<User>(input), indexes);
}

const SCAN = { index: null, bounds: null, direction: 'next', presorted: true };

describe('planIndexedDbQuery', () => {
  it('scans the store when nothing helps', () => {
    expect(plan({})).toEqual(SCAN);
    expect(plan({ where: { age: { ne: new UserAge(3) } } })).toEqual(SCAN);
    expect(plan({ where: { OR: [{ age: new UserAge(1) }, { age: new UserAge(2) }] } })).toEqual(
      SCAN,
    );
    expect(plan({ where: { active: new UserActive(true) } })).toEqual(SCAN);
    expect(plan({ where: { tags: { has: new UserTag('x') } } })).toEqual(SCAN);
    expect(plan({ orderBy: { age: 'asc' } })).toEqual({ ...SCAN, presorted: false });
  });

  it('uses an index for equality, preferring it over ranges', () => {
    expect(plan({ where: { age: { gt: new UserAge(3) }, name: new UserName('Ana') } })).toEqual({
      index: 'by-name',
      bounds: { lower: 'Ana', upper: 'Ana', lowerOpen: false, upperOpen: false },
      direction: 'next',
      presorted: true,
    });
  });

  it('uses the primary key as the store itself', () => {
    expect(plan({ where: { id: new UserId('x') } })).toEqual({
      index: null,
      bounds: { lower: 'x', upper: 'x', lowerOpen: false, upperOpen: false },
      direction: 'next',
      presorted: true,
    });
  });

  it('builds open and closed bounds', () => {
    const date = new Date(0);
    expect(plan({ where: { age: { gt: new UserAge(3) } } }).bounds).toEqual({
      lower: 3,
      lowerOpen: true,
      upperOpen: false,
    });
    expect(plan({ where: { age: { gte: new UserAge(3) } } }).bounds).toEqual({
      lower: 3,
      lowerOpen: false,
      upperOpen: false,
    });
    expect(plan({ where: { createdAt: { lt: new UserCreatedAt(date) } } }).bounds).toEqual({
      upper: date,
      lowerOpen: false,
      upperOpen: true,
    });
    expect(plan({ where: { age: { lte: new UserAge(3) } } }).bounds).toEqual({
      upper: 3,
      lowerOpen: false,
      upperOpen: false,
    });
    expect(plan({ where: { age: { between: [new UserAge(1), new UserAge(9)] } } }).bounds).toEqual({
      lower: 1,
      upper: 9,
      lowerOpen: false,
      upperOpen: false,
    });
  });

  it('scans on an empty prefix, which only a criteria built outside Criteria can hold', () => {
    const emptyPrefix = {
      filter: {
        kind: 'text',
        field: 'name',
        operator: 'startsWith',
        value: '',
        caseSensitive: true,
      },
      order: [],
      pagination: null,
    } as unknown as Criteria;
    expect(planIndexedDbQuery(emptyPrefix, INDEXES)).toEqual(SCAN);
  });

  it('skips text ranges whose bounds IndexedDB orders differently than code points', () => {
    expect(plan({ where: { name: { gt: new UserName('\uFF00') } } })).toEqual(SCAN);
    expect(plan({ where: { name: { lte: new UserName('\u{1F600}') } } })).toEqual(SCAN);
    expect(
      plan({ where: { name: { between: [new UserName('a'), new UserName('\uE000')] } } }),
    ).toEqual(SCAN);
    expect(
      plan({ where: { name: { between: [new UserName('\uE000'), new UserName('\u{1F600}')] } } }),
    ).toEqual(SCAN);
    expect(plan({ where: { name: { gt: new UserName('\uD7FE') } } }).index).toBe('by-name');
    expect(plan({ where: { name: new UserName('\u{1F600}') } }).index).toBe('by-name');
  });

  it('turns a case-sensitive prefix into a range', () => {
    expect(plan({ where: { name: { startsWith: 'An' } } })).toEqual({
      index: 'by-name',
      bounds: { lower: 'An', upper: 'Ao', lowerOpen: false, upperOpen: true },
      direction: 'next',
      presorted: true,
    });
    expect(plan({ where: { name: { startsWith: 'an', mode: 'insensitive' } } })).toEqual(SCAN);
    expect(plan({ where: { name: { startsWith: 'a￿' } } })).toEqual(SCAN);
    expect(plan({ where: { name: { contains: 'a' } } })).toEqual(SCAN);
  });

  it('reads conditions nested in AND', () => {
    expect(
      plan({
        where: {
          AND: [{ name: { contains: 'a' } }, { age: { gt: new UserAge(1), lt: new UserAge(9) } }],
        },
      }).index,
    ).toBe('by-age');
  });

  it('follows the index order when the only sort field is the indexed one', () => {
    expect(plan({ where: { age: { gt: new UserAge(3) } }, orderBy: { age: 'desc' } })).toEqual({
      index: 'by-age',
      bounds: { lower: 3, lowerOpen: true, upperOpen: false },
      direction: 'prev',
      presorted: true,
    });
    expect(
      plan({
        where: { age: { gt: new UserAge(3) }, name: { gt: new UserName('a') } },
        orderBy: { name: 'asc' },
      }).index,
    ).toBe('by-name');
  });

  it('sorts in memory when the index does not give the order', () => {
    expect(plan({ where: { age: { gt: new UserAge(3) } }, orderBy: { name: 'asc' } })).toEqual({
      index: 'by-age',
      bounds: { lower: 3, lowerOpen: true, upperOpen: false },
      direction: 'next',
      presorted: false,
    });
    expect(
      plan({ where: { age: new UserAge(3) }, orderBy: [{ age: 'asc' }, { id: 'asc' }] }).presorted,
    ).toBe(false);
  });

  it('sorts in memory without a key range, because the walked key may mix dates and text', () => {
    expect(plan({ orderBy: { id: 'desc' } })).toEqual({ ...SCAN, presorted: false });
  });

  it('follows the index order of a range with only an upper bound', () => {
    expect(plan({ where: { age: { lt: new UserAge(9) } }, orderBy: { age: 'asc' } })).toEqual({
      index: 'by-age',
      bounds: { upper: 9, lowerOpen: false, upperOpen: true },
      direction: 'next',
      presorted: true,
    });
    expect(
      plan({ where: { name: { lt: new UserName('m') } }, orderBy: { name: 'asc' } }).presorted,
    ).toBe(false);
  });

  it('sorts text in memory, because IndexedDB orders it by UTF-16 code unit', () => {
    expect(plan({ where: { name: { gt: new UserName('a') } }, orderBy: { name: 'asc' } })).toEqual({
      index: 'by-name',
      bounds: { lower: 'a', lowerOpen: true, upperOpen: false },
      direction: 'next',
      presorted: false,
    });
    expect(plan({ where: { name: new UserName('Ana') }, orderBy: { name: 'desc' } })).toMatchObject(
      {
        index: 'by-name',
        direction: 'prev',
        presorted: true,
      },
    );
  });

  it('does not walk a secondary index without a range, because it skips null values', () => {
    expect(plan({ orderBy: { name: 'asc' } }).presorted).toBe(false);
  });

  it('ignores fields without an index', () => {
    expect(plan({ where: { age: new UserAge(3) } }, [{ name: null, keyPath: 'id' }])).toEqual(SCAN);
    expect(plan({ orderBy: { age: 'asc' } }, [{ name: null, keyPath: 'id' }]).presorted).toBe(
      false,
    );
  });
});
