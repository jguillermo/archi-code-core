import { describe, expect, it } from 'vitest';
import { ValidationException } from '@archi-code/ddd/domain';
import { CurrencyMismatch } from '../../../../src/contexts/shared-kernel/money/CurrencyMismatch';
import { Money } from '../../../../src/contexts/shared-kernel/money/Money';
import { Currency } from '../../../../src/contexts/shared-kernel/money/MoneyCurrency';

describe('Money', () => {
  it('takes 10% off a course price rounding the discount down', () => {
    expect(
      Money.fromPrimitives({ amount: 4_995, currency: Currency.EUR })
        .minusPercent(10)
        .toPrimitives(),
    ).toEqual({
      amount: 4_496,
      currency: 'EUR',
    });
  });

  it('compares prices of the same currency only', () => {
    const price = Money.fromPrimitives({ amount: 1_000, currency: Currency.EUR });
    expect(
      price.isCheaperThan(Money.fromPrimitives({ amount: 2_000, currency: Currency.EUR })),
    ).toBe(true);
    expect(() =>
      price.isCheaperThan(Money.fromPrimitives({ amount: 2_000, currency: Currency.USD })),
    ).toThrow(CurrencyMismatch);
  });

  it('refuses fractions of a cent and unknown currencies, naming each field', () => {
    try {
      Money.fromPrimitives({ amount: 12.5, currency: 'XYZ' } as never);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationException);
      expect((error as ValidationException).errors.map((issue) => issue.field)).toEqual([
        'amount',
        'currency',
      ]);
    }
  });
});
