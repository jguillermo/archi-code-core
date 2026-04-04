import { describe, expect, it } from '@jest/globals';
import { canBeEnum } from '../../primitives';

const COLORS = ['red', 'green', 'blue'];

describe('canBeEnum', () => {
  describe('string input', () => {
    it.each([['red'], ['green'], ['blue']])('returns true for "%s" in colors', (value) => {
      expect(canBeEnum(value, COLORS)).toBe(true);
    });

    it.each([['yellow'], ['RED'], [''], ['red '], ['RED ']])(
      'returns false for "%s" in colors',
      (value) => {
        expect(canBeEnum(value, COLORS)).toBe(false);
      },
    );
  });

  describe('number input (converted to string)', () => {
    it('returns true when number matches a string option', () =>
      expect(canBeEnum(1, ['1', '2', '3'])).toBe(true));
    it('returns false when number is not in options', () =>
      expect(canBeEnum(4, ['1', '2', '3'])).toBe(false));
  });

  describe('boolean input (converted to string)', () => {
    it('returns true for true in ["true","false"]', () =>
      expect(canBeEnum(true, ['true', 'false'])).toBe(true));
    it('returns true for false in ["true","false"]', () =>
      expect(canBeEnum(false, ['true', 'false'])).toBe(true));
    it('returns false for true when not in options', () =>
      expect(canBeEnum(true, COLORS)).toBe(false));
  });

  describe('non-convertible types', () => {
    it.each([[null], [undefined], [{}], [[]], [new Date()], [Symbol('x')]])(
      'returns false for %p',
      (value) => expect(canBeEnum(value, COLORS)).toBe(false),
    );
  });

  describe('empty options list', () => {
    it('returns false for any value', () => expect(canBeEnum('red', [])).toBe(false));
  });

  describe('case-sensitive matching', () => {
    it('returns false for wrong case', () => expect(canBeEnum('RED', COLORS)).toBe(false));
    it('returns false for value with trailing space', () =>
      expect(canBeEnum('red ', COLORS)).toBe(false));
  });
});
