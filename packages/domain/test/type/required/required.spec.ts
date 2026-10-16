import { describe, expect, expectTypeOf, it } from 'vitest';
import { Validations, runValidations } from '@archi-code/validation';
import { Required } from '../../../src/type/required/required';
import { RequiredMark } from '../../../src/type/required/required-mark';
import { AbstractType } from '../../../src/type/abstract-type';

class Amount extends AbstractType<number> {
  static zero(): Amount {
    return new Amount(0);
  }

  protected filter(value: number): number {
    return value;
  }
}

class RequiredAmount extends Required(Amount) {}

describe('Required', () => {
  describe('typing', () => {
    it('asks for T in the constructor and holds T', () => {
      expectTypeOf<ConstructorParameters<typeof RequiredAmount>>().toEqualTypeOf<[value: number]>();
      expectTypeOf<RequiredAmount['value']>().toEqualTypeOf<number>();
    });

    it('keeps the instance and static members of the wrapped type', () => {
      expectTypeOf<RequiredAmount>().toMatchTypeOf<Amount>();
      expectTypeOf(RequiredAmount.zero).toEqualTypeOf<() => Amount>();
    });

    it('does not change the wrapped type', () => {
      expectTypeOf<ConstructorParameters<typeof Amount>>().toEqualTypeOf<[value?: number | null]>();
      expectTypeOf<Amount['value']>().toEqualTypeOf<number | null>();
    });
  });

  describe('runtime', () => {
    it('returns a subclass of the wrapped type', () => {
      const amount = new RequiredAmount(1);
      expect(amount).toBeInstanceOf(RequiredAmount);
      expect(amount).toBeInstanceOf(Amount);
      expect(RequiredAmount.zero().value).toBe(0);
    });

    it('marks the subclass as required, and its own subclasses too', () => {
      class Child extends RequiredAmount {}

      expect(RequiredMark.isMarked(new RequiredAmount(1))).toBe(true);
      expect(RequiredMark.isMarked(new Child(1))).toBe(true);
    });

    it('declares the isRequired validation on the subclass, not on the wrapped type', () => {
      const requiredError = {
        validator: 'isRequired',
        message: 'Value does not satisfy isRequired',
      };
      expect(runValidations(RequiredAmount, null).errors).toEqual([requiredError]);
      expect(runValidations(Amount, null).ok).toBe(true);
    });

    it('fails only isRequired for null, without running the validations of the wrapped type', () => {
      @Validations([{ custom: 'positive', fn: (value) => typeof value === 'number' && value > 0 }])
      class Positive extends Amount {}
      class RequiredPositive extends Required(Positive) {}

      expect(runValidations(RequiredPositive, null).errors).toEqual([
        { validator: 'isRequired', message: 'Value does not satisfy isRequired' },
      ]);
      expect(runValidations(RequiredPositive, -1).errors).toEqual([
        { custom: 'positive', message: 'Value does not satisfy positive' },
      ]);
    });

    it('does not mark the wrapped type', () => {
      expect(RequiredMark.isMarked(new Amount(1))).toBe(false);
    });

    it('creates a new class on each call', () => {
      expect(Required(Amount)).not.toBe(Required(Amount));
    });

    it('puts the mark on the prototype as a read-only, hidden property', () => {
      const descriptor = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(RequiredAmount.prototype),
        RequiredMark.symbol,
      );

      expect(descriptor).toEqual({
        value: true,
        writable: false,
        enumerable: false,
        configurable: false,
      });
      expect(Object.keys(new RequiredAmount(1))).not.toContain(RequiredMark.symbol);
      expect(JSON.stringify(new RequiredAmount(1))).not.toContain('required');
    });
  });
});
