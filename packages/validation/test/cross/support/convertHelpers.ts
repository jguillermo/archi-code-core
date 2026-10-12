import { expect } from '@jest/globals';
import type { Converted, ConvertMessage } from '../../../src/convert';

export function converted<T>(result: Converted<T>): T {
  expect(result.ok).toBe(true);
  expect(result.error).toBeNull();
  return result.value as T;
}

export function expectNotConvertible(result: Converted<unknown>, message: ConvertMessage): void {
  expect(result).toEqual({ ok: false, value: null, error: message });
}
