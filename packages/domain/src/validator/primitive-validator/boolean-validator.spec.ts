import { describe, expect, it } from '@jest/globals';
import { canByType, excludeItems, PrimitivesKeys, skipByType } from '@code-core/test';
import { BooleanValidator } from './boolean.validator';

describe('BooleanValidator', () => {
  describe('canBeBoolean', () => {
    it.each(canByType(PrimitivesKeys.BOOLEAN).map((v) => [v]))('returns true for %p', (value) => {
      expect(BooleanValidator.canBeBoolean(value)).toBe(true);
    });

    it.each([...excludeItems(skipByType(PrimitivesKeys.BOOLEAN), [1, 0]), {}].map((v) => [v]))(
      'returns false for %p',
      (value) => {
        expect(BooleanValidator.canBeBoolean(value)).toBe(false);
      },
    );
  });
});
