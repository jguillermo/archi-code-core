import { EnumType, Required } from '../../../../ddd/domain';

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export class OrderStatusOption extends EnumType<OrderStatus> {
  protected getEnum(): typeof OrderStatus {
    return OrderStatus;
  }
}

export class OrderStatusType extends Required(OrderStatusOption) {}
