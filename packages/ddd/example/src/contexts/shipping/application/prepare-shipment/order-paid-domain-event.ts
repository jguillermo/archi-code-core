import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class OrderPaidDomainEvent extends EventBase {
  static readonly eventName = 'order.paid';

  readonly orderId: string;
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
    address,
    items,
    giftWrap,
    eventId,
    occurredOn,
    clock,
  }: {
    orderId: string;
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
    this.address = address;
    this.items = items;
    this.giftWrap = giftWrap;
  }
}
