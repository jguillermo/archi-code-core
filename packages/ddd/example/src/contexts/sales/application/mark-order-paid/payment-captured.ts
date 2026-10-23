import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';
import type { MoneyData } from '../../domain/order/order-events';

export class PaymentCaptured extends EventBase {
  static readonly eventName = 'payments.payment.PaymentCaptured';

  constructor(
    readonly paymentId: string,
    readonly orderId: string,
    readonly amount: MoneyData,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}
