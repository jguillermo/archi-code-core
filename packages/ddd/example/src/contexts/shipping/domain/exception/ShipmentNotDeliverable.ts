import { DomainException } from '../../../../ddd/domain';

export class ShipmentNotDeliverable extends DomainException {
  constructor(shipmentId: string, status: string) {
    super(`Shipment ${shipmentId} is ${status} and cannot be delivered`, ['SHP003']);
  }
}
