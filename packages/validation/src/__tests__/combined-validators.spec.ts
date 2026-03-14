import { describe, expect, it } from '@jest/globals';
import { valid, invalid, check } from './helpers';

describe('combining multiple validators on one field', () => {
  describe('string combinations', () => {
    it('required + email', () => {
      valid('user@example.com', 'isNotEmpty', 'isEmail');
      invalid('', 'isNotEmpty', 'isEmail');
    });

    it('required + alphanumeric + length range', () => {
      valid('user123', 'isNotEmpty', 'isAlphanumeric', ['isLengthBetween', 3, 20]);
      invalid('', 'isNotEmpty', 'isAlphanumeric', ['isLengthBetween', 3, 20]);
      invalid('u!', 'isNotEmpty', 'isAlphanumeric', ['isLengthBetween', 3, 20]);
    });

    it('slug + max length', () => {
      valid('my-post', 'isSlug', ['isMaxLength', 50]);
      invalid('My Post!', 'isSlug', ['isMaxLength', 50]);
    });

    it('lowercase + min length', () => {
      valid('hello', 'isLowercase', ['isMinLength', 3]);
      invalid('Hi', 'isLowercase', ['isMinLength', 3]);
    });
  });

  describe('number combinations', () => {
    it('integer + range', () => {
      valid(25, 'isPositiveInteger', ['isInRange', 1, 120]);
      invalid(-5, 'isPositiveInteger', ['isInRange', 1, 120]);
      invalid(0, 'isPositiveInteger', ['isInRange', 1, 120]);
      invalid(200, 'isPositiveInteger', ['isInRange', 1, 120]);
    });

    it('positive + max value', () => {
      valid(10, 'isPositiveNumber', ['isMaxValue', 100]);
      invalid(-1, 'isPositiveNumber', ['isMaxValue', 100]);
      invalid(200, 'isPositiveNumber', ['isMaxValue', 100]);
    });

    it('float + range', () => {
      valid('3.14', 'isFloat', ['isInRange', 0, 10]);
      invalid('abc', 'isFloat', ['isInRange', 0, 10]);
    });
  });

  describe('URL combinations', () => {
    it('valid URL + https scheme required', () => {
      valid('https://example.com', 'isUrl', ['isUrlWithScheme', 'https']);
      invalid('http://example.com', 'isUrl', ['isUrlWithScheme', 'https']);
      invalid('not-a-url', 'isUrl', ['isUrlWithScheme', 'https']);
    });
  });

  describe('password-like combinations (without lookaheads)', () => {
    it('min length + contains uppercase + contains digit', () => {
      valid(
        'Passw0rd',
        ['isMinLength', 8],
        ['isMatchesRegex', '[A-Z]'],
        ['isMatchesRegex', '[0-9]'],
      );
      invalid('password', ['isMinLength', 8], ['isMatchesRegex', '[A-Z]']);
      invalid('SHORT1A', ['isMinLength', 8]);
    });
  });

  describe('accumulates all errors, not just first', () => {
    it('reports all failing rules', () => {
      const errors = check('', 'isNotEmpty', ['isMinLength', 5], 'isAlpha', 'isEmail');
      expect(errors.length).toBe(4);
    });

    it('only reports failing rules, not passing ones', () => {
      const errors = check('ab', 'isNotEmpty', ['isMinLength', 5], ['isMaxLength', 10]);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe(1); // isMinLength = code 1
    });
  });
});
