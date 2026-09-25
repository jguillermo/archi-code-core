/**
 * Parity with upstream validator.js (the library this package was forked from).
 *
 * Every `samples/*.samples.ts` entry is executed twice with the SAME invocation (`run`):
 * once against this package and once against `validator@13.15.26` (the registry module is
 * swapped with jest.doMock). Any disagreement must be an intentional, documented divergence
 * listed in INTENTIONAL_DIVERGENCES — otherwise the test fails, flagging an accidental change.
 */
import { describe, expect, it, jest } from '@jest/globals';
import type { ValidatorSample } from '../validator/samples/types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const upstreamPkg = require('validator/package.json') as { version: string };

const UPSTREAM_VERSION = '13.15.26';

/**
 * name → inputs whose result intentionally differs from upstream, with the reason.
 * Keep this list small and justified; it documents behavioural differences of the fork.
 */
const INTENTIONAL_DIVERGENCES: Record<string, { inputs: unknown[]; reason: string }> = {
  isSlug: {
    inputs: ['has!special'],
    reason:
      'the fork restricts slugs to [a-z0-9_-]; upstream accepts any non-space char in the middle',
  },
};

function loadSamples(useUpstream: boolean): ValidatorSample[] {
  let result: ValidatorSample[] = [];
  jest.isolateModules(() => {
    if (useUpstream) {
      jest.doMock('../../src/validators', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const upstream = require('validator');
        return { __esModule: true, validator: upstream.default ?? upstream };
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    result = require('../validator/samples').samples as ValidatorSample[];
  });
  return result;
}

describe(`parity with validator.js ${UPSTREAM_VERSION}`, () => {
  it('compares against the expected upstream version', () => {
    expect(upstreamPkg.version).toBe(UPSTREAM_VERSION);
  });

  const ours = loadSamples(false);
  const theirs = new Map(loadSamples(true).map((s) => [s.name, s]));

  it.each(ours.map((s) => [s.name, s] as const))('%s', (name, sample) => {
    const upstream = theirs.get(name);
    if (upstream === undefined) throw new Error(`no upstream sample for ${name}`);
    const allowed = INTENTIONAL_DIVERGENCES[name]?.inputs ?? [];
    const diverging: string[] = [];
    for (const input of [...sample.valid, ...sample.invalid]) {
      let theirResult: unknown;
      try {
        theirResult = upstream.run(input);
      } catch {
        continue; // upstream throws on non-string input; our contract returns false instead
      }
      const ourResult = sample.run(input);
      if (ourResult !== theirResult && !allowed.includes(input)) {
        diverging.push(
          `${JSON.stringify(input)}: ours=${String(ourResult)} upstream=${String(theirResult)}`,
        );
      }
    }
    expect(diverging).toEqual([]);
  });
});
