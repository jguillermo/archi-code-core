import { DomainException } from '../../../../ddd/domain';

export class OrderLineNotFound extends DomainException {
  constructor(orderId: string, lineNumber: number) {
    super(`Order ${orderId} has no line ${lineNumber}`, ['SAL007']);
  }
}
