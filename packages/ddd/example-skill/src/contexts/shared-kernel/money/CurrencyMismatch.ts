import { DomainException } from '@archi-code/ddd/domain';

export class CurrencyMismatch extends DomainException {
  constructor(expected: string, received: string) {
    super(`Cannot compare ${received} with ${expected}`, ['MNY001']);
  }
}
