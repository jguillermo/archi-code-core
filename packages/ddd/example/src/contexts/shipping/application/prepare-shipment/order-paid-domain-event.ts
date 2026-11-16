import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';
import type { PaidOrderAddress } from './paid-order-address';
import type { PaidOrderItem } from './paid-order-item';

export class OrderPaidDomainEvent extends EventBase {
  static readonly eventName = 'order.paid';

  readonly orderId: string;
  readonly address: PaidOrderAddress;
  readonly items: PaidOrderItem[];
  readonly giftWrap: boolean;

  constructor({
    orderId,
    address,
    items,
    giftWrap,
    eventId,
    occurredOn,
  }: {
    orderId: string;
    address: PaidOrderAddress;
    items: PaidOrderItem[];
    giftWrap: boolean;
  } & EventMetadata) {
    super({ eventId, occurredOn });
    this.orderId = orderId;
    this.address = address;
    this.items = items;
    this.giftWrap = giftWrap;
  }
}
