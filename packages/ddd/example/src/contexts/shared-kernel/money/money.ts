import { Composite, DomainException } from '../../../ddd/domain';
import { Cents } from './cents';
import { Currency, MoneyCurrency } from './currency';

export class CurrencyMismatchException extends DomainException {
  constructor(expected: string, received: string) {
    super(`Cannot combine ${received} with ${expected}`, ['MNY001']);
  }
}

export class Money extends Composite({ amount: Cents, currency: MoneyCurrency }) {
  static zero(currency: Currency): Money {
    return new Money({ amount: new Cents(0), currency: new MoneyCurrency(currency) });
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return this.withAmount(this.amount.value + other.amount.value);
  }

  times(factor: number): Money {
    return this.withAmount(this.amount.value * factor);
  }

  lessPercent(percent: number): Money {
    return this.withAmount(this.amount.value - Math.floor((this.amount.value * percent) / 100));
  }

  isAtLeast(cents: number): boolean {
    return this.amount.value >= cents;
  }

  isZero(): boolean {
    return this.amount.value === 0;
  }

  private assertSameCurrency(other: Money): void {
    if (!this.currency.equals(other.currency)) {
      throw new CurrencyMismatchException(this.currency.value, other.currency.value);
    }
  }

  private withAmount(cents: number): Money {
    return new Money({ amount: new Cents(cents), currency: this.currency });
  }
}
