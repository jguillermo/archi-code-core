/**
 * Hostile values must never make a public function throw: validators return false, converters
 * return { ok: false }, canBe returns false. Only sanitizers may throw — and only their documented
 * TypeError for non-string input. Covers values where even `instanceof` / `Array.isArray` throw.
 */
import { describe, expect, it } from '@jest/globals';
import * as api from '../../src';

function hostileValues(): [string, unknown][] {
  const { proxy, revoke } = Proxy.revocable({ a: 1 }, {});
  revoke();
  const throwingGetter = Object.defineProperty({}, 'x', {
    enumerable: true,
    get: () => {
      throw new Error('getter');
    },
  });
  const throwingPrimitive = {
    toString: () => {
      throw new Error('toString');
    },
    valueOf: () => {
      throw new Error('valueOf');
    },
  };
  return [
    ['revoked proxy', proxy],
    ['throwing getter', throwingGetter],
    ['throwing toString/valueOf', throwingPrimitive],
  ];
}

const publicFunctions = Object.entries(api as unknown as Record<string, unknown>).filter(
  ([name, fn]) =>
    typeof fn === 'function' && name !== 'ValidationConfigError' && name !== 'createValidator',
) as [string, (...args: unknown[]) => unknown][];

describe('hostile values never make a public function throw', () => {
  it.each(hostileValues())('%s', (_label, value) => {
    const threw: string[] = [];
    for (const [name, fn] of publicFunctions) {
      const args = /Enum$/.test(name) ? [value, ['a']] : [value];
      try {
        fn(...args);
      } catch (e) {
        // Missing required configuration (e.g. isHash without an algorithm) is not the value's fault.
        if (!(e instanceof api.ValidationConfigError))
          threw.push(`${name}: ${(e as Error).message}`);
      }
    }
    expect(threw).toEqual([]);
  });

  it.each(hostileValues())('sanitizers only throw their TypeError (%s)', (_label, value) => {
    for (const fn of Object.values(api.sanitizer) as ((v: unknown) => unknown)[]) {
      try {
        fn(value);
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
        expect((e as Error).message).toMatch(/^Expected a string/);
      }
    }
  });
});
