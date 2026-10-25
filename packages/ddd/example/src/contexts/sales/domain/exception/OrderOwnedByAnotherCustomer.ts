import { DomainException } from '../../../../ddd/domain';

export class OrderOwnedByAnotherCustomer extends DomainException {
  constructor(orderId: string) {
    super(`Only the customer who placed order ${orderId} can cancel it`, ['SAL006']);
  }
}
