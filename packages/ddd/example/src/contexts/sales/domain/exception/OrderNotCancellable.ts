import { DomainException } from '../../../../ddd/domain';

export class OrderNotCancellable extends DomainException {
  constructor(orderId: string, status: string) {
    super(`Order ${orderId} is ${status} and can no longer be cancelled`, ['SAL005']);
  }
}
