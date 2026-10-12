import { describe, expect, it } from '@jest/globals';
import { TypeValidation } from '../../../src/type/validation/type-validation';

describe('TypeValidation', () => {
  describe('nullIsValid', () => {
    it('is ok with a null value and no errors', () => {
      expect(TypeValidation.nullIsValid).toEqual({ ok: true, value: null, errors: [] });
    });

    it('is frozen, errors included', () => {
      expect(Object.isFrozen(TypeValidation.nullIsValid)).toBe(true);
      expect(Object.isFrozen(TypeValidation.nullIsValid.errors)).toBe(true);
    });
  });
});
