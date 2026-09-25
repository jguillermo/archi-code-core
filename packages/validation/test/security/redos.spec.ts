/**
 * ReDoS regression guard: every validator must answer adversarial 30k-character inputs within
 * a per-call time budget. The budget is generous (CI machines vary); a catastrophic-backtracking
 * regex takes seconds or minutes on these inputs, so the signal is unambiguous.
 */
import { describe, expect, it } from '@jest/globals';
import { validator } from '../../src/validators';

const N = 30_000;
const BUDGET_MS = 150;

const PAYLOADS: Record<string, string> = {
  letters: `${'a'.repeat(N)}!`,
  digits: `${'1'.repeat(N)}x`,
  dashes: `${'a-'.repeat(N / 2)}!`,
  dots: `${'a.'.repeat(N / 2)}@`,
  spaces: `${' '.repeat(N)}x`,
  ats: 'a@'.repeat(N / 2),
  colons: `${':'.repeat(N)}x`,
  urlPath: `http://${'a/'.repeat(N / 2)}`,
  percent: '%'.repeat(N),
  equals: `${'='.repeat(N)}!`,
  plus: `${'+'.repeat(N)}x`,
  hex: `${'f'.repeat(N)}g`,
  backslashes: `"${'\\'.repeat(N)}`,
  angle: `${'a'.repeat(N)}<`,
  semicolons: 'a;'.repeat(N / 2),
  displayName: `${'a'.repeat(N)}<`,
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

describe(`ReDoS guard (${N} chars, ≤ ${BUDGET_MS} ms per call)`, () => {
  it.each(fns.map(([name, fn]) => [name, fn] as const))('%s', (name, fn) => {
    const slow: string[] = [];
    for (const [payloadName, payload] of Object.entries(PAYLOADS)) {
      const t0 = performance.now();
      fn(payload, ...(CONFIG_ARGS[name] ?? []));
      const ms = performance.now() - t0;
      if (ms > BUDGET_MS) slow.push(`${payloadName}: ${ms.toFixed(0)} ms`);
    }
    expect(slow).toEqual([]);
  });

  it('isEmail display-name path', () => {
    const t0 = performance.now();
    validator.isEmail(PAYLOADS.displayName, { allow_display_name: true });
    expect(performance.now() - t0).toBeLessThan(BUDGET_MS);
  });
});
