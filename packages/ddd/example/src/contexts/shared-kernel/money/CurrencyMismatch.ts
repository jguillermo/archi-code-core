import { DomainException } from '../../../ddd/domain';

export class CurrencyMismatch extends DomainException {
  constructor(expected: string, received: string) {
    super(`Cannot combine ${received} with ${expected}`, ['MNY001']);
  }
}
