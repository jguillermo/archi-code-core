import { describe, expect, it } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { REQUIRED, isRequiredInstance } from './required-mark';
import type { RequiredMark, ValueOf } from './required-mark';

describe('REQUIRED', () => {
  it('is the symbol shared through the global registry', () => {
    expect(typeof REQUIRED).toBe('symbol');
    expect(REQUIRED).toBe(Symbol.for('@archi-code/domain/required.v1'));
  });
});

describe('ValueOf', () => {
  it('is T for a type with the required mark', () => {
    expectTypeOf<ValueOf<string, RequiredMark>>().toEqualTypeOf<string>();
    expectTypeOf<ValueOf<number, { id: string } & RequiredMark>>().toEqualTypeOf<number>();
  });

  it('is T | null for a type without it', () => {
    expectTypeOf<ValueOf<string, object>>().toEqualTypeOf<string | null>();
    expectTypeOf<ValueOf<string, Partial<RequiredMark>>>().toEqualTypeOf<string | null>();
  });
});

describe('isRequiredInstance', () => {
  it('is true for an instance whose prototype has the mark', () => {
    class Marked {}
    Object.defineProperty(Marked.prototype, REQUIRED, { value: true });

    expect(isRequiredInstance(new Marked())).toBe(true);
  });

  it('is true for an instance of a subclass of a marked class', () => {
    class Marked {}
    Object.defineProperty(Marked.prototype, REQUIRED, { value: true });
    class Child extends Marked {}

    expect(isRequiredInstance(new Child())).toBe(true);
  });

  it.each([
    ['an instance without the mark', new (class Plain {})()],
    ['a mark with another value', { [REQUIRED]: 'yes' }],
    ['a property with the same text but no symbol', { '@archi-code/domain/required.v1': true }],
  ])('is false for %s', (_, instance) => {
    expect(isRequiredInstance(instance)).toBe(false);
  });
});
