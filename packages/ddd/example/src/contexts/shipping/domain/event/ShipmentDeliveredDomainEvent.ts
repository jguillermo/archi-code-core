import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class ShipmentDeliveredDomainEvent extends EventBase {
  static readonly eventName = 'shipment.delivered';

  readonly shipmentId: string;
  readonly orderId: string;

  constructor({
    shipmentId,
    orderId,
    eventId,
    occurredOn,
  }: { shipmentId: string; orderId: string } & EventMetadata) {
    super({ eventId, occurredOn });
    this.shipmentId = shipmentId;
    this.orderId = orderId;
  }
}
