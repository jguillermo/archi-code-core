import { describe, expect, it } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { Criteria } from '../src/criteria';
import { CriteriaError } from '../src/criteria-error';
import { FilterNode } from '../src/filter-node';
import { Path, SortablePath } from '../src/path';
import { UserPrimitives } from './support/user';

function errorOf(action: () => unknown): CriteriaError {
  try {
    action();
  } catch (error) {
    return error as CriteriaError;
  }
  throw new Error('Expected a CriteriaError');
}

describe('Criteria types', () => {
  it('offers every leaf path, nested ones with dots, and skips functions', () => {
    expectTypeOf<Path<UserPrimitives>>().toEqualTypeOf<
      | 'id'
      | 'name'
      | 'age'
      | 'active'
      | 'status'
      | 'createdAt'
      | 'tags'
      | 'scores'
      | 'address.city'
      | 'address.zip'
      | 'address.geo.lat'
      | 'address.geo.lng'
    >();
  });

  it('only sorts by scalar paths', () => {
    expectTypeOf<SortablePath<UserPrimitives>>().toEqualTypeOf<
      | 'id'
      | 'name'
      | 'age'
      | 'active'
      | 'status'
      | 'createdAt'
      | 'address.city'
      | 'address.zip'
      | 'address.geo.lat'
      | 'address.geo.lng'
    >();
  });

  it('accepts only the operators of each field type', () => {
    Criteria.create<UserPrimitives>({
      where: {
        status: { in: ['active', 'pending'] },
        age: { gte: 18, lt: 65 },
        name: { contains: 'an', mode: 'insensitive' },
        createdAt: { between: [new Date(0), new Date(1)] },
        tags: { has: 'vip' },
        'address.city': 'Huelva',
        active: true,
        OR: [{ age: null }, { NOT: { tags: { isEmpty: true } } }],
      },
      orderBy: [{ createdAt: 'desc' }, { 'address.city': 'asc' }],
      limit: 10,
    });
    const rejectedAtCompileTime = () => [
      Criteria.create<UserPrimitives>({
        // @ts-expect-error contains does not apply to numbers
        where: { age: { contains: '1' } },
      }),
      Criteria.create<UserPrimitives>({
        // @ts-expect-error gt does not apply to booleans
        where: { active: { gt: true } },
      }),
      Criteria.create<UserPrimitives>({
        // @ts-expect-error unknown status value
        where: { status: 'deleted' },
      }),
      Criteria.create<UserPrimitives>({
        // @ts-expect-error unknown field
        where: { password: 'x' },
      }),
      Criteria.create<UserPrimitives>({
        // @ts-expect-error lists cannot be sorted
        orderBy: { tags: 'asc' },
      }),
    ];
    expect(typeof rejectedAtCompileTime).toBe('function');
  });

  it('keeps the entity type apart', () => {
    expectTypeOf<Criteria<UserPrimitives>>().not.toEqualTypeOf<Criteria<{ id: string }>>();
  });
});

describe('Criteria.create', () => {
  it('builds an empty criteria', () => {
    const criteria = Criteria.create();
    expect(criteria.filter).toBeNull();
    expect(criteria.order).toEqual([]);
    expect(criteria.pagination).toBeNull();
  });

  it('turns where into filter nodes', () => {
    const criteria = Criteria.create<UserPrimitives>({
      where: {
        status: 'active',
        age: { gte: 18, lt: 65 },
        name: { contains: 'an', mode: 'insensitive', startsWith: 'A' },
        'address.city': null,
        tags: { has: 'vip', hasSome: ['a', 'b'], hasEvery: ['c'], isEmpty: false },
        scores: { isNull: false },
        createdAt: { between: [new Date(0), new Date(10)], in: [new Date(0)], nin: [new Date(1)] },
        active: { eq: null, ne: null },
      },
    });
    expect(criteria.filter).toEqual({
      kind: 'and',
      filters: [
        { kind: 'compare', field: 'status', operator: 'eq', value: 'active' },
        {
          kind: 'and',
          filters: [
            { kind: 'compare', field: 'age', operator: 'gte', value: 18 },
            { kind: 'compare', field: 'age', operator: 'lt', value: 65 },
          ],
        },
        {
          kind: 'and',
          filters: [
            {
              kind: 'text',
              field: 'name',
              operator: 'contains',
              value: 'an',
              caseSensitive: false,
            },
            {
              kind: 'text',
              field: 'name',
              operator: 'startsWith',
              value: 'A',
              caseSensitive: false,
            },
          ],
        },
        { kind: 'isNull', field: 'address.city', value: true },
        {
          kind: 'and',
          filters: [
            { kind: 'arrayContains', field: 'tags', match: 'some', values: ['vip'] },
            { kind: 'arrayContains', field: 'tags', match: 'some', values: ['a', 'b'] },
            { kind: 'arrayContains', field: 'tags', match: 'every', values: ['c'] },
            { kind: 'arrayEmpty', field: 'tags', value: false },
          ],
        },
        { kind: 'isNull', field: 'scores', value: false },
        {
          kind: 'and',
          filters: [
            { kind: 'between', field: 'createdAt', min: new Date(0), max: new Date(10) },
            { kind: 'in', field: 'createdAt', values: [new Date(0)] },
            { kind: 'notIn', field: 'createdAt', values: [new Date(1)] },
          ],
        },
        {
          kind: 'and',
          filters: [
            { kind: 'isNull', field: 'active', value: true },
            { kind: 'isNull', field: 'active', value: false },
          ],
        },
      ],
    });
  });

  it('treats text as case sensitive unless mode is insensitive', () => {
    const criteria = Criteria.create<UserPrimitives>({
      where: { name: { endsWith: 'o', mode: 'sensitive' }, id: { contains: '1' } },
    });
    expect(criteria.filter).toEqual({
      kind: 'and',
      filters: [
        { kind: 'text', field: 'name', operator: 'endsWith', value: 'o', caseSensitive: true },
        { kind: 'text', field: 'id', operator: 'contains', value: '1', caseSensitive: true },
      ],
    });
  });

  it('ignores undefined values so filters can be built from optional input', () => {
    const minAge: number | undefined = undefined;
    const criteria = Criteria.create<UserPrimitives>({
      where: { age: { gte: minAge }, status: undefined, AND: [{}, { id: '1' }] },
    });
    expect(criteria.filter).toEqual({ kind: 'compare', field: 'id', operator: 'eq', value: '1' });
  });

  it('drops a where that has no conditions', () => {
    expect(Criteria.create<UserPrimitives>({ where: {} }).filter).toBeNull();
    expect(Criteria.create<UserPrimitives>({ where: { AND: [{}] } }).filter).toBeNull();
  });

  it('builds AND, OR and NOT', () => {
    const criteria = Criteria.create<UserPrimitives>({
      where: {
        AND: [{ id: '1' }, { id: '2' }],
        OR: [{ id: '3' }, { id: '4' }],
        NOT: { id: '5' },
      },
    });
    const id = (value: string): FilterNode => ({
      kind: 'compare',
      field: 'id',
      operator: 'eq',
      value,
    });
    expect(criteria.filter).toEqual({
      kind: 'and',
      filters: [
        { kind: 'and', filters: [id('1'), id('2')] },
        { kind: 'or', filters: [id('3'), id('4')] },
        { kind: 'not', filter: id('5') },
      ],
    });
  });

  it('unwraps an OR with one condition', () => {
    expect(Criteria.create<UserPrimitives>({ where: { OR: [{ id: '1' }] } }).filter).toEqual({
      kind: 'compare',
      field: 'id',
      operator: 'eq',
      value: '1',
    });
  });

  it('turns an OR with an empty branch into no filter, because that branch matches everything', () => {
    expect(Criteria.create<UserPrimitives>({ where: { OR: [{ id: '1' }, {}] } }).filter).toBeNull();
  });

  it('builds the order from one object or a list', () => {
    expect(
      Criteria.create<UserPrimitives>({ orderBy: { name: 'asc', age: 'desc' } }).order,
    ).toEqual([
      { field: 'name', direction: 'asc' },
      { field: 'age', direction: 'desc' },
    ]);
    expect(
      Criteria.create<UserPrimitives>({ orderBy: [{ name: undefined }, { age: 'desc' }] }).order,
    ).toEqual([{ field: 'age', direction: 'desc' }]);
  });

  it('builds the pagination', () => {
    expect(Criteria.create({ limit: 10 }).pagination).toEqual({
      kind: 'offset',
      limit: 10,
      offset: 0,
    });
    expect(Criteria.create({ offset: 5 }).pagination).toEqual({
      kind: 'offset',
      limit: null,
      offset: 5,
    });
    expect(Criteria.create({ offset: 0 }).pagination).toBeNull();
  });

  it.each([
    [() => Criteria.create(null as never), 'INVALID_FORMAT'],
    [() => Criteria.create({ page: 1 } as never), 'INVALID_FORMAT'],
    [() => Criteria.create({ where: [] as never }), 'INVALID_FORMAT'],
    [
      () => Criteria.create<UserPrimitives>({ where: { age: { like: 1 } as never } }),
      'INVALID_OPERATOR',
    ],
    [
      () => Criteria.create<UserPrimitives>({ where: { name: { mode: 'insensitive' } } }),
      'INVALID_OPERATOR',
    ],
    [
      () =>
        Criteria.create<UserPrimitives>({
          where: { name: { contains: 'a', mode: 'other' as never } },
        }),
      'INVALID_VALUE',
    ],
    [
      () => Criteria.create<UserPrimitives>({ where: { age: { between: [1] as never } } }),
      'INVALID_VALUE',
    ],
    [
      () => Criteria.create<UserPrimitives>({ where: { age: { in: 1 as never } } }),
      'INVALID_VALUE',
    ],
    [() => Criteria.create<UserPrimitives>({ where: { age: { in: [] } } }), 'EMPTY_LIST'],
    [() => Criteria.create<UserPrimitives>({ where: { tags: { hasSome: [] } } }), 'EMPTY_LIST'],
    [() => Criteria.create<UserPrimitives>({ where: { AND: {} as never } }), 'INVALID_FORMAT'],
    [() => Criteria.create<UserPrimitives>({ where: { OR: [] } }), 'EMPTY_LIST'],
    [() => Criteria.create<UserPrimitives>({ where: { NOT: {} } }), 'INVALID_VALUE'],
    [
      () => Criteria.create<UserPrimitives>({ where: { age: { gt: Number.NaN } } }),
      'INVALID_VALUE',
    ],
    [() => Criteria.create<UserPrimitives>({ where: { age: [1] as never } }), 'INVALID_VALUE'],
    [
      () => Criteria.create<UserPrimitives>({ where: { active: { gt: true } as never } }),
      'INVALID_VALUE',
    ],
    [
      () => Criteria.create<UserPrimitives>({ where: { createdAt: new Date('invalid') } }),
      'INVALID_VALUE',
    ],
    [
      () => Criteria.create<UserPrimitives>({ where: { age: { between: [5, 1] } } }),
      'INVALID_RANGE',
    ],
    [
      () => Criteria.create<UserPrimitives>({ where: { age: { between: [1, 'z'] as never } } }),
      'INVALID_RANGE',
    ],
    [() => Criteria.create({ where: { $where: 'x' } as never }), 'INVALID_FIELD'],
    [() => Criteria.create({ where: { 'a..b': 'x' } as never }), 'INVALID_FIELD'],
    [() => Criteria.create({ where: { '__proto__.x': 'x' } as never }), 'INVALID_FIELD'],
    [() => Criteria.create({ where: { 'a\u0000b': 'x' } as never }), 'INVALID_FIELD'],
    [() => Criteria.create({ where: { 'a.\nb': 'x' } as never }), 'INVALID_FIELD'],
    [() => Criteria.create({ where: { 'a\u007f': 'x' } as never }), 'INVALID_FIELD'],
    [() => Criteria.create({ orderBy: 'name' as never }), 'INVALID_ORDER'],
    [() => Criteria.create({ orderBy: { name: 'up' } as never }), 'INVALID_ORDER'],
    [
      () => Criteria.create<UserPrimitives>({ orderBy: [{ name: 'asc' }, { name: 'desc' }] }),
      'INVALID_ORDER',
    ],
    [() => Criteria.create({ limit: 0 }), 'INVALID_PAGINATION'],
    [() => Criteria.create({ limit: 1.5 }), 'INVALID_PAGINATION'],
    [() => Criteria.create({ offset: -1 }), 'INVALID_PAGINATION'],
    [() => Criteria.create({ offset: 1e300 }), 'INVALID_PAGINATION'],
    [() => Criteria.create({ limit: Number.MAX_SAFE_INTEGER + 1 }), 'INVALID_PAGINATION'],
    [() => Criteria.create().page(1e300, 10), 'INVALID_PAGINATION'],
    [() => Criteria.create().page(2 ** 40, 2 ** 20), 'INVALID_PAGINATION'],
    [() => Criteria.create().page(1, Number.MAX_SAFE_INTEGER + 1), 'INVALID_PAGINATION'],
  ])('rejects invalid input (%#)', (action, code) => {
    const error = errorOf(action);
    expect(error).toBeInstanceOf(CriteriaError);
    expect(error.code).toBe(code);
  });

  it('names the error and explains it', () => {
    const error = errorOf(() => Criteria.create<UserPrimitives>({ where: { age: { in: [] } } }));
    expect(error.name).toBe('CriteriaError');
    expect(error.message).toBe('"in" on "age" needs at least one value');
  });
});

describe('Criteria immutability', () => {
  it('freezes the criteria and its nodes', () => {
    const criteria = Criteria.create<UserPrimitives>({
      where: { age: { in: [1, 2] } },
      orderBy: { name: 'asc' },
      limit: 5,
    });
    expect(Object.isFrozen(criteria)).toBe(true);
    expect(Object.isFrozen(criteria.filter)).toBe(true);
    expect(Object.isFrozen((criteria.filter as unknown as { values: unknown[] }).values)).toBe(
      true,
    );
    expect(Object.isFrozen(criteria.order)).toBe(true);
    expect(Object.isFrozen(criteria.order[0])).toBe(true);
    expect(Object.isFrozen(criteria.pagination)).toBe(true);
  });

  it('refuses to change the dates it holds', () => {
    const criteria = Criteria.create<UserPrimitives>({
      where: { createdAt: { between: [new Date(0), new Date(10)] } },
    });
    const node = criteria.filter as { min: Date; max: Date };
    expect(node.min).toBeInstanceOf(Date);
    expect(Object.isFrozen(node.min)).toBe(true);
    expect(() => node.min.setTime(99)).toThrow(TypeError);
    expect(() => node.max.setUTCFullYear(2000)).toThrow('A criteria date cannot be changed');
    expect(() => (node.min as unknown as { setYear(year: number): number }).setYear(99)).toThrow(
      TypeError,
    );
    expect([node.min.getTime(), node.max.getTime()]).toEqual([0, 10]);
    expect(Criteria.fromUrl<UserPrimitives>(criteria.toUrl()).equals(criteria)).toBe(true);
  });

  it('copies input lists and dates', () => {
    const values = [1, 2];
    const date = new Date(0);
    const criteria = Criteria.create<UserPrimitives>({
      where: { age: { in: values }, createdAt: date },
    });
    values.push(3);
    date.setTime(99);
    expect(criteria.toJSON().f).toEqual([
      'and',
      [
        ['in', 'age', [1, 2]],
        ['eq', 'createdAt', { d: 0 }],
      ],
    ]);
  });
});

describe('Criteria methods', () => {
  const base = Criteria.create<UserPrimitives>({ where: { status: 'active' } });

  it('and adds conditions without changing the original', () => {
    const narrowed = base.and({ age: { gte: 18 } }).and({ AND: [{ id: '1' }, { id: '2' }] });
    expect(base.filter).toEqual({
      kind: 'compare',
      field: 'status',
      operator: 'eq',
      value: 'active',
    });
    expect(narrowed.filter).toEqual({
      kind: 'and',
      filters: [
        { kind: 'compare', field: 'status', operator: 'eq', value: 'active' },
        { kind: 'compare', field: 'age', operator: 'gte', value: 18 },
        { kind: 'compare', field: 'id', operator: 'eq', value: '1' },
        { kind: 'compare', field: 'id', operator: 'eq', value: '2' },
      ],
    });
  });

  it('and on an empty criteria uses the new filter, and an empty where changes nothing', () => {
    const empty = Criteria.create<UserPrimitives>();
    expect(empty.and({ id: '1' }).filter).toEqual({
      kind: 'compare',
      field: 'id',
      operator: 'eq',
      value: '1',
    });
    expect(base.and({})).toBe(base);
  });

  it('orderBy and paginate replace their part', () => {
    const criteria = base
      .orderBy({ name: 'asc' })
      .orderBy([{ age: 'desc' }])
      .paginate({ limit: 10, offset: 20 });
    expect(criteria.filter).toEqual(base.filter);
    expect(criteria.order).toEqual([{ field: 'age', direction: 'desc' }]);
    expect(criteria.pagination).toEqual({ kind: 'offset', limit: 10, offset: 20 });
    expect(criteria.paginate({}).pagination).toBeNull();
  });

  it('page turns a page number into limit and offset', () => {
    expect(base.page(3, 25).pagination).toEqual({ kind: 'offset', limit: 25, offset: 50 });
    expect(errorOf(() => base.page(0, 10)).code).toBe('INVALID_PAGINATION');
    expect(errorOf(() => base.page(1, 1.5)).code).toBe('INVALID_PAGINATION');
  });

  it('equals compares the content', () => {
    const one = Criteria.create<UserPrimitives>({ where: { createdAt: new Date(5) }, limit: 2 });
    const same = Criteria.create<UserPrimitives>({ where: { createdAt: new Date(5) }, limit: 2 });
    expect(one.equals(same)).toBe(true);
    expect(one.equals(same.paginate({ limit: 3 }))).toBe(false);
  });

  it('equals ignores the order of AND/OR conditions and of list values', () => {
    const one = Criteria.create<UserPrimitives>({
      where: {
        status: 'active',
        age: { in: [1, 2, 2] },
        OR: [{ name: 'a' }, { tags: { hasSome: ['x', 'y'] } }],
        AND: [{ active: true }, { id: { nin: ['b', 'a'] } }],
      },
    });
    const same = Criteria.create<UserPrimitives>({
      where: {
        AND: [{ id: { nin: ['a', 'b'] } }],
        OR: [{ tags: { hasSome: ['y', 'x'] } }, { name: 'a' }],
        active: true,
        age: { in: [2, 1] },
        status: 'active',
      },
    });
    expect(one.equals(same)).toBe(true);
    expect(one.toUrl()).not.toBe(same.toUrl());
    expect(one.equals(same.and({ name: 'b' }))).toBe(false);
  });

  it('equals keeps the meaning of NOT, of AND against OR and of the order', () => {
    const where = (and: 'AND' | 'OR') =>
      Criteria.create<UserPrimitives>({ where: { [and]: [{ name: 'a' }, { id: 'b' }] } });
    expect(where('AND').equals(where('OR'))).toBe(false);
    expect(
      Criteria.create<UserPrimitives>({
        where: { NOT: { OR: [{ name: 'a' }, { id: 'b' }] } },
      }).equals(
        Criteria.create<UserPrimitives>({ where: { NOT: { OR: [{ id: 'b' }, { name: 'a' }] } } }),
      ),
    ).toBe(true);
    expect(
      Criteria.create<UserPrimitives>({ where: { OR: [{ name: 'a' }, { name: 'a' }] } }).equals(
        Criteria.create<UserPrimitives>({ where: { name: 'a' } }),
      ),
    ).toBe(true);
    const order = (first: 'name' | 'id', second: 'name' | 'id') =>
      Criteria.create<UserPrimitives>({ orderBy: [{ [first]: 'asc' }, { [second]: 'asc' }] });
    expect(order('name', 'id').equals(order('id', 'name'))).toBe(false);
    expect(Criteria.create().equals(Criteria.create({ offset: 0 }))).toBe(true);
  });
});

describe('Criteria.fromNodes', () => {
  it('validates and freezes nodes built by hand', () => {
    const criteria = Criteria.fromNodes<UserPrimitives>({
      filter: { kind: 'isNull', field: 'age', value: true },
    });
    expect(criteria.filter).toEqual({ kind: 'isNull', field: 'age', value: true });
    expect(criteria.order).toEqual([]);
    expect(criteria.pagination).toBeNull();
  });
});
