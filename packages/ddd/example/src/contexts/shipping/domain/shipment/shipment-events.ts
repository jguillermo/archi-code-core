import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class ShipmentPrepared extends EventBase {
  static readonly eventName = 'shipping.shipment.ShipmentPrepared';

  constructor(
    readonly shipmentId: string,
    readonly orderId: string,
    readonly carrier: string,
    readonly expectedDeliveryOn: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

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

export class ShipmentCancelled extends EventBase {
  static readonly eventName = 'shipping.shipment.ShipmentCancelled';

  constructor(
    readonly shipmentId: string,
    readonly orderId: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

export type ShipmentEvent =
  | ShipmentPrepared
  | ShipmentDispatched
  | ShipmentDelivered
  | ShipmentCancelled;
