import type { CreatedAt, UuidType } from '../../../../ddd/domain';
import type { OrderId } from '../../domain/value-object/OrderId';
import type { OrderSummaryChanges } from './order-summary';
import type { OrderSummaryStore } from './order-summary-store';

export interface OrderSummaryChange {
  eventId: UuidType;
  orderId: OrderId;
  occurredOn: CreatedAt;
  changes: OrderSummaryChanges;
}

export class OrderSummaryProjection {
  constructor(private readonly store: OrderSummaryStore) {}

  async apply({ eventId, orderId, occurredOn, changes }: OrderSummaryChange): Promise<void> {
    const appliedEventId = eventId.toString();
    if (await this.store.hasApplied(appliedEventId)) {
      return;
    }
    const lastEventAt = occurredOn.toString();
    const current = (await this.store.find(orderId.value)) ?? {
      orderId: orderId.value,
      customerId: null,
      status: 'unknown',
      total: null,
      items: 0,
      trackingNumber: null,
      lastEventAt,
    };
    await this.store.save({ ...current, ...changes, lastEventAt }, appliedEventId);
  }
}
