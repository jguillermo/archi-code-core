import { expect } from '@jest/globals';
import type { Converted, ConvertMessage } from '../../../src/convert';

/** Asserts the conversion succeeded (`{ ok: true, value, error: null }`) and returns the converted value. */
export function converted<T>(result: Converted<T>): T {
  expect(result.ok).toBe(true);
  expect(result.error).toBeNull();
  return result.value as T;
}

/** Asserts the conversion failed with exactly `{ ok: false, value: null, error: message }`. */
export function expectNotConvertible(result: Converted<unknown>, message: ConvertMessage): void {
  expect(result).toEqual({ ok: false, value: null, error: message });
}
