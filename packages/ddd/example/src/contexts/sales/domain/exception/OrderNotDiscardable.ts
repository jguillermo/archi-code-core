import { DomainException } from '../../../../ddd/domain';

export class OrderNotDiscardable extends DomainException {
  constructor(orderId: string) {
    super(`Order ${orderId} is not cancelled, so it cannot be discarded`, ['SAL008']);
  }
}
