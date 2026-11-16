import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class ShipmentDeliveredDomainEvent extends EventBase {
  static readonly eventName = 'shipment.delivered';

  readonly orderId: string;

  constructor({ orderId, eventId, occurredOn }: { orderId: string } & EventMetadata) {
    super({ eventId, occurredOn });
    this.orderId = orderId;
  }
}
