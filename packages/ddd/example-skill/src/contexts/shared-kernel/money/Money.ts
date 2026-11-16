import { Composite } from '@archi-code/ddd/domain';
import { Cents } from './Cents';
import { CurrencyMismatch } from './CurrencyMismatch';
import { MoneyCurrency } from './MoneyCurrency';

export class Money extends Composite({ amount: Cents, currency: MoneyCurrency }) {
  isCheaperThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount.value < other.amount.value;
  }

  minusPercent(percent: number): Money {
    const discount = (BigInt(this.amount.value) * BigInt(percent)) / BigInt(100);
    return new Money({
      amount: new Cents(this.amount.value - Number(discount)),
      currency: this.currency,
    });
  }

  private assertSameCurrency(other: Money): void {
    if (!this.currency.equals(other.currency)) {
      throw new CurrencyMismatch(this.currency.value, other.currency.value);
    }
  }
}
