/**
 * Property: for every type X and ANY input v
 *   toX(v) never throws and always returns { ok, value, error }: { ok: true, value, error: null } or
 *   { ok: false, value: null, error }, where `error`
 *   is one of the FIXED ConvertMessages of that type (integer overflow has its own message)
 *   canBeX(v) === toX(v).ok
 *   when ok, the converted value is itself convertible (round trip)
 *
 * Uses a seeded PRNG (no extra dependencies) so failures are reproducible: the seed and the
 * offending input are printed in the assertion message.
 */
import { describe, expect, it } from '@jest/globals';
import type { Converted, ConvertMessage } from '../../src/convert';
import {
  canBeArray,
  canBeBoolean,
  canBeDate,
  canBeEnum,
  canBeFloat,
  canBeInteger,
  canBeJson,
  canBeString,
} from '../../src/canBe';
import {
  toArray,
  toBoolean,
  toDate,
  toEnum,
  toFloat,
  toInteger,
  toJson,
  toString,
  ConvertMessages,
} from '../../src/convert';

// mulberry32 — tiny deterministic PRNG
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 20260925;
const RUNS = 4000;
const ENUM_OPTIONS = ['red', 'green', '1', '0', 'true', ''] as const;

// Building blocks chosen to hit the interesting edges of every rule.
const FRAGMENTS = [
  '0',
  '1',
  '9',
  '-',
  '+',
  '.',
  'e',
  'E',
  'x',
  'b',
  'o',
  ' ',
  '\t',
  ',',
  'T',
  ':',
  'Z',
  '{',
  '}',
  '[',
  ']',
  '"',
  'a',
  'true',
  'false',
  'null',
  'Infinity',
  'NaN',
  '2024',
  '-02-',
  '29',
  '30',
  '12',
  '23:59:60',
];
const LITERALS: unknown[] = [
  '',
  ' ',
  '0x10',
  '0b101',
  '0o7',
  '1e400',
  '9007199254740993',
  '-9007199254740991',
  '2024-02-29',
  '2023-02-29',
  '2024-01-01T10:00:00',
  '2024-01-01T10:00:00+02:00',
  '2024-01-01 23:59:59.999Z',
  '{"a":1}',
  '{}',
  '[1,2]',
  '[]',
  'red',
  0,
  -0,
  1,
  2,
  1.5,
  -1e-7,
  1e21,
  Number.MAX_SAFE_INTEGER,
  Number.MAX_SAFE_INTEGER + 2,
  NaN,
  Infinity,
  true,
  false,
  null,
  undefined,
  {},
  { a: 1 },
  [],
  [1],
  new Date(0),
  new Date('invalid'),
  Symbol('s'),
  BigInt(1),
  () => 1,
  new Map(),
];

function randomValue(rand: () => number): unknown {
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
  const roll = rand();
  if (roll < 0.3) return pick(LITERALS);
  if (roll < 0.75) {
    let s = '';
    const n = 1 + Math.floor(rand() * 6);
    for (let i = 0; i < n; i++) s += pick(FRAGMENTS);
    return s;
  }
  if (roll < 0.9) {
    const kind = rand();
    if (kind < 0.4) return Math.floor((rand() - 0.5) * 2 ** Math.floor(rand() * 60));
    if (kind < 0.8) return (rand() - 0.5) * 10 ** Math.floor(rand() * 10);
    return pick([0, 1, -1, 0.1, 1e308, -Number.MIN_VALUE]);
  }
  return pick([true, false, null, undefined, {}, { k: 'v' }, [], ['x'], new Date(rand() * 4e12)]);
}

interface Pair {
  name: string;
  canBe: (v: unknown) => boolean;
  to: (v: unknown) => Converted<unknown>;
  messages: ConvertMessage[];
}

const PAIRS: Pair[] = [
  { name: 'string', canBe: canBeString, to: toString, messages: [ConvertMessages.STRING] },
  {
    name: 'integer',
    canBe: canBeInteger,
    to: toInteger,
    messages: [ConvertMessages.INTEGER, ConvertMessages.INTEGER_OVERFLOW],
  },
  { name: 'float', canBe: canBeFloat, to: toFloat, messages: [ConvertMessages.FLOAT] },
  { name: 'boolean', canBe: canBeBoolean, to: toBoolean, messages: [ConvertMessages.BOOLEAN] },
  { name: 'date', canBe: canBeDate, to: toDate, messages: [ConvertMessages.DATE] },
  { name: 'json', canBe: canBeJson, to: toJson, messages: [ConvertMessages.JSON] },
  { name: 'array', canBe: canBeArray, to: toArray, messages: [ConvertMessages.ARRAY] },
  {
    name: 'enum',
    canBe: (v) => canBeEnum(v, ENUM_OPTIONS),
    to: (v) => toEnum(v, ENUM_OPTIONS),
    messages: [ConvertMessages.ENUM],
  },
];

const show = (v: unknown): string => {
  try {
    return typeof v === 'bigint'
      ? `${v}n`
      : typeof v === 'symbol'
        ? v.toString()
        : (JSON.stringify(v) ?? String(v));
  } catch {
    return String(v);
  }
};

describe('property: canBeX(v) === toX(v).ok; failures are { ok: false, value: null, fixed error }', () => {
  const rand = prng(SEED);
  const inputs = [...LITERALS, ...Array.from({ length: RUNS }, () => randomValue(rand))];

  it.each(PAIRS.map((p) => [p.name, p] as const))('%s', (_name, pair) => {
    for (const v of inputs) {
      const context = `seed=${SEED} type=${pair.name} input=${show(v)}`;
      let result: Converted<unknown> | undefined;
      let error: unknown;
      try {
        result = pair.to(v);
      } catch (e) {
        error = e;
      }
      // converters never throw
      expect({ context, error }).toEqual({ context, error: undefined });
      const r = result as Converted<unknown>;
      // always exactly the three keys
      expect({ context, keys: Object.keys(r).sort() }).toEqual({
        context,
        keys: ['error', 'ok', 'value'],
      });
      // canBe is exactly the first value of the converter
      expect({ context, canBe: pair.canBe(v) }).toEqual({ context, canBe: r.ok });
      if (r.ok) {
        expect({ context, error: r.error }).toEqual({ context, error: null });
        // Round trip: the converted value is itself convertible to the same type.
        expect({ context, roundTrip: pair.canBe(r.value) }).toEqual({ context, roundTrip: true });
      } else {
        expect({ context, value: r.value, known: pair.messages.includes(r.error) }).toEqual({
          context,
          value: null,
          known: true,
        });
      }
    }
  });

  it('integer results are always safe integers; float results always finite', () => {
    for (const v of inputs) {
      if (canBeInteger(v)) expect(Number.isSafeInteger(toInteger(v).value)).toBe(true);
      if (canBeFloat(v)) expect(Number.isFinite(toFloat(v).value)).toBe(true);
    }
  });

  it('enum results are always one of the options', () => {
    for (const v of inputs) {
      if (canBeEnum(v, ENUM_OPTIONS)) expect(ENUM_OPTIONS).toContain(toEnum(v, ENUM_OPTIONS).value);
    }
  });

  it('integer overflow inputs are generated and reported with their own fixed message', () => {
    const overflow = inputs.filter((v) => {
      const r = toInteger(v);
      return !r.ok && r.error === ConvertMessages.INTEGER_OVERFLOW;
    });
    expect(overflow.length).toBeGreaterThan(0);
  });
});
