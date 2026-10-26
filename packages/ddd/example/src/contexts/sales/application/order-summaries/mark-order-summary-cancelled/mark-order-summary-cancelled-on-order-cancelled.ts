import { CreatedAt, UuidType } from '../../../../../ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../../ddd/application';
import { OrderCancelledDomainEvent } from '../../../domain/event/OrderCancelledDomainEvent';
import { OrderId } from '../../../domain/value-object/OrderId';
import { OrderStatus } from '../../../domain/value-object/OrderStatusType';
import type { OrderSummaryProjection } from '../order-summary-projection';

@ListensTo(OrderCancelledDomainEvent, {
  consumer: 'sales.mark-order-summary-cancelled-on-order-cancelled',
})
export class MarkOrderSummaryCancelledOnOrderCancelled extends EventListener<OrderCancelledDomainEvent> {
  constructor(private readonly projection: OrderSummaryProjection) {
    super();
  }

  async handle(event: OrderCancelledDomainEvent): Promise<void> {
    const { eventId, orderId, occurredOn } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      orderId: () => new OrderId(event.orderId),
      occurredOn: () => new CreatedAt(event.occurredOn),
    });
    await this.projection.apply({
      eventId,
      orderId,
      occurredOn,
      changes: { status: OrderStatus.CANCELLED },
    });
  }
}
