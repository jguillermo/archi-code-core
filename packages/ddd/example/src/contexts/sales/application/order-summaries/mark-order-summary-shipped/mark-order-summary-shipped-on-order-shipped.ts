import { CreatedAt, UuidType } from '../../../../../ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../../ddd/application';
import { OrderShippedDomainEvent } from '../../../domain/event/OrderShippedDomainEvent';
import { CarrierTrackingNumber } from '../../../domain/value-object/CarrierTrackingNumber';
import { OrderId } from '../../../domain/value-object/OrderId';
import { OrderStatus } from '../../../domain/value-object/OrderStatusType';
import type { OrderSummaryProjection } from '../order-summary-projection';

@ListensTo(OrderShippedDomainEvent, {
  consumer: 'sales.mark-order-summary-shipped-on-order-shipped',
})
export class MarkOrderSummaryShippedOnOrderShipped extends EventListener<OrderShippedDomainEvent> {
  constructor(private readonly projection: OrderSummaryProjection) {
    super();
  }

  async handle(event: OrderShippedDomainEvent): Promise<void> {
    const { eventId, orderId, occurredOn, trackingNumber } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      orderId: () => new OrderId(event.orderId),
      occurredOn: () => new CreatedAt(event.occurredOn),
      trackingNumber: () => new CarrierTrackingNumber(event.trackingNumber),
    });
    await this.projection.apply({
      eventId,
      orderId,
      occurredOn,
      changes: { status: OrderStatus.SHIPPED, trackingNumber: trackingNumber.value },
    });
  }
}
