import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class OrderCancelledDomainEvent extends EventBase {
  static readonly eventName = 'order.cancelled';

  readonly orderId: string;
  readonly reason: string;
  readonly wasPaid: boolean;
  readonly total: { amount: number; currency: string };
  readonly paymentMethod: string;

  constructor({
    orderId,
    reason,
    wasPaid,
    total,
    paymentMethod,
    eventId,
    occurredOn,
  }: {
    orderId: string;
    reason: string;
    wasPaid: boolean;
    total: { amount: number; currency: string };
    paymentMethod: string;
  } & EventMetadata) {
    super({ eventId, occurredOn });
    this.orderId = orderId;
    this.reason = reason;
    this.wasPaid = wasPaid;
    this.total = total;
    this.paymentMethod = paymentMethod;
  }
}
