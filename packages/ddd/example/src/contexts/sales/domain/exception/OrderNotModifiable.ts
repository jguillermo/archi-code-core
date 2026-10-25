import { DomainException } from '../../../../ddd/domain';

export class OrderNotModifiable extends DomainException {
  constructor(orderId: string, status: string) {
    super(`Order ${orderId} is ${status} and can no longer change`, ['SAL004']);
  }
}
