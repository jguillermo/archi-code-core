import { describe, expect, expectTypeOf, it } from 'vitest';
import { CreatedAt } from '../../../src/domain/index';
import { Criteria } from '../../../src/shared/criteria/criteria';
import { CriteriaError } from '../../../src/shared/criteria/criteria-error';
import { FilterNode } from '../../../src/shared/criteria/filter-node';
import { Path, SortablePath } from '../../../src/shared/criteria/path';
import {
  City,
  Product,
  User,
  UserActive,
  UserAge,
  UserEmail,
  UserId,
  UserName,
  UserScore,
  UserStatus,
  UserStatusOption,
  UserTag,
} from './support/user';

const FIRST_ID = '0a6f2d2e-1b1e-4c55-9a43-5a3e2b0c7d11';
const name = (value: string): UserName => new UserName(value);
const age = (value: number): UserAge => new UserAge(value);
const at = (time: number): CreatedAt => new CreatedAt(new Date(time));
const tag = (value: string): UserTag => new UserTag(value);
const ACTIVE = new UserStatus(UserStatusOption.ACTIVE);
const PENDING = new UserStatus(UserStatusOption.PENDING);

function errorOf(action: () => unknown): CriteriaError {
  try {
    action();
  } catch (error) {
    return error as CriteriaError;
  }
  throw new Error('Expected a CriteriaError');
}

function nameIs(value: string): FilterNode {
  return { kind: 'compare', field: 'name', operator: 'eq', value };
}

describe('Criteria types', () => {
  it('offers the value objects of the aggregate, nested ones with dots, and skips methods, private fields and JSON', () => {
    expectTypeOf<Path<User>>().toEqualTypeOf<
      | 'id'
      | 'name'
      | 'email'
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

  it('only sorts by value objects that hold one scalar', () => {
    expectTypeOf<SortablePath<User>>().toEqualTypeOf<
      | 'id'
      | 'name'
      | 'email'
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

  it('takes value objects for values, plain text for text fragments and only the operators of each kind', () => {
    Criteria.create<User>({
      where: {
        status: { in: [ACTIVE, PENDING] },
        age: { gte: age(18), lt: age(65) },
        name: { contains: 'an', mode: 'insensitive' },
        createdAt: { between: [at(0), at(1)] },
        tags: { has: tag('vip') },
        'address.city': new City('Huelva'),
        active: new UserActive(true),
        OR: [{ age: null }, { NOT: { tags: { isEmpty: true } } }],
      },
      orderBy: [{ createdAt: 'desc' }, { 'address.city': 'asc' }],
      limit: 10,
    });
    const rejectedAtCompileTime = () => [
      Criteria.create<User>({
        // @ts-expect-error a value is a value object, never a primitive
        where: { age: { gte: 18 } },
      }),
      Criteria.create<User>({
        // @ts-expect-error a value is a value object, never a primitive
        where: { status: 'active' },
      }),
      Criteria.create<User>({
        // @ts-expect-error contains does not apply to numbers
        where: { age: { contains: '1' } },
      }),
      Criteria.create<User>({
        // @ts-expect-error gt does not apply to booleans
        where: { active: { gt: new UserActive(true) } },
      }),
      Criteria.create<User>({
        // @ts-expect-error has takes an item of the list
        where: { tags: { has: 'vip' } },
      }),
      Criteria.create<User>({
        // @ts-expect-error unknown field
        where: { password: name('x') },
      }),
      Criteria.create<User>({
        // @ts-expect-error JSON value objects cannot be filtered
        where: { preferences: null },
      }),
      Criteria.create<User>({
        // @ts-expect-error lists cannot be sorted
        orderBy: { tags: 'asc' },
      }),
      // @ts-expect-error a criteria targets an aggregate
      Criteria.create<{ id: string }>(),
    ];
    expect(typeof rejectedAtCompileTime).toBe('function');
  });

  it('keeps the aggregate type apart', () => {
    expectTypeOf<Criteria<User>>().not.toEqualTypeOf<Criteria<Product>>();
  });
});

describe('Criteria.create', () => {
  it('builds an empty criteria', () => {
    const criteria = Criteria.create();
    expect(criteria.filter).toBeNull();
    expect(criteria.order).toEqual([]);
    expect(criteria.pagination).toBeNull();
  });

  it('turns where into filter nodes that hold the values of the value objects', () => {
    const criteria = Criteria.create<User>({
      where: {
        status: ACTIVE,
        age: { gte: age(18), lt: age(65) },
        name: { contains: 'an', mode: 'insensitive', startsWith: 'A' },
        'address.city': null,
        tags: {
          has: tag('vip'),
          hasSome: [tag('a'), tag('b')],
          hasEvery: [tag('c')],
          isEmpty: false,
        },
        scores: { isNull: false },
        createdAt: { between: [at(0), at(10)], in: [at(0)], nin: [at(1)] },
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

  it('reads an id, an email and an enum through their value objects', () => {
    const criteria = Criteria.create<User>({
      where: {
        id: new UserId(FIRST_ID.toUpperCase()),
        email: { ne: new UserEmail('ana@example.com') },
      },
    });
    expect(criteria.filter).toEqual({
      kind: 'and',
      filters: [
        { kind: 'compare', field: 'id', operator: 'eq', value: FIRST_ID },
        { kind: 'compare', field: 'email', operator: 'ne', value: 'ana@example.com' },
      ],
    });
  });

  it('turns a value object that holds no value into a null check', () => {
    const criteria = Criteria.create<User>({
      where: { name: new UserName(null), age: { ne: new UserAge(null) } },
    });
    expect(criteria.filter).toEqual({
      kind: 'and',
      filters: [
        { kind: 'isNull', field: 'name', value: true },
        { kind: 'isNull', field: 'age', value: false },
      ],
    });
  });

  it('treats text as case sensitive unless mode is insensitive', () => {
    const criteria = Criteria.create<User>({
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
    const minAge: UserAge | undefined = undefined;
    const criteria = Criteria.create<User>({
      where: { age: { gte: minAge }, status: undefined, AND: [{}, { name: name('Ana') }] },
    });
    expect(criteria.filter).toEqual(nameIs('Ana'));
  });

  it('drops a where that has no conditions', () => {
    expect(Criteria.create<User>({ where: {} }).filter).toBeNull();
    expect(Criteria.create<User>({ where: { AND: [{}] } }).filter).toBeNull();
  });

  it('builds AND, OR and NOT', () => {
    const criteria = Criteria.create<User>({
      where: {
        AND: [{ name: name('1') }, { name: name('2') }],
        OR: [{ name: name('3') }, { name: name('4') }],
        NOT: { name: name('5') },
      },
    });
    expect(criteria.filter).toEqual({
      kind: 'and',
      filters: [
        { kind: 'and', filters: [nameIs('1'), nameIs('2')] },
        { kind: 'or', filters: [nameIs('3'), nameIs('4')] },
        { kind: 'not', filter: nameIs('5') },
      ],
    });
  });

  it('unwraps an OR with one condition', () => {
    expect(Criteria.create<User>({ where: { OR: [{ name: name('1') }] } }).filter).toEqual(
      nameIs('1'),
    );
  });

  it('turns an OR with an empty branch into no filter, because that branch matches everything', () => {
    expect(Criteria.create<User>({ where: { OR: [{ name: name('1') }, {}] } }).filter).toBeNull();
  });

  it('builds the order from one object or a list', () => {
    expect(Criteria.create<User>({ orderBy: { name: 'asc', age: 'desc' } }).order).toEqual([
      { field: 'name', direction: 'asc' },
      { field: 'age', direction: 'desc' },
    ]);
    expect(
      Criteria.create<User>({ orderBy: [{ name: undefined }, { age: 'desc' }] }).order,
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
    [() => Criteria.create<User>({ where: { age: 18 as never } }), 'INVALID_VALUE'],
    [() => Criteria.create<User>({ where: { age: { gte: 18 as never } } }), 'INVALID_VALUE'],
    [
      () => Criteria.create<User>({ where: { age: { in: [age(1), 2 as never] } } }),
      'INVALID_VALUE',
    ],
    [() => Criteria.create<User>({ where: { tags: { has: 'vip' as never } } }), 'INVALID_VALUE'],
    [() => Criteria.create<User>({ where: { createdAt: new Date(0) as never } }), 'INVALID_VALUE'],
    [
      () => Criteria.create<User>({ where: { age: { like: age(1) } as never } }),
      'INVALID_OPERATOR',
    ],
    [() => Criteria.create<User>({ where: { name: { mode: 'insensitive' } } }), 'INVALID_OPERATOR'],
    [
      () =>
        Criteria.create<User>({
          where: { name: { contains: 'a', mode: 'other' as never } },
        }),
      'INVALID_VALUE',
    ],
    [
      () => Criteria.create<User>({ where: { age: { between: [age(1)] as never } } }),
      'INVALID_VALUE',
    ],
    [() => Criteria.create<User>({ where: { age: { in: age(1) as never } } }), 'INVALID_VALUE'],
    [() => Criteria.create<User>({ where: { age: { in: [] } } }), 'EMPTY_LIST'],
    [() => Criteria.create<User>({ where: { tags: { hasSome: [] } } }), 'EMPTY_LIST'],
    [() => Criteria.create<User>({ where: { AND: {} as never } }), 'INVALID_FORMAT'],
    [() => Criteria.create<User>({ where: { OR: [] } }), 'EMPTY_LIST'],
    [() => Criteria.create<User>({ where: { NOT: {} } }), 'INVALID_VALUE'],
    [() => Criteria.create<User>({ where: { age: { gt: new UserAge(null) } } }), 'INVALID_VALUE'],
    [() => Criteria.create<User>({ where: { age: [age(1)] as never } }), 'INVALID_VALUE'],
    [
      () => Criteria.create<User>({ where: { active: { gt: new UserActive(true) } as never } }),
      'INVALID_VALUE',
    ],
    [
      () => Criteria.create<User>({ where: { age: { between: [age(5), age(1)] } } }),
      'INVALID_RANGE',
    ],
    [
      () => Criteria.create<User>({ where: { age: { between: [age(1), name('z')] as never } } }),
      'INVALID_RANGE',
    ],
    [() => Criteria.create({ where: { $where: name('x') } as never }), 'INVALID_FIELD'],
    [() => Criteria.create({ where: { 'a..b': name('x') } as never }), 'INVALID_FIELD'],
    [() => Criteria.create({ where: { '__proto__.x': name('x') } as never }), 'INVALID_FIELD'],
    [() => Criteria.create({ where: { 'a\u0000b': name('x') } as never }), 'INVALID_FIELD'],
    [() => Criteria.create({ where: { 'a.\nb': name('x') } as never }), 'INVALID_FIELD'],
    [() => Criteria.create({ where: { 'a\u007f': name('x') } as never }), 'INVALID_FIELD'],
    [() => Criteria.create({ orderBy: 'name' as never }), 'INVALID_ORDER'],
    [() => Criteria.create({ orderBy: { name: 'up' } as never }), 'INVALID_ORDER'],
    [
      () => Criteria.create<User>({ orderBy: [{ name: 'asc' }, { name: 'desc' }] }),
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
    const error = errorOf(() => Criteria.create<User>({ where: { age: { in: [] } } }));
    expect(error.name).toBe('CriteriaError');
    expect(error.message).toBe('"in" on "age" needs at least one value');
    expect(errorOf(() => Criteria.create<User>({ where: { age: 18 as never } })).message).toBe(
      'Field "age" needs a value object',
    );
  });
});

describe('Criteria immutability', () => {
  it('freezes the criteria and its nodes', () => {
    const criteria = Criteria.create<User>({
      where: { age: { in: [age(1), age(2)] } },
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
    const criteria = Criteria.create<User>({
      where: { createdAt: { between: [at(0), at(10)] } },
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
    expect(Criteria.fromUrl<User>(criteria.toUrl()).equals(criteria)).toBe(true);
  });

  it('copies input lists', () => {
    const values = [age(1), age(2)];
    const criteria = Criteria.create<User>({
      where: { age: { in: values }, createdAt: at(0) },
    });
    values.push(age(3));
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
  const base = Criteria.create<User>({ where: { status: ACTIVE } });

  it('and adds conditions without changing the original', () => {
    const narrowed = base
      .and({ age: { gte: age(18) } })
      .and({ AND: [{ name: name('1') }, { name: name('2') }] });
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
        nameIs('1'),
        nameIs('2'),
      ],
    });
  });

  it('and on an empty criteria uses the new filter, and an empty where changes nothing', () => {
    const empty = Criteria.create<User>();
    expect(empty.and({ name: name('1') }).filter).toEqual(nameIs('1'));
    expect(base.and({})).toBe(base);
    expect(errorOf(() => base.and({ name: 'Ana' as never })).code).toBe('INVALID_VALUE');
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
    const one = Criteria.create<User>({ where: { createdAt: at(5) }, limit: 2 });
    const same = Criteria.create<User>({ where: { createdAt: at(5) }, limit: 2 });
    expect(one.equals(same)).toBe(true);
    expect(one.equals(same.paginate({ limit: 3 }))).toBe(false);
  });

  it('equals ignores the order of AND/OR conditions and of list values', () => {
    const one = Criteria.create<User>({
      where: {
        status: ACTIVE,
        age: { in: [age(1), age(2), age(2)] },
        OR: [{ name: name('a') }, { tags: { hasSome: [tag('x'), tag('y')] } }],
        AND: [
          { active: new UserActive(true) },
          { 'address.city': { nin: [new City('b'), new City('a')] } },
        ],
      },
    });
    const same = Criteria.create<User>({
      where: {
        AND: [{ 'address.city': { nin: [new City('a'), new City('b')] } }],
        OR: [{ tags: { hasSome: [tag('y'), tag('x')] } }, { name: name('a') }],
        active: new UserActive(true),
        age: { in: [age(2), age(1)] },
        status: ACTIVE,
      },
    });
    expect(one.equals(same)).toBe(true);
    expect(one.toUrl()).not.toBe(same.toUrl());
    expect(one.equals(same.and({ name: name('b') }))).toBe(false);
  });

  it('equals keeps the meaning of NOT, of AND against OR and of the order', () => {
    const where = (and: 'AND' | 'OR') =>
      Criteria.create<User>({
        where: { [and]: [{ name: name('a') }, { 'address.city': new City('b') }] },
      });
    expect(where('AND').equals(where('OR'))).toBe(false);
    expect(
      Criteria.create<User>({
        where: { NOT: { OR: [{ name: name('a') }, { scores: { has: new UserScore(1) } }] } },
      }).equals(
        Criteria.create<User>({
          where: { NOT: { OR: [{ scores: { has: new UserScore(1) } }, { name: name('a') }] } },
        }),
      ),
    ).toBe(true);
    expect(
      Criteria.create<User>({ where: { OR: [{ name: name('a') }, { name: name('a') }] } }).equals(
        Criteria.create<User>({ where: { name: name('a') } }),
      ),
    ).toBe(true);
    const order = (first: 'name' | 'id', second: 'name' | 'id') =>
      Criteria.create<User>({ orderBy: [{ [first]: 'asc' }, { [second]: 'asc' }] });
    expect(order('name', 'id').equals(order('id', 'name'))).toBe(false);
    expect(Criteria.create().equals(Criteria.create({ offset: 0 }))).toBe(true);
  });
});

describe('Criteria.fromNodes', () => {
  it('validates and freezes nodes built by hand', () => {
    const criteria = Criteria.fromNodes<User>({
      filter: { kind: 'isNull', field: 'age', value: true },
    });
    expect(criteria.filter).toEqual({ kind: 'isNull', field: 'age', value: true });
    expect(criteria.order).toEqual([]);
    expect(criteria.pagination).toBeNull();
  });

  it('still refuses values a value object could not hold', () => {
    expect(
      errorOf(() =>
        Criteria.fromNodes<User>({
          filter: { kind: 'compare', field: 'age', operator: 'gt', value: Number.NaN },
        }),
      ).code,
    ).toBe('INVALID_VALUE');
  });
});
