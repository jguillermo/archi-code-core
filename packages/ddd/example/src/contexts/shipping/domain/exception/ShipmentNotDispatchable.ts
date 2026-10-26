import { DomainException } from '../../../../ddd/domain';

export class ShipmentNotDispatchable extends DomainException {
  constructor(shipmentId: string, status: string) {
    super(`Shipment ${shipmentId} is ${status} and cannot be dispatched`, ['SHP001']);
  }
}
