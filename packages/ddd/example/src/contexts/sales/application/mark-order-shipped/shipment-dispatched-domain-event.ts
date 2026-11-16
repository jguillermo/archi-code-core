import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class ShipmentDispatchedDomainEvent extends EventBase {
  static readonly eventName = 'shipment.dispatched';

  readonly orderId: string;
  readonly trackingNumber: string;

  constructor({
    orderId,
    trackingNumber,
    eventId,
    occurredOn,
  }: { orderId: string; trackingNumber: string } & EventMetadata) {
    super({ eventId, occurredOn });
    this.orderId = orderId;
    this.trackingNumber = trackingNumber;
  }
}
