import { describe, expect, it } from '@jest/globals';
import { Criteria } from '../../src/criteria';
import { CriteriaError } from '../../src/criteria-error';
import { defineCriteriaSchema } from '../../src/criteria-schema';
import { UserPrimitives } from '../support/user';

const schema = defineCriteriaSchema<UserPrimitives>({
  fields: { id: 'string', name: 'string', age: 'number', createdAt: 'date', tags: 'string[]' },
  maxLimit: 100,
});

function urlOf(json: string): string {
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function nestedJson(levels: number): string {
  return `{"v":1,"f":${'["not",'.repeat(levels)}["eq","id","x"]${']'.repeat(levels)}}`;
}

function nestedWhere(levels: number): unknown {
  let where: unknown = { id: 'x' };
  for (let level = 0; level < levels; level += 1) {
    where = level % 2 === 0 ? { NOT: where } : { OR: [where] };
  }
  return where;
}

function thrownBy(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  return null;
}

function expectCriteriaError(action: () => unknown, code?: string): void {
  const error = thrownBy(action);
  expect(error).toBeInstanceOf(CriteriaError);
  if (code !== undefined) {
    expect((error as CriteriaError).code).toBe(code);
  }
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

const ATOMS: readonly unknown[] = [
  null,
  undefined,
  true,
  0,
  -1,
  1.5,
  Number.NaN,
  1e300,
  '',
  'x',
  'id',
  'age',
  'eq',
  'not',
  'and',
  'in',
  'bt',
  '__proto__',
  '$where',
  '2024-01-01',
  { d: 5 },
  { d: 1e20 },
];

function randomValue(random: () => number, depth: number): unknown {
  const pick = random();
  if (depth > 6 || pick < 0.4) {
    return ATOMS[Math.floor(random() * ATOMS.length)];
  }
  const size = Math.floor(random() * 4);
  if (pick < 0.7) {
    return Array.from({ length: size }, () => randomValue(random, depth + 1));
  }
  const keys = ['where', 'orderBy', 'limit', 'offset', 'id', 'age', 'AND', 'OR', 'NOT', 'in', 'gt'];
  return Object.fromEntries(
    Array.from({ length: size }, () => [
      keys[Math.floor(random() * keys.length)],
      randomValue(random, depth + 1),
    ]),
  );
}

describe('adversarial input', () => {
  it.each([3_000, 20_000])(
    'rejects %i nested NOT in a URL text without overflowing the stack',
    (levels) => {
      expectCriteriaError(() => schema.fromUrl(urlOf(nestedJson(levels))), 'LIMIT_EXCEEDED');
      expectCriteriaError(() => Criteria.fromUrl(urlOf(nestedJson(levels))), 'LIMIT_EXCEEDED');
      expectCriteriaError(
        () => Criteria.fromJSON(JSON.parse(nestedJson(levels))),
        'LIMIT_EXCEEDED',
      );
    },
  );

  it('rejects deep where objects from input and from code', () => {
    expectCriteriaError(() => schema.parse({ where: nestedWhere(5_000) }), 'LIMIT_EXCEEDED');
    expectCriteriaError(
      () => Criteria.create({ where: nestedWhere(5_000) as never }),
      'LIMIT_EXCEEDED',
    );
    expectCriteriaError(() => schema.parse({ where: nestedWhere(40) }), 'LIMIT_EXCEEDED');
    expect(Criteria.create({ where: nestedWhere(40) as never }).filter).not.toBeNull();
  });

  it('rejects huge lists, wide filters, long texts and long URLs', () => {
    const many = Array.from({ length: 1_000_000 }, (_, index) => `v${index}`);
    expectCriteriaError(() => schema.parse({ where: { id: { in: many } } }), 'LIMIT_EXCEEDED');
    const branches = Array.from({ length: 50_000 }, (_, index) => ({ id: `v${index}` }));
    expectCriteriaError(() => schema.parse({ where: { OR: branches } }), 'LIMIT_EXCEEDED');
    expectCriteriaError(() => schema.parse({ where: { name: { contains: 'a'.repeat(2_000) } } }));
    expectCriteriaError(() => schema.fromUrl('a'.repeat(1_000_000)), 'LIMIT_EXCEEDED');
  });

  it('keeps error messages short when the input is huge', () => {
    const error = thrownBy(() => schema.parse({ where: { ['a'.repeat(1_000_000)]: 'x' } }));
    expect(error).toBeInstanceOf(CriteriaError);
    expect((error as CriteriaError).message.length).toBeLessThan(200);
  });

  it('rejects unsafe pagination', () => {
    expectCriteriaError(() => schema.parse({ offset: '1000000000000000' }), 'LIMIT_EXCEEDED');
    expectCriteriaError(() => Criteria.create({ offset: 1e300 }), 'INVALID_PAGINATION');
    expectCriteriaError(() => Criteria.create().page(1e300, 10), 'INVALID_PAGINATION');
  });

  it('throws only CriteriaError for random input on every entry point', () => {
    const random = seededRandom(20_261_015);
    for (let round = 0; round < 2_000; round += 1) {
      const value = randomValue(random, 0);
      const json = { v: 1, f: value, o: randomValue(random, 4), l: randomValue(random, 6) };
      for (const action of [
        () => schema.parse(value),
        () => schema.parse({ where: value }),
        () => Criteria.fromJSON(value),
        () => Criteria.fromJSON(json),
        () => Criteria.fromJSON(json, schema),
        () => Criteria.create({ where: value as never }),
      ]) {
        const error = thrownBy(action);
        if (error !== null && !(error instanceof CriteriaError)) {
          throw new Error(`Round ${round} threw ${String(error)} for ${JSON.stringify(value)}`);
        }
      }
    }
  });
});
