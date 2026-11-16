import { DomainException } from '../../../../ddd/domain';

export class OrderOwnedByAnotherCustomer extends DomainException {
  constructor(orderId: string) {
    super(`Only the customer who placed order ${orderId} can change it`, ['SAL006']);
  }
}
