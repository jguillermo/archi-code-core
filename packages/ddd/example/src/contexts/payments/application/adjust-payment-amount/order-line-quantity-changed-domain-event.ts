import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class OrderLineQuantityChangedDomainEvent extends EventBase {
  static readonly eventName = 'order.line_quantity_changed';

  readonly orderId: string;
  readonly total: { amount: number; currency: string };

  constructor({
    orderId,
    total,
    eventId,
    occurredOn,
    clock,
  }: { orderId: string; total: { amount: number; currency: string } } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.orderId = orderId;
    this.total = total;
  }
}
