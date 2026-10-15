import { describe, expect, it } from '@jest/globals';
import { Criteria } from '../src/criteria';
import { CriteriaError } from '../src/criteria-error';
import { defineCriteriaSchema } from '../src/criteria-schema';
import { UserPrimitives } from './support/user';

function codeOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    return (error as CriteriaError).code;
  }
  return 'NO_ERROR';
}

const userSchema = defineCriteriaSchema<UserPrimitives>({
  fields: {
    id: 'string',
    name: { type: 'string', operators: ['eq', 'contains', 'startsWith'] },
    age: 'number',
    active: 'boolean',
    status: 'string',
    createdAt: 'date',
    tags: { type: 'string[]', operators: ['hasSome', 'isEmpty'] },
    scores: 'number[]',
    'address.city': { type: 'string', sortable: false },
  },
  defaultLimit: 20,
  maxLimit: 100,
});

describe('defineCriteriaSchema types', () => {
  it('checks each field type against the entity', () => {
    defineCriteriaSchema<UserPrimitives>({
      // @ts-expect-error age is a number
      fields: { age: 'string' },
    });
    defineCriteriaSchema<UserPrimitives>({
      // @ts-expect-error unknown field
      fields: { password: 'string' },
    });
    expect(true).toBe(true);
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
        id: { ne: '7' },
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
        { kind: 'compare', field: 'id', operator: 'ne', value: '7' },
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
    const schema = defineCriteriaSchema<UserPrimitives>({ fields: { id: 'string' }, maxLimit: 50 });
    expect(schema.parse({ offset: 5 }).pagination).toEqual({
      kind: 'offset',
      limit: 50,
      offset: 5,
    });
  });

  it('leaves the result unlimited when the schema sets no limits', () => {
    const schema = defineCriteriaSchema<UserPrimitives>({ fields: { id: 'string' } });
    expect(schema.parse({}).pagination).toBeNull();
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
    [{ where: { age: { between: ['9', '1'] } } }, 'INVALID_RANGE'],
    [{ orderBy: { 'address.city': 'asc' } }, 'NOT_SORTABLE'],
    [{ orderBy: { password: 'asc' } }, 'UNKNOWN_FIELD'],
    [{ limit: 101 }, 'LIMIT_EXCEEDED'],
    [{ limit: 'ten' }, 'INVALID_PAGINATION'],
  ])('rejects %j with %s', (input, code) => {
    expect(codeOf(() => userSchema.parse(input))).toBe(code);
  });
});

describe('schema.check and schema.fromUrl', () => {
  it('checks a criteria that came from a URL', () => {
    const text = Criteria.create<UserPrimitives>({ where: { age: { gt: 3 } }, limit: 5 }).toUrl();
    const criteria = userSchema.fromUrl(text);
    expect(criteria.filter).toEqual({ kind: 'compare', field: 'age', operator: 'gt', value: 3 });
    expect(criteria.pagination).toEqual({ kind: 'offset', limit: 5, offset: 0 });
    expect(Criteria.fromUrl(text, userSchema).equals(criteria)).toBe(true);
  });

  it('keeps values that already have the field type', () => {
    const criteria = Criteria.create<UserPrimitives>({
      where: { active: true, createdAt: new Date(1), age: 4, id: 'x' },
    });
    expect(userSchema.check(criteria).filter).toEqual(criteria.filter);
  });

  it('rejects fields and limits the schema does not allow', () => {
    const unknownField = Criteria.fromNodes<UserPrimitives>({
      filter: { kind: 'isNull', field: 'password', value: true },
    });
    expect(codeOf(() => userSchema.check(unknownField))).toBe('UNKNOWN_FIELD');
    expect(codeOf(() => userSchema.fromUrl(Criteria.create({ limit: 500 }).toUrl()))).toBe(
      'LIMIT_EXCEEDED',
    );
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
    [{ fields: { age: 'integer' } }],
    [{ fields: { age: 'number[][]' } }],
    [{ fields: { age: { type: 'number', operators: ['contains'] } } }],
    [{ fields: { tags: { type: 'string[]', sortable: true } } }],
    [{ fields: {}, defaultLimit: 0 }],
    [{ fields: {}, maxLimit: 1.5 }],
    [{ fields: {}, defaultLimit: 10, maxLimit: 5 }],
  ])('rejects %j', (definition) => {
    expect(codeOf(() => defineCriteriaSchema(definition as never))).toBe('INVALID_SCHEMA');
  });

  it('rejects an invalid field name', () => {
    expect(codeOf(() => defineCriteriaSchema({ fields: { $where: 'string' } } as never))).toBe(
      'INVALID_FIELD',
    );
  });

  it('skips fields declared as undefined', () => {
    const schema = defineCriteriaSchema<UserPrimitives>({
      fields: { id: 'string', age: undefined },
    });
    expect(codeOf(() => schema.parse({ where: { age: 1 } }))).toBe('UNKNOWN_FIELD');
  });
});
