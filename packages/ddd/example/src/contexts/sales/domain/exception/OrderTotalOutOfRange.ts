import { DomainException } from '../../../../ddd/domain';

export class OrderTotalOutOfRange extends DomainException {
  constructor(cents: number) {
    super(`An order total goes from 0.01 to 10000.00, not ${(cents / 100).toFixed(2)}`, ['SAL003']);
  }
}
