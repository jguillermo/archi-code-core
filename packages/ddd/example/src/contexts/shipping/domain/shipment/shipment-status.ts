import { EnumType, Required } from '../../../../ddd/domain';

export enum ShipmentStatus {
  PREPARING = 'preparing',
  DISPATCHED = 'dispatched',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export class ShipmentStatusOption extends EnumType<ShipmentStatus> {
  protected getEnum(): typeof ShipmentStatus {
    return ShipmentStatus;
  }
}

export class ShipmentStatusType extends Required(ShipmentStatusOption) {}
