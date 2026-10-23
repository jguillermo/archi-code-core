import { describe, expect, expectTypeOf, it } from 'vitest';
import { Validations, runValidations } from '@archi-code/validation';
import { Required } from '../../../../src/domain/type/required/required-type';
import { RequiredMark } from '../../../../src/domain/type/required/required-mark';
import { AbstractType } from '../../../../src/domain/type/abstract-type';
import { RequiredValueException } from '../../../../src/domain/exceptions/required-value.exception';

class AmountInCents extends AbstractType<number> {
  static zero(): AmountInCents {
    return new AmountInCents(0);
  }

  protected filter(value: number): number {
    return value;
  }
}

class InvoiceTotal extends Required(AmountInCents) {}

const isRequiredError = { validator: 'isRequired', message: 'Value does not satisfy isRequired' };

describe('Required', () => {
  describe('built inline from plain JavaScript, without a class of its own', () => {
    it('names the type it requires in its messages', () => {
      const RequiredAmount = Required(AmountInCents) as unknown as new (value: unknown) => object;
      expect(RequiredAmount.name).toBe('Required(AmountInCents)');
      expect(() => new RequiredAmount(null)).toThrow(
        'Validation Error: Required(AmountInCents) is required, but received null.',
      );
    });
  });

  describe('turning an optional amount into a required invoice total', () => {
    it('asks for a number in the constructor and holds a number', () => {
      expectTypeOf<ConstructorParameters<typeof InvoiceTotal>>().toEqualTypeOf<[value: number]>();
      expectTypeOf<InvoiceTotal['value']>().toEqualTypeOf<number>();
    });

    it('keeps the members of the optional amount, its static factories included', () => {
      expectTypeOf<InvoiceTotal>().toMatchTypeOf<AmountInCents>();
      expectTypeOf(InvoiceTotal.zero).toEqualTypeOf<() => AmountInCents>();
      expect(InvoiceTotal.zero().value).toBe(0);
    });

    it('leaves the optional amount optional', () => {
      expectTypeOf<ConstructorParameters<typeof AmountInCents>>().toEqualTypeOf<
        [value?: number | null]
      >();
      expectTypeOf<AmountInCents['value']>().toEqualTypeOf<number | null>();
      expect(new AmountInCents().value).toBeNull();
      expect(runValidations(AmountInCents, null).ok).toBe(true);
    });

    it('an invoice total is still an amount for code that expects one', () => {
      const total = new InvoiceTotal(1500);
      expect(total).toBeInstanceOf(InvoiceTotal);
      expect(total).toBeInstanceOf(AmountInCents);
    });

    it('throws RequiredValueException naming the invoice total when the amount is missing', () => {
      expect(() => new InvoiceTotal(null as unknown as number)).toThrow(RequiredValueException);
      expect(() => new InvoiceTotal(null as unknown as number)).toThrow(
        'Validation Error: InvoiceTotal is required, but received null.',
      );
    });
  });

  describe('a more specific total built on a required one', () => {
    it('is required too, both in its type and when built', () => {
      class TaxedInvoiceTotal extends InvoiceTotal {}

      expectTypeOf<ConstructorParameters<typeof TaxedInvoiceTotal>>().toEqualTypeOf<
        [value: number]
      >();
      expect(RequiredMark.isMarked(new TaxedInvoiceTotal(1))).toBe(true);
      expect(() => new TaxedInvoiceTotal(null as unknown as number)).toThrow(
        'Validation Error: TaxedInvoiceTotal is required, but received null.',
      );
    });
  });

  describe('the isRequired validation', () => {
    it('is declared on the required class, not on the optional one', () => {
      expect(runValidations(InvoiceTotal, null).errors).toEqual([isRequiredError]);
      expect(runValidations(AmountInCents, null).ok).toBe(true);
      expect(RequiredMark.isMarked(new InvoiceTotal(1))).toBe(true);
      expect(RequiredMark.isMarked(new AmountInCents(1))).toBe(false);
    });

    it('reports only isRequired for a missing value, and the amount rules for a present one', () => {
      @Validations([{ custom: 'positive', fn: (value) => typeof value === 'number' && value > 0 }])
      class PositiveAmount extends AmountInCents {}
      class PaymentAmount extends Required(PositiveAmount) {}

      expect(runValidations(PaymentAmount, null).errors).toEqual([isRequiredError]);
      expect(runValidations(PaymentAmount, -1).errors).toEqual([
        { custom: 'positive', message: 'Value does not satisfy positive' },
      ]);
    });
  });

  describe('each call', () => {
    it('creates a new class, so two required totals do not share state', () => {
      expect(Required(AmountInCents)).not.toBe(Required(AmountInCents));
    });

    it('hides the mark: it is read-only and not enumerable', () => {
      const descriptor = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(InvoiceTotal.prototype),
        RequiredMark.symbol,
      );

      expect(descriptor).toEqual({
        value: true,
        writable: false,
        enumerable: false,
        configurable: false,
      });
      expect(Object.keys(new InvoiceTotal(1))).not.toContain(RequiredMark.symbol);
    });
  });
});
