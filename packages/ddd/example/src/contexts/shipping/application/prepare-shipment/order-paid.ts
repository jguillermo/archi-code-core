import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export interface PaidOrderAddress {
  recipient: { name: string; phone: string };
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface PaidOrderItem {
  sku: string;
  quantity: number;
}

export class OrderPaid extends EventBase {
  static readonly eventName = 'sales.order.OrderPaid';

  constructor(
    readonly orderId: string,
    readonly address: PaidOrderAddress,
    readonly items: PaidOrderItem[],
    readonly giftWrap: boolean,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}
