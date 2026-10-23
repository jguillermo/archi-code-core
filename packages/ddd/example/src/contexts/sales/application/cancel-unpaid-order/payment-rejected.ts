import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';
import type { MoneyData } from '../../domain/order/order-events';

export class PaymentRejected extends EventBase {
  static readonly eventName = 'payments.payment.PaymentRejected';

  constructor(
    readonly paymentId: string,
    readonly orderId: string,
    readonly amount: MoneyData,
    readonly reason: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}
