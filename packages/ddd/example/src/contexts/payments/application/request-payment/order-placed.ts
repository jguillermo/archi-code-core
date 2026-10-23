import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';
import type { MoneyData } from '../../domain/payment/payment-events';

export class OrderPlaced extends EventBase {
  static readonly eventName = 'sales.order.OrderPlaced';

  constructor(
    readonly orderId: string,
    readonly total: MoneyData,
    readonly paymentMethod: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}
