import { CreatedAt, UuidType } from '../../../../../ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../../ddd/application';
import { OrderDeliveredDomainEvent } from '../../../domain/event/OrderDeliveredDomainEvent';
import { OrderId } from '../../../domain/value-object/OrderId';
import { OrderStatus } from '../../../domain/value-object/OrderStatusType';
import type { OrderSummaryProjection } from '../order-summary-projection';

@ListensTo(OrderDeliveredDomainEvent, {
  consumer: 'sales.mark-order-summary-delivered-on-order-delivered',
})
export class MarkOrderSummaryDeliveredOnOrderDelivered extends EventListener<OrderDeliveredDomainEvent> {
  constructor(private readonly projection: OrderSummaryProjection) {
    super();
  }

  async handle(event: OrderDeliveredDomainEvent): Promise<void> {
    const { eventId, orderId, occurredOn } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      orderId: () => new OrderId(event.orderId),
      occurredOn: () => new CreatedAt(event.occurredOn),
    });
    await this.projection.apply({
      eventId,
      orderId,
      occurredOn,
      changes: { status: OrderStatus.DELIVERED },
    });
  }
}
