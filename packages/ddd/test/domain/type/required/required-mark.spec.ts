import { describe, expect, expectTypeOf, it } from 'vitest';
import { RequiredMark } from '../../../../src/domain/type/required/required-mark';
import type { RequiredMarked, ValueOf } from '../../../../src/domain/type/required/required-mark';

describe('RequiredMark', () => {
  describe('the shared symbol', () => {
    it('comes from the global registry, so the CJS and ESM builds recognize each other', () => {
      expect(typeof RequiredMark.symbol).toBe('symbol');
      expect(RequiredMark.symbol).toBe(Symbol.for('@archi-code/ddd/required.v1'));
    });
  });

  describe('marking a value object class as required', () => {
    it('puts a read-only, hidden mark on its prototype', () => {
      class CustomerId {}
      RequiredMark.mark(CustomerId.prototype);

      expect(Object.getOwnPropertyDescriptor(CustomerId.prototype, RequiredMark.symbol)).toEqual({
        value: true,
        writable: false,
        enumerable: false,
        configurable: false,
      });
    });

    it('recognizes its instances and the instances of its subclasses', () => {
      class CustomerId {}
      RequiredMark.mark(CustomerId.prototype);
      class VipCustomerId extends CustomerId {}

      expect(RequiredMark.isMarked(new CustomerId())).toBe(true);
      expect(RequiredMark.isMarked(new VipCustomerId())).toBe(true);
    });

    it.each([
      ['an optional nickname', new (class Nickname {})()],
      ['an object faking the mark with another value', { [RequiredMark.symbol]: 'yes' }],
      ['an object with the symbol text as a plain key', { '@archi-code/ddd/required.v1': true }],
    ])('does not treat %s as required', (_, instance) => {
      expect(RequiredMark.isMarked(instance)).toBe(false);
    });
  });
});

describe('ValueOf', () => {
  it('a required value object holds T', () => {
    expectTypeOf<ValueOf<string, RequiredMarked>>().toEqualTypeOf<string>();
    expectTypeOf<ValueOf<number, { id: string } & RequiredMarked>>().toEqualTypeOf<number>();
  });

  it('an optional value object holds T | null', () => {
    expectTypeOf<ValueOf<string, object>>().toEqualTypeOf<string | null>();
    expectTypeOf<ValueOf<string, Partial<RequiredMarked>>>().toEqualTypeOf<string | null>();
  });
});
