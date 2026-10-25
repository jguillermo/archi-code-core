import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class ShipmentDispatchedDomainEvent extends EventBase {
  static readonly eventName = 'shipment.dispatched';

  readonly shipmentId: string;
  readonly orderId: string;
  readonly trackingNumber: string;
  readonly carrier: string;

  constructor({
    shipmentId,
    orderId,
    trackingNumber,
    carrier,
    eventId,
    occurredOn,
    clock,
  }: {
    shipmentId: string;
    orderId: string;
    trackingNumber: string;
    carrier: string;
  } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.shipmentId = shipmentId;
    this.orderId = orderId;
    this.trackingNumber = trackingNumber;
    this.carrier = carrier;
  }
}
