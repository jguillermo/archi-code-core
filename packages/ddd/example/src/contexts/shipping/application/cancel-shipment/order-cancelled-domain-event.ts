import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class OrderCancelledDomainEvent extends EventBase {
  static readonly eventName = 'order.cancelled';

  readonly orderId: string;

  constructor({ orderId, eventId, occurredOn }: { orderId: string } & EventMetadata) {
    super({ eventId, occurredOn });
    this.orderId = orderId;
  }
}
