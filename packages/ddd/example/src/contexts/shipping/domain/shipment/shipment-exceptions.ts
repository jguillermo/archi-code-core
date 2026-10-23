import { DomainException } from '../../../../ddd/domain';

export class ShipmentNotDispatchableException extends DomainException {
  constructor(shipmentId: string, status: string) {
    super(`Shipment ${shipmentId} is ${status} and cannot be dispatched`, ['SHP001']);
  }
}

export class MissingTrackingNumberException extends DomainException {
  constructor(shipmentId: string) {
    super(`Shipment ${shipmentId} needs a tracking number to be dispatched`, ['SHP002']);
  }
}

export class ShipmentNotDeliverableException extends DomainException {
  constructor(shipmentId: string, status: string) {
    super(`Shipment ${shipmentId} is ${status} and cannot be delivered`, ['SHP003']);
  }
}
