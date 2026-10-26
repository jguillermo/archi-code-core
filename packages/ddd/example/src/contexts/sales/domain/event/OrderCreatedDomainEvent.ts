import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class OrderCreatedDomainEvent extends EventBase {
  static readonly eventName = 'order.created';

  readonly orderId: string;
  readonly customerId: string;
  readonly lines: {
    sku: string;
    quantity: number;
    unitPrice: { amount: number; currency: string };
  }[];
  readonly total: { amount: number; currency: string };
  readonly paymentMethod: string;
  readonly freeShipping: boolean;

  constructor({
    orderId,
    customerId,
    lines,
    total,
    paymentMethod,
    freeShipping,
    eventId,
    occurredOn,
    clock,
  }: {
    orderId: string;
    customerId: string;
    lines: { sku: string; quantity: number; unitPrice: { amount: number; currency: string } }[];
    total: { amount: number; currency: string };
    paymentMethod: string;
    freeShipping: boolean;
  } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.orderId = orderId;
    this.customerId = customerId;
    this.lines = lines;
    this.total = total;
    this.paymentMethod = paymentMethod;
    this.freeShipping = freeShipping;
  }
}
