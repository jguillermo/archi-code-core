import { DomainException, NumberTypeRequired } from '@code-core/domain';

export class AccountBalance extends NumberTypeRequired {
  addFunds(amount: number): AccountBalance {
    return new AccountBalance(this.value + amount);
  }

  withdrawFunds(amount: number): AccountBalance {
    if (this.value >= amount) {
      return new AccountBalance(this.value - amount);
    } else {
      throw new DomainException('Insufficient funds');
    }
  }
}
