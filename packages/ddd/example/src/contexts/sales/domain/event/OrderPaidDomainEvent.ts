import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class OrderPaidDomainEvent extends EventBase {
  static readonly eventName = 'order.paid';

  readonly orderId: string;
  readonly paymentId: string;
  readonly address: {
    recipient: { name: string; phone: string };
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  readonly items: { sku: string; quantity: number }[];
  readonly giftWrap: boolean;

  constructor({
    orderId,
    paymentId,
    address,
    items,
    giftWrap,
    eventId,
    occurredOn,
    clock,
  }: {
    orderId: string;
    paymentId: string;
    address: {
      recipient: { name: string; phone: string };
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
    items: { sku: string; quantity: number }[];
    giftWrap: boolean;
  } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.orderId = orderId;
    this.paymentId = paymentId;
    this.address = address;
    this.items = items;
    this.giftWrap = giftWrap;
  }
}
