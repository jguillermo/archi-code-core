import { describe, expect, it, jest } from '@jest/globals';
import type { ValidationResult } from '@archi-code/validation';
import { TypeValidation } from './type-validation';

function validationOf<T>(isValid: (value: T) => boolean) {
  const validateValue = jest.fn(
    (value: T): ValidationResult<T> =>
      isValid(value)
        ? { ok: true, value, errors: [] }
        : {
            ok: false,
            value,
            errors: [{ custom: 'rule', message: 'Value does not satisfy rule' }],
          },
  );
  return { validation: new TypeValidation<T>(validateValue), validateValue };
}

const isPositive = (value: number) => value > 0;

describe('TypeValidation', () => {
  describe('a value', () => {
    it('returns the result of validateValue for that value', () => {
      const { validation, validateValue } = validationOf(isPositive);
      expect(validation.of(1)).toEqual({ ok: true, value: 1, errors: [] });
      expect(validation.of(-1)).toEqual({
        ok: false,
        value: -1,
        errors: [{ custom: 'rule', message: 'Value does not satisfy rule' }],
      });
      expect(validateValue).toHaveBeenNthCalledWith(1, 1);
      expect(validateValue).toHaveBeenNthCalledWith(2, -1);
    });

    it('does not validate until asked', () => {
      const { validateValue } = validationOf(isPositive);
      expect(validateValue).not.toHaveBeenCalled();
    });
  });

  describe('null', () => {
    it('is valid without calling validateValue', () => {
      const { validation, validateValue } = validationOf(isPositive);
      expect(validation.of(null)).toEqual({ ok: true, value: null, errors: [] });
      expect(validateValue).not.toHaveBeenCalled();
    });

    it('its result is frozen', () => {
      const { validation } = validationOf(isPositive);
      const result = validation.of(null);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.errors)).toBe(true);
    });
  });

  describe('reuse of the last result', () => {
    it('returns the same result while the value is the same', () => {
      const { validation, validateValue } = validationOf(isPositive);
      const result = validation.of(1);
      expect(validation.of(1)).toBe(result);
      expect(validateValue).toHaveBeenCalledTimes(1);
    });

    it('reuses the result of null too', () => {
      const { validation } = validationOf(isPositive);
      expect(validation.of(null)).toBe(validation.of(null));
    });

    it('validates again when the value changes, even back to a previous one', () => {
      const { validation, validateValue } = validationOf(isPositive);
      const withOne = validation.of(1);
      validation.of(-1);
      const withOneAgain = validation.of(1);
      expect(withOneAgain).not.toBe(withOne);
      expect(withOneAgain).toEqual(withOne);
      expect(validateValue).toHaveBeenCalledTimes(3);
    });

    it('validates again after going through null', () => {
      const { validation, validateValue } = validationOf(isPositive);
      validation.of(1);
      validation.of(null);
      validation.of(1);
      expect(validateValue).toHaveBeenCalledTimes(2);
    });

    it('compares by identity: NaN is the same value, -0 and 0 are not, nor two equal arrays', () => {
      const { validation: numbers, validateValue: validateNumber } = validationOf(isPositive);
      expect(numbers.of(NaN)).toBe(numbers.of(NaN));
      expect(numbers.of(0)).not.toBe(numbers.of(-0));
      expect(validateNumber).toHaveBeenCalledTimes(3);

      const { validation: lists } = validationOf((value: number[]) => value.length > 0);
      expect(lists.of([1])).not.toBe(lists.of([1]));
    });

    it('keeps the last result per instance', () => {
      const first = validationOf(isPositive).validation;
      const second = validationOf(isPositive).validation;
      expect(first.of(1)).not.toBe(second.of(1));
    });
  });
});
