import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class ShipmentDelivered extends EventBase {
  static readonly eventName = 'shipping.shipment.ShipmentDelivered';

  constructor(
    readonly shipmentId: string,
    readonly orderId: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}
