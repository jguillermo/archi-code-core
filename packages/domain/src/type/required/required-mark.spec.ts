import { describe, expect, it } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { RequiredMark } from './required-mark';
import type { RequiredMarked, ValueOf } from './required-mark';

describe('RequiredMark', () => {
  describe('symbol', () => {
    it('is the symbol shared through the global registry', () => {
      expect(typeof RequiredMark.symbol).toBe('symbol');
      expect(RequiredMark.symbol).toBe(Symbol.for('@archi-code/domain/required.v1'));
    });
  });

  describe('mark', () => {
    it('puts the mark on the prototype as a read-only, hidden property', () => {
      class Marked {}
      RequiredMark.mark(Marked.prototype);

      expect(Object.getOwnPropertyDescriptor(Marked.prototype, RequiredMark.symbol)).toEqual({
        value: true,
        writable: false,
        enumerable: false,
        configurable: false,
      });
    });
  });

  describe('isMarked', () => {
    it('is true for an instance whose prototype has the mark', () => {
      class Marked {}
      RequiredMark.mark(Marked.prototype);

      expect(RequiredMark.isMarked(new Marked())).toBe(true);
    });

    it('is true for an instance of a subclass of a marked class', () => {
      class Marked {}
      RequiredMark.mark(Marked.prototype);
      class Child extends Marked {}

      expect(RequiredMark.isMarked(new Child())).toBe(true);
    });

    it.each([
      ['an instance without the mark', new (class Plain {})()],
      ['a mark with another value', { [RequiredMark.symbol]: 'yes' }],
      ['a property with the same text but no symbol', { '@archi-code/domain/required.v1': true }],
    ])('is false for %s', (_, instance) => {
      expect(RequiredMark.isMarked(instance)).toBe(false);
    });
  });
});

describe('ValueOf', () => {
  it('is T for a type with the required mark', () => {
    expectTypeOf<ValueOf<string, RequiredMarked>>().toEqualTypeOf<string>();
    expectTypeOf<ValueOf<number, { id: string } & RequiredMarked>>().toEqualTypeOf<number>();
  });

  it('is T | null for a type without it', () => {
    expectTypeOf<ValueOf<string, object>>().toEqualTypeOf<string | null>();
    expectTypeOf<ValueOf<string, Partial<RequiredMarked>>>().toEqualTypeOf<string | null>();
  });
});
