import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class OrderCreatedDomainEvent extends EventBase {
  static readonly eventName = 'order.created';

  readonly orderId: string;
  readonly total: { amount: number; currency: string };
  readonly paymentMethod: string;

  constructor({
    orderId,
    total,
    paymentMethod,
    eventId,
    occurredOn,
    clock,
  }: {
    orderId: string;
    total: { amount: number; currency: string };
    paymentMethod: string;
  } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.orderId = orderId;
    this.total = total;
    this.paymentMethod = paymentMethod;
  }
}
