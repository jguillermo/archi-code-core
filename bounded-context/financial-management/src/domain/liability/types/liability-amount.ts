import { NumberTypeRequired } from '@code-core/domain';

export class LiabilityAmount extends NumberTypeRequired {
  recordPayment(paymentAmount: number): void {
    this._value -= paymentAmount;
  }
}
