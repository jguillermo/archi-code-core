import { IdType, UuidType } from '../../../../ddd/domain';
import type { OrderReference } from './order-reference';

export class PaymentId extends IdType<'PaymentId'> {
  static forOrder(order: OrderReference): PaymentId {
    return new PaymentId(UuidType.fromValue(`payment-of-order:${order.value}`));
  }
}
