import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class ShipmentDispatched extends EventBase {
  static readonly eventName = 'shipping.shipment.ShipmentDispatched';

  constructor(
    readonly shipmentId: string,
    readonly orderId: string,
    readonly trackingNumber: string,
    readonly carrier: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}
