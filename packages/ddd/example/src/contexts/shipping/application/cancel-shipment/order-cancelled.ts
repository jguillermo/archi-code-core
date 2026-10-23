import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class OrderCancelled extends EventBase {
  static readonly eventName = 'sales.order.OrderCancelled';

  constructor(
    readonly orderId: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}
