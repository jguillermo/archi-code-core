import { describe, expect, it } from '@jest/globals';
import { Criteria } from '../src/criteria';
import { CriteriaError } from '../src/criteria-error';
import { DEFAULT_CRITERIA_LIMITS } from '../src/criteria-limits';
import { CriteriaChecker } from '../src/criteria';
import { UserPrimitives } from './support/user';

function codeOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    return (error as CriteriaError).code;
  }
  return 'NO_ERROR';
}

describe('Criteria JSON', () => {
  const criteria = Criteria.create<UserPrimitives>({
    where: {
      status: { in: ['active'], nin: ['blocked'], ne: 'pending' },
      age: { between: [1, 9] },
      name: { contains: 'a', mode: 'insensitive', startsWith: 'b', endsWith: 'c' },
      tags: { hasSome: ['x', 'y'], hasEvery: ['z'], isEmpty: false },
      scores: { isNull: true },
      createdAt: { gt: new Date(1000) },
      OR: [{ id: '1' }, { active: false }],
      NOT: { id: '2' },
    },
    orderBy: [{ name: 'asc' }, { age: 'desc' }],
    limit: 10,
    offset: 20,
  });

  it('writes a compact form', () => {
    expect(criteria.toJSON()).toEqual({
      v: 1,
      f: [
        'and',
        [
          [
            'and',
            [
              ['in', 'status', ['active']],
              ['nin', 'status', ['blocked']],
              ['ne', 'status', 'pending'],
            ],
          ],
          ['bt', 'age', 1, 9],
          [
            'and',
            [
              ['ct', 'name', 'a', 0],
              ['sw', 'name', 'b', 0],
              ['ew', 'name', 'c', 0],
            ],
          ],
          [
            'and',
            [
              ['hs', 'tags', ['x', 'y']],
              ['he', 'tags', ['z']],
              ['em', 'tags', 0],
            ],
          ],
          ['nu', 'scores', 1],
          ['gt', 'createdAt', { d: 1000 }],
          [
            'or',
            [
              ['eq', 'id', '1'],
              ['eq', 'active', false],
            ],
          ],
          ['not', ['eq', 'id', '2']],
        ],
      ],
      o: [
        ['name', 1],
        ['age', -1],
      ],
      l: 10,
      s: 20,
    });
  });

  it('omits the parts that are empty', () => {
    expect(Criteria.create().toJSON()).toEqual({ v: 1 });
    expect(Criteria.create({ offset: 3 }).toJSON()).toEqual({ v: 1, s: 3 });
    expect(Criteria.create({ limit: 3 }).toJSON()).toEqual({ v: 1, l: 3 });
  });

  it('reads back what it writes, through JSON.stringify too', () => {
    const restored = Criteria.fromJSON<UserPrimitives>(JSON.parse(JSON.stringify(criteria)));
    expect(restored.equals(criteria)).toBe(true);
    expect(restored.filter).toEqual(criteria.filter);
    expect(restored.order).toEqual(criteria.order);
    expect(restored.pagination).toEqual(criteria.pagination);
  });

  it('decodes an offset without limit', () => {
    expect(Criteria.fromJSON({ v: 1, s: 5 }).pagination).toEqual({
      kind: 'offset',
      limit: null,
      offset: 5,
    });
  });

  it('applies the default limits without a schema', () => {
    const values = Array.from({ length: 1001 }, (_, index) => `v${index}`);
    expect(codeOf(() => Criteria.fromJSON({ v: 1, f: ['in', 'id', values] }))).toBe(
      'LIMIT_EXCEEDED',
    );
    expect(Criteria.fromJSON({ v: 1, f: ['in', 'id', values.slice(1)] }).filter).not.toBeNull();
  });

  it('applies a schema when one is given', () => {
    const checked = Criteria.create<UserPrimitives>({ limit: 1 });
    const schema: CriteriaChecker<UserPrimitives> = {
      limits: DEFAULT_CRITERIA_LIMITS,
      check: () => checked,
    };
    expect(Criteria.fromJSON(criteria.toJSON(), schema)).toBe(checked);
  });

  it.each([
    [null, 'INVALID_FORMAT'],
    [{ v: 2 }, 'UNSUPPORTED_VERSION'],
    [{ v: 1, f: 'x' }, 'INVALID_FORMAT'],
    [{ v: 1, f: [1] }, 'INVALID_FORMAT'],
    [{ v: 1, f: ['zz', 'a'] }, 'INVALID_FORMAT'],
    [{ v: 1, f: ['nu', 'a', 2] }, 'INVALID_FORMAT'],
    [{ v: 1, f: ['ct', 'a', 'x', true] }, 'INVALID_FORMAT'],
    [{ v: 1, f: ['and', 'x'] }, 'INVALID_FORMAT'],
    [{ v: 1, f: ['in', 'a', 'x'] }, 'INVALID_VALUE'],
    [{ v: 1, f: ['eq', 'a', { d: 'x' }] }, 'INVALID_VALUE'],
    [{ v: 1, f: ['eq', 'a', { d: 1, e: 2 }] }, 'INVALID_VALUE'],
    [{ v: 1, o: 'x' }, 'INVALID_FORMAT'],
    [{ v: 1, o: [['a', 2]] }, 'INVALID_FORMAT'],
    [{ v: 1, o: [['a']] }, 'INVALID_FORMAT'],
    [{ v: 1, o: ['a'] }, 'INVALID_FORMAT'],
    [{ v: 1, l: 0 }, 'INVALID_PAGINATION'],
  ])('rejects %j', (json, code) => {
    expect(codeOf(() => Criteria.fromJSON(json))).toBe(code);
  });
});
