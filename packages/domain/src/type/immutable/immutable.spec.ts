import { describe, expect, it } from '@jest/globals';
import { Immutable } from './immutable';
import { ImmutableDate } from './immutable-date';

describe('Immutable', () => {
  describe('freeze', () => {
    it('returns the same value', () => {
      const value = { a: 1 };
      expect(Immutable.freeze(value)).toBe(value);
    });

    it('freezes an object and everything inside it', () => {
      const value = { user: { name: 'Ana', tags: ['a', { kind: 'b' }] } };
      Immutable.freeze(value);
      expect(Object.isFrozen(value)).toBe(true);
      expect(Object.isFrozen(value.user)).toBe(true);
      expect(Object.isFrozen(value.user.tags)).toBe(true);
      expect(Object.isFrozen(value.user.tags[1])).toBe(true);
    });

    it('freezes an array and its items', () => {
      const value = [{ a: 1 }, [2]];
      Immutable.freeze(value);
      expect(Object.isFrozen(value)).toBe(true);
      expect(Object.isFrozen(value[0])).toBe(true);
      expect(Object.isFrozen(value[1])).toBe(true);
    });

    it('makes changes throw in strict mode', () => {
      const value = Immutable.freeze({ user: { name: 'Ana' } });
      expect(() => {
        value.user.name = 'Eva';
      }).toThrow(TypeError);
    });

    it('handles circular references', () => {
      const value: { self?: unknown } = {};
      value.self = value;
      expect(() => Immutable.freeze(value)).not.toThrow();
      expect(Object.isFrozen(value)).toBe(true);
    });

    it('stops at an already frozen value', () => {
      const inner = { a: 1 };
      const outer = Object.freeze({ inner });
      Immutable.freeze(outer);
      expect(Object.isFrozen(inner)).toBe(false);
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['a number', 1],
      ['a string', 'a'],
      ['a boolean', true],
    ])('returns %s as it is', (_, value) => {
      expect(Immutable.freeze(value)).toBe(value);
    });
  });

  describe('date', () => {
    it('returns an immutable copy of the given Date', () => {
      const source = new Date('2018-03-23T16:02:15.000Z');
      const date = Immutable.date(source);
      expect(date).toBeInstanceOf(ImmutableDate);
      expect(date).not.toBe(source);
      expect(date.toISOString()).toBe('2018-03-23T16:02:15.000Z');
      expect(() => date.setUTCFullYear(2020)).toThrow(TypeError);
    });
  });
});
