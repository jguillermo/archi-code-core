import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class OrderDeliveredDomainEvent extends EventBase {
  static readonly eventName = 'order.delivered';

  readonly orderId: string;

  constructor({ orderId, eventId, occurredOn }: { orderId: string } & EventMetadata) {
    super({ eventId, occurredOn });
    this.orderId = orderId;
  }
}
