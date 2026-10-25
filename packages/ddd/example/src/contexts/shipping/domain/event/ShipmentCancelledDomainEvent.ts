import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class ShipmentCancelledDomainEvent extends EventBase {
  static readonly eventName = 'shipment.cancelled';

  readonly shipmentId: string;
  readonly orderId: string;

  constructor({
    shipmentId,
    orderId,
    eventId,
    occurredOn,
    clock,
  }: { shipmentId: string; orderId: string } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.shipmentId = shipmentId;
    this.orderId = orderId;
  }
}
