import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';
import type { MoneyData } from '../../domain/payment/payment-events';

export class OrderLineQuantityChanged extends EventBase {
  static readonly eventName = 'sales.order.OrderLineQuantityChanged';

  constructor(
    readonly orderId: string,
    readonly total: MoneyData,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}
