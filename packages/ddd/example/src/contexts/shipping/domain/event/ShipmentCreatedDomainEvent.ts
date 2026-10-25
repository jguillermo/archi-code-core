import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class ShipmentCreatedDomainEvent extends EventBase {
  static readonly eventName = 'shipment.created';

  readonly shipmentId: string;
  readonly orderId: string;
  readonly carrier: string;
  readonly expectedDeliveryOn: string;

  constructor({
    shipmentId,
    orderId,
    carrier,
    expectedDeliveryOn,
    eventId,
    occurredOn,
    clock,
  }: {
    shipmentId: string;
    orderId: string;
    carrier: string;
    expectedDeliveryOn: string;
  } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.shipmentId = shipmentId;
    this.orderId = orderId;
    this.carrier = carrier;
    this.expectedDeliveryOn = expectedDeliveryOn;
  }
}
