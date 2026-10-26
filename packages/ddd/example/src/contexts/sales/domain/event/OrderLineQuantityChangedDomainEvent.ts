import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class OrderLineQuantityChangedDomainEvent extends EventBase {
  static readonly eventName = 'order.line_quantity_changed';

  readonly orderId: string;
  readonly lineNumber: number;
  readonly quantity: number;
  readonly total: { amount: number; currency: string };

  constructor({
    orderId,
    lineNumber,
    quantity,
    total,
    eventId,
    occurredOn,
    clock,
  }: {
    orderId: string;
    lineNumber: number;
    quantity: number;
    total: { amount: number; currency: string };
  } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.orderId = orderId;
    this.lineNumber = lineNumber;
    this.quantity = quantity;
    this.total = total;
  }
}
