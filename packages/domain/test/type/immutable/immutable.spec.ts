import { describe, expect, it } from 'vitest';
import { Immutable } from '../../../src/type/immutable/immutable';
import { ImmutableDate } from '../../../src/type/immutable/immutable-date';

describe('Immutable', () => {
  describe('freeze', () => {
    it('returns the same object it receives, ready to be stored in a value object', () => {
      const address = { city: 'Huelva' };
      expect(Immutable.freeze(address)).toBe(address);
    });

    it('freezes a customer profile and everything nested in it', () => {
      const profile = { customer: { name: 'Ana', tags: ['vip', { since: 2020 }] } };
      Immutable.freeze(profile);
      expect(Object.isFrozen(profile)).toBe(true);
      expect(Object.isFrozen(profile.customer)).toBe(true);
      expect(Object.isFrozen(profile.customer.tags)).toBe(true);
      expect(Object.isFrozen(profile.customer.tags[1])).toBe(true);
    });

    it('freezes a list of order lines and each line', () => {
      const lines = [{ sku: 'A-1', quantity: 2 }, [3]];
      Immutable.freeze(lines);
      expect(Object.isFrozen(lines)).toBe(true);
      expect(Object.isFrozen(lines[0])).toBe(true);
      expect(Object.isFrozen(lines[1])).toBe(true);
    });

    it('makes an accidental change to a nested field throw', () => {
      const profile = Immutable.freeze({ customer: { name: 'Ana' } });
      expect(() => {
        profile.customer.name = 'Eva';
      }).toThrow(TypeError);
    });

    it('does not loop forever on a payload that references itself', () => {
      const node: { parent?: unknown } = {};
      node.parent = node;
      expect(() => Immutable.freeze(node)).not.toThrow();
      expect(Object.isFrozen(node)).toBe(true);
    });

    it('stops at an object that is already frozen', () => {
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
    it('turns a request date into an immutable copy', () => {
      const requested = new Date('2018-03-23T16:02:15.000Z');
      const date = Immutable.date(requested);
      expect(date).toBeInstanceOf(ImmutableDate);
      expect(date).not.toBe(requested);
      expect(date.toISOString()).toBe('2018-03-23T16:02:15.000Z');
      expect(() => date.setUTCFullYear(2020)).toThrow(TypeError);
    });
  });
});
