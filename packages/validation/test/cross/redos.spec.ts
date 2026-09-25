/**
 * ReDoS regression guard: every validator must scale LINEARLY on adversarial inputs (10k → 40k
 * characters). The check measures growth, not absolute time, so it does not depend on the machine
 * (see support/timing.ts); quadratic regexes and catastrophic backtracking both fail it.
 */
import { describe, expect, it } from '@jest/globals';
import { validator } from '../../src/validators';
import * as sanitizer from '../../src/sanitizer';
import { describeGrowth, isLinear, measureGrowth } from './support/timing';

const N = 10_000;

const PAYLOADS: Record<string, (n: number) => string> = {
  letters: (n) => `${'a'.repeat(n)}!`,
  digits: (n) => `${'1'.repeat(n)}x`,
  dashes: (n) => `${'a-'.repeat(n / 2)}!`,
  dots: (n) => `${'a.'.repeat(n / 2)}@`,
  spaces: (n) => `${' '.repeat(n)}x`,
  ats: (n) => 'a@'.repeat(n / 2),
  colons: (n) => `${':'.repeat(n)}x`,
  urlPath: (n) => `http://${'a/'.repeat(n / 2)}`,
  percent: (n) => '%'.repeat(n),
  equals: (n) => `${'='.repeat(n)}!`,
  plus: (n) => `${'+'.repeat(n)}x`,
  hex: (n) => `${'f'.repeat(n)}g`,
  backslashes: (n) => `"${'\\'.repeat(n)}`,
  angle: (n) => `${'a'.repeat(n)}<`,
  semicolons: (n) => 'a;'.repeat(n / 2),
  displayName: (n) => `${'a'.repeat(n)}<`,
};

const CONFIG_ARGS: Record<string, unknown[]> = {
  equals: ['a'],
  contains: ['a'],
  matches: [/a/],
  isHash: ['sha1'],
  isIn: [['a']],
  isWhitelisted: ['abc'],
  isDivisibleBy: [2],
  isMobilePhone: ['any'],
  isPostalCode: ['any'],
  isLicensePlate: ['any'],
  isVAT: ['GB'],
  isPassportNumber: ['US'],
};

const fns = Object.entries(validator).filter(([, fn]) => typeof fn === 'function') as [
  string,
  (...a: unknown[]) => unknown,
][];

describe(`ReDoS guard (linear growth, ${N} → ${N * 4} chars)`, () => {
  it.each(fns.map(([name, fn]) => [name, fn] as const))('%s', (name, fn) => {
    const nonLinear: string[] = [];
    for (const [payloadName, payload] of Object.entries(PAYLOADS)) {
      const inputs = new Map<number, string>();
      const growth = measureGrowth((n) => {
        let input = inputs.get(n);
        if (input === undefined) inputs.set(n, (input = payload(n)));
        fn(input, ...(CONFIG_ARGS[name] ?? []));
      }, N);
      if (!isLinear(growth)) nonLinear.push(`${payloadName}: ${describeGrowth(growth)}`);
    }
    expect(nonLinear).toEqual([]);
  });

  it('isEmail display-name path', () => {
    const growth = measureGrowth(
      (n) => validator.isEmail(PAYLOADS.displayName(n), { allow_display_name: true }),
      N,
    );
    expect(isLinear(growth) || describeGrowth(growth)).toBe(true);
  });
});

// Sanitizers too: the quadratic `rtrim` regex (fixed 2026-09-25) slipped past a validators-only guard.
const SANITIZER_ARGS: Record<string, unknown[][]> = {
  ltrim: [[], ['a'], ['a-']],
  rtrim: [[], ['a'], ['a-']],
  trim: [[], ['a'], ['a-']],
  blacklist: [['a'], ['a-.']],
  whitelist: [['a'], ['a-.']],
  escape: [[]],
  unescape: [[]],
  stripLow: [[], [true]],
  normalizeEmail: [[]],
};

describe(`ReDoS guard for sanitizers (linear growth, ${N} → ${N * 4} chars)`, () => {
  it.each(Object.entries(SANITIZER_ARGS))('%s', (name, argSets) => {
    const fn = (sanitizer as unknown as Record<string, (...a: unknown[]) => unknown>)[name];
    const nonLinear: string[] = [];
    for (const args of argSets) {
      for (const [payloadName, payload] of Object.entries(PAYLOADS)) {
        const inputs = new Map<number, string>();
        const growth = measureGrowth((n) => {
          let input = inputs.get(n);
          if (input === undefined) inputs.set(n, (input = payload(n)));
          fn(input, ...args);
        }, N);
        if (!isLinear(growth))
          nonLinear.push(`${payloadName} ${JSON.stringify(args)}: ${describeGrowth(growth)}`);
      }
    }
    expect(nonLinear).toEqual([]);
  });

  it('every sanitizer is covered', () => {
    expect(Object.keys(sanitizer).sort()).toEqual(Object.keys(SANITIZER_ARGS).sort());
  });
});
