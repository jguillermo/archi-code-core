import { DomainException } from '../../../../ddd/domain';

export class TrackingNumberMissing extends DomainException {
  constructor(shipmentId: string) {
    super(`Shipment ${shipmentId} needs a tracking number to be dispatched`, ['SHP002']);
  }
}
