import { describe, expect, it } from 'vitest';
import { CreatedAt } from '../../../src/domain/index';
import { Criteria } from '../../../src/shared/criteria/criteria';
import { CriteriaError } from '../../../src/shared/criteria/criteria-error';
import { DEFAULT_CRITERIA_LIMITS } from '../../../src/shared/criteria/criteria-limits';
import { defineCriteriaSchema } from '../../../src/shared/criteria/criteria-schema';
import {
  Address,
  City,
  User,
  UserActive,
  UserAge,
  UserEmail,
  UserId,
  UserName,
  UserPreferences,
  UserScores,
  UserStatus,
  UserTags,
} from './support/user';

const FIRST_ID = '0a6f2d2e-1b1e-4c55-9a43-5a3e2b0c7d11';

function codeOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    return (error as CriteriaError).code;
  }
  return 'NO_ERROR';
}

function errorOf(action: () => unknown): CriteriaError {
  try {
    action();
  } catch (error) {
    return error as CriteriaError;
  }
  throw new Error('Expected a CriteriaError');
}

const userSchema = defineCriteriaSchema<User>({
  fields: {
    id: UserId,
    name: { type: UserName, operators: ['eq', 'contains', 'startsWith'] },
    email: UserEmail,
    age: UserAge,
    active: UserActive,
    status: UserStatus,
    createdAt: CreatedAt,
    tags: { type: UserTags, operators: ['hasSome', 'isEmpty'] },
    scores: UserScores,
    'address.city': { type: City, sortable: false },
  },
  defaultLimit: 20,
  maxLimit: 100,
});

describe('defineCriteriaSchema types', () => {
  it('checks the value object class of each field against the aggregate', () => {
    const rejectedAtCompileTime = () => [
      defineCriteriaSchema<User>({
        // @ts-expect-error age holds a UserAge, not a text
        fields: { age: UserName },
        maxLimit: 10,
      }),
      defineCriteriaSchema<User>({
        // @ts-expect-error fields are declared with value object classes
        fields: { age: 'number' },
        maxLimit: 10,
      }),
      defineCriteriaSchema<User>({
        // @ts-expect-error unknown field
        fields: { password: UserName },
        maxLimit: 10,
      }),
    ];
    expect(typeof rejectedAtCompileTime).toBe('function');
  });
});

describe('schema.parse', () => {
  it('converts text values from a query string to the field type', () => {
    const criteria = userSchema.parse({
      where: {
        age: { gte: '18', between: ['1', '90'] },
        active: 'true',
        createdAt: { lt: '2024-01-01T00:00:00.000Z', gt: 0 },
        scores: { has: '5', hasEvery: ['1', 2] },
        status: { in: ['active'], nin: ['blocked'] },
        id: { ne: FIRST_ID.toUpperCase() },
        NOT: { active: 'false' },
        OR: [{ name: { contains: 'an' } }, { tags: { isEmpty: true } }],
      },
      orderBy: { createdAt: 'desc' },
      limit: '10',
      offset: '30',
    });
    expect(criteria.filter).toEqual({
      kind: 'and',
      filters: [
        {
          kind: 'and',
          filters: [
            { kind: 'compare', field: 'age', operator: 'gte', value: 18 },
            { kind: 'between', field: 'age', min: 1, max: 90 },
          ],
        },
        { kind: 'compare', field: 'active', operator: 'eq', value: true },
        {
          kind: 'and',
          filters: [
            {
              kind: 'compare',
              field: 'createdAt',
              operator: 'lt',
              value: new Date('2024-01-01T00:00:00.000Z'),
            },
            { kind: 'compare', field: 'createdAt', operator: 'gt', value: new Date(0) },
          ],
        },
        {
          kind: 'and',
          filters: [
            { kind: 'arrayContains', field: 'scores', match: 'some', values: [5] },
            { kind: 'arrayContains', field: 'scores', match: 'every', values: [1, 2] },
          ],
        },
        {
          kind: 'and',
          filters: [
            { kind: 'in', field: 'status', values: ['active'] },
            { kind: 'notIn', field: 'status', values: ['blocked'] },
          ],
        },
        { kind: 'compare', field: 'id', operator: 'ne', value: FIRST_ID },
        { kind: 'not', filter: { kind: 'compare', field: 'active', operator: 'eq', value: false } },
        {
          kind: 'or',
          filters: [
            { kind: 'text', field: 'name', operator: 'contains', value: 'an', caseSensitive: true },
            { kind: 'arrayEmpty', field: 'tags', value: true },
          ],
        },
      ],
    });
    expect(criteria.order).toEqual([{ field: 'createdAt', direction: 'desc' }]);
    expect(criteria.pagination).toEqual({ kind: 'offset', limit: 10, offset: 30 });
  });

  it('applies the default limit', () => {
    expect(userSchema.parse({}).pagination).toEqual({ kind: 'offset', limit: 20, offset: 0 });
  });

  it('uses the maximum as the limit when there is no default', () => {
    const schema = defineCriteriaSchema<User>({ fields: { id: UserId }, maxLimit: 50 });
    expect(schema.parse({ offset: 5 }).pagination).toEqual({
      kind: 'offset',
      limit: 50,
      offset: 5,
    });
  });

  it('rejects a schema without maxLimit', () => {
    expect(codeOf(() => defineCriteriaSchema({ fields: { id: UserId } } as never))).toBe(
      'INVALID_SCHEMA',
    );
  });

  it('accepts hasSome with one value when only hasSome is allowed', () => {
    expect(userSchema.parse({ where: { tags: { hasSome: ['vip'] } } }).filter).toEqual({
      kind: 'arrayContains',
      field: 'tags',
      match: 'some',
      values: ['vip'],
    });
  });

  it.each([
    [null, 'INVALID_FORMAT'],
    [{ where: { password: 'x' } }, 'UNKNOWN_FIELD'],
    [{ where: { name: { endsWith: 'x' } } }, 'OPERATOR_NOT_ALLOWED'],
    [{ where: { tags: { hasSome: ['a', 'b'], hasEvery: ['c'] } } }, 'OPERATOR_NOT_ALLOWED'],
    [{ where: { scores: { isEmpty: true } } }, 'NO_ERROR'],
    [{ where: { age: 'eighteen' } }, 'INVALID_VALUE'],
    [{ where: { age: ' ' } }, 'INVALID_VALUE'],
    [{ where: { active: 'yes' } }, 'INVALID_VALUE'],
    [{ where: { createdAt: 'yesterday' } }, 'INVALID_VALUE'],
    [{ where: { createdAt: true } }, 'INVALID_VALUE'],
    [{ where: { id: 7 } }, 'INVALID_VALUE'],
    [{ where: { id: '7' } }, 'INVALID_VALUE'],
    [{ where: { email: 'not-an-email' } }, 'INVALID_VALUE'],
    [{ where: { email: { contains: 'example' } } }, 'NO_ERROR'],
    [{ where: { age: '-1' } }, 'INVALID_VALUE'],
    [{ where: { age: { gt: null } } }, 'INVALID_VALUE'],
    [{ where: { status: 'deleted' } }, 'INVALID_VALUE'],
    [{ where: { status: { in: ['active', 'gone'] } } }, 'INVALID_VALUE'],
    [{ where: { status: { gt: 'active' } } }, 'OPERATOR_NOT_ALLOWED'],
    [{ where: { scores: { has: 'many' } } }, 'INVALID_VALUE'],
    [{ where: { age: { between: ['9', '1'] } } }, 'INVALID_RANGE'],
    [{ orderBy: { 'address.city': 'asc' } }, 'NOT_SORTABLE'],
    [{ orderBy: { password: 'asc' } }, 'UNKNOWN_FIELD'],
    [{ limit: 101 }, 'LIMIT_EXCEEDED'],
    [{ limit: 'ten' }, 'INVALID_PAGINATION'],
    [{ offset: 10_000 }, 'NO_ERROR'],
    [{ offset: 10_001 }, 'LIMIT_EXCEEDED'],
    [{ offset: '1000000000000000' }, 'LIMIT_EXCEEDED'],
    [{ offset: 1e300 }, 'LIMIT_EXCEEDED'],
    [{ offset: -1 }, 'INVALID_PAGINATION'],
    [{ where: { createdAt: '1' } }, 'INVALID_VALUE'],
    [{ where: { createdAt: '2024' } }, 'INVALID_VALUE'],
    [{ where: { createdAt: '1700000000000' } }, 'INVALID_VALUE'],
    [{ where: { createdAt: 'March 7' } }, 'INVALID_VALUE'],
    [{ where: { createdAt: '2024-01-01T00:00' } }, 'INVALID_VALUE'],
    [{ where: { createdAt: '2024-02-30' } }, 'INVALID_VALUE'],
    [{ where: { createdAt: 1.5 } }, 'INVALID_VALUE'],
    [{ where: { age: '0x10' } }, 'INVALID_VALUE'],
    [{ where: { age: '1e3' } }, 'INVALID_VALUE'],
    [{ where: { age: ' 12 ' } }, 'INVALID_VALUE'],
  ])('rejects %j with %s', (input, code) => {
    expect(codeOf(() => userSchema.parse(input))).toBe(code);
  });
});

describe('schema.check and schema.fromUrl', () => {
  it('checks a criteria that came from a URL', () => {
    const text = Criteria.create<User>({
      where: { age: { gt: new UserAge(3) } },
      limit: 5,
    }).toUrl();
    const criteria = userSchema.fromUrl(text);
    expect(criteria.filter).toEqual({ kind: 'compare', field: 'age', operator: 'gt', value: 3 });
    expect(criteria.pagination).toEqual({ kind: 'offset', limit: 5, offset: 0 });
    expect(Criteria.fromUrl(text, userSchema).equals(criteria)).toBe(true);
  });

  it('keeps values that already have the field type', () => {
    const criteria = Criteria.create<User>({
      where: {
        active: new UserActive(true),
        createdAt: new CreatedAt(new Date(1)),
        age: new UserAge(4),
        id: new UserId(FIRST_ID),
      },
    });
    expect(userSchema.check(criteria).filter).toEqual(criteria.filter);
  });

  it('rejects fields and limits the schema does not allow', () => {
    const unknownField = Criteria.fromNodes<User>({
      filter: { kind: 'isNull', field: 'password', value: true },
    });
    expect(codeOf(() => userSchema.check(unknownField))).toBe('UNKNOWN_FIELD');
    expect(codeOf(() => userSchema.fromUrl(Criteria.create({ limit: 500 }).toUrl()))).toBe(
      'LIMIT_EXCEEDED',
    );
  });

  it('converts strict ISO dates and milliseconds given as a number', () => {
    const at = (value: unknown): unknown =>
      (userSchema.parse({ where: { createdAt: value } }).filter as { value: Date }).value;
    expect(at('2024-01-01')).toEqual(new Date('2024-01-01T00:00:00.000Z'));
    expect(at('2024-01-01T10:00+02:00')).toEqual(new Date('2024-01-01T08:00:00.000Z'));
    expect(at(1_700_000_000_000)).toEqual(new Date(1_700_000_000_000));
  });

  it('explains a value its value object refuses and keeps the reason as the cause', () => {
    const error = errorOf(() => userSchema.parse({ where: { email: 'not-an-email' } }));
    expect(error.message).toBe('Field "email" needs a valid UserEmail value');
    expect(error.cause).toBeInstanceOf(Error);
    expect(errorOf(() => userSchema.parse({ where: { age: 'old' } })).message).toBe(
      'Field "age" needs a number value',
    );
  });

  it('converts through the value object, so ids and enums arrive normalized', () => {
    const criteria = userSchema.parse({
      where: { id: FIRST_ID.toUpperCase(), status: { in: ['pending'] }, email: { contains: 'ex' } },
    });
    expect(criteria.filter).toEqual({
      kind: 'and',
      filters: [
        { kind: 'compare', field: 'id', operator: 'eq', value: FIRST_ID },
        { kind: 'in', field: 'status', values: ['pending'] },
        { kind: 'text', field: 'email', operator: 'contains', value: 'ex', caseSensitive: true },
      ],
    });
  });

  it('freezes the schema', () => {
    expect(Object.isFrozen(userSchema)).toBe(true);
  });
});

describe('schema definition errors', () => {
  it.each([
    [null],
    [{ fields: null }],
    [{ fields: { age: { operators: [] } } }],
    [{ fields: { age: 'number' } }],
    [{ fields: { age: Date } }],
    [{ fields: { preferences: UserPreferences } }],
    [{ fields: { address: Address } }],
    [{ fields: { age: { type: UserAge, operators: ['contains'] } } }],
    [{ fields: { tags: { type: UserTags, sortable: true } } }],
    [{ fields: {}, maxLimit: 10, defaultLimit: 0 }],
    [{ fields: {}, maxLimit: 0 }],
    [{ fields: {}, maxLimit: Number.MAX_SAFE_INTEGER + 1 }],
    [{ fields: {}, maxLimit: 10, maxOffset: 0 }],
    [{ fields: {}, maxLimit: 10, maxOffset: 1.5 }],
    [{ fields: {}, maxLimit: 10, limits: null }],
    [{ fields: {}, maxLimit: 10, limits: { maxRows: 1 } }],
    [{ fields: {}, maxLimit: 10, limits: { maxDepth: 65 } }],
    [{ fields: {}, maxLimit: 1.5 }],
    [{ fields: {}, defaultLimit: 10, maxLimit: 5 }],
  ])('rejects %j', (definition) => {
    expect(codeOf(() => defineCriteriaSchema(definition as never))).toBe('INVALID_SCHEMA');
  });

  it('rejects an invalid field name', () => {
    expect(codeOf(() => defineCriteriaSchema({ fields: { $where: UserName } } as never))).toBe(
      'INVALID_FIELD',
    );
  });

  it('skips fields declared as undefined', () => {
    const schema = defineCriteriaSchema<User>({
      fields: { id: UserId, age: undefined },
      maxLimit: 10,
    });
    expect(codeOf(() => schema.parse({ where: { age: 1 } }))).toBe('UNKNOWN_FIELD');
  });
});

describe('schema limits', () => {
  const smallSchema = defineCriteriaSchema<User>({
    fields: { name: UserName, age: UserAge },
    maxLimit: 10,
    maxOffset: 20,
    limits: { maxDepth: 2, maxNodes: 3, maxListSize: 2, maxUrlLength: 60 },
  });

  it('exposes the resolved limits', () => {
    expect(smallSchema.limits).toEqual({
      ...DEFAULT_CRITERIA_LIMITS,
      maxDepth: 2,
      maxNodes: 3,
      maxListSize: 2,
      maxUrlLength: 60,
    });
    expect(userSchema.limits).toBe(DEFAULT_CRITERIA_LIMITS);
  });

  it.each([
    [{ where: { NOT: { NOT: { name: 'a' } } } }, 'LIMIT_EXCEEDED'],
    [{ where: { NOT: { name: 'a' } } }, 'NO_ERROR'],
    [{ where: { OR: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] } }, 'LIMIT_EXCEEDED'],
    [{ where: { name: { in: ['a', 'b', 'c'] } } }, 'LIMIT_EXCEEDED'],
    [{ offset: 21 }, 'LIMIT_EXCEEDED'],
    [{ offset: 20 }, 'NO_ERROR'],
  ])('parse checks %j', (input, code) => {
    expect(codeOf(() => smallSchema.parse(input))).toBe(code);
  });

  it('checks a criteria built in code and a URL text against its limits', () => {
    const wide = Criteria.create<User>({
      where: { name: { in: [new UserName('a'), new UserName('b'), new UserName('c')] } },
    });
    expect(codeOf(() => smallSchema.check(wide))).toBe('LIMIT_EXCEEDED');
    expect(codeOf(() => smallSchema.fromUrl(wide.toUrl()))).toBe('LIMIT_EXCEEDED');
    const long = Criteria.create<User>({ where: { name: new UserName('a'.repeat(60)) } }).toUrl();
    expect(codeOf(() => smallSchema.fromUrl(long))).toBe('LIMIT_EXCEEDED');
    expect(codeOf(() => Criteria.fromUrl(long, smallSchema))).toBe('LIMIT_EXCEEDED');
  });
});

describe('schema tiebreaker', () => {
  const pagedSchema = defineCriteriaSchema<User>({
    fields: { id: UserId, name: UserName, createdAt: CreatedAt },
    maxLimit: 50,
    tiebreaker: 'id',
  });

  it('adds the tiebreaker last so pages never overlap', () => {
    expect(pagedSchema.parse({}).order).toEqual([{ field: 'id', direction: 'asc' }]);
    expect(pagedSchema.parse({ orderBy: { createdAt: 'desc' } }).order).toEqual([
      { field: 'createdAt', direction: 'desc' },
      { field: 'id', direction: 'asc' },
    ]);
    expect(pagedSchema.check(Criteria.create<User>({ orderBy: { name: 'asc' } })).order).toEqual([
      { field: 'name', direction: 'asc' },
      { field: 'id', direction: 'asc' },
    ]);
  });

  it('keeps the direction the input gives to the tiebreaker', () => {
    expect(pagedSchema.parse({ orderBy: [{ id: 'desc' }, { name: 'asc' }] }).order).toEqual([
      { field: 'id', direction: 'desc' },
      { field: 'name', direction: 'asc' },
    ]);
  });

  it.each([
    [{ tiebreaker: 'age' }],
    [{ tiebreaker: 'tags', fields: { tags: UserTags } }],
    [{ tiebreaker: 'name', fields: { name: { type: UserName, sortable: false } } }],
    [{ tiebreaker: 7 }],
  ])('rejects %j', (definition) => {
    expect(
      codeOf(() =>
        defineCriteriaSchema({ fields: { id: UserId }, maxLimit: 10, ...definition } as never),
      ),
    ).toBe('INVALID_SCHEMA');
  });
});
