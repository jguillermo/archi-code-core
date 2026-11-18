import type { CreatedAt, UuidType } from '../../../../ddd/domain';
import type { OrderId } from '../../domain/order/value-object/OrderId';
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
    const occurred = occurredOn.toString();
    const current = (await this.store.find(orderId.value)) ?? {
      orderId: orderId.value,
      customerId: null,
      paid: false,
      shipped: false,
      delivered: false,
      cancelled: false,
      total: null,
      items: 0,
      trackingNumber: null,
      lastEventAt: occurred,
    };
    const lastEventAt = occurred > current.lastEventAt ? occurred : current.lastEventAt;
    await this.store.save({ ...current, ...changes, lastEventAt }, appliedEventId);
  }
}
