import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class OrderShippedDomainEvent extends EventBase {
  static readonly eventName = 'order.shipped';

  readonly orderId: string;
  readonly trackingNumber: string;

  constructor({
    orderId,
    trackingNumber,
    eventId,
    occurredOn,
    clock,
  }: { orderId: string; trackingNumber: string } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.orderId = orderId;
    this.trackingNumber = trackingNumber;
  }
}
