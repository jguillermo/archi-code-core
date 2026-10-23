import { IdType, UuidType } from '../../../../ddd/domain';
import type { OrderReference } from './order-reference';

export class ShipmentId extends IdType<'ShipmentId'> {
  static forOrder(order: OrderReference): ShipmentId {
    return new ShipmentId(UuidType.fromValue(`shipment-of-order:${order.value}`));
  }
}
