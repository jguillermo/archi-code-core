import { CreatedAt, UuidType } from '../../../../../ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../../ddd/application';
import { OrderPaidDomainEvent } from '../../../domain/event/OrderPaidDomainEvent';
import { OrderId } from '../../../domain/value-object/OrderId';
import { OrderStatus } from '../../../domain/value-object/OrderStatusType';
import { Quantity } from '../../../domain/value-object/Quantity';
import type { OrderSummaryProjection } from '../order-summary-projection';

@ListensTo(OrderPaidDomainEvent, { consumer: 'sales.mark-order-summary-paid-on-order-paid' })
export class MarkOrderSummaryPaidOnOrderPaid extends EventListener<OrderPaidDomainEvent> {
  constructor(private readonly projection: OrderSummaryProjection) {
    super();
  }

  async handle(event: OrderPaidDomainEvent): Promise<void> {
    const { eventId, orderId, occurredOn, quantities } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      orderId: () => new OrderId(event.orderId),
      occurredOn: () => new CreatedAt(event.occurredOn),
      quantities: () =>
        ValueObjectBuilder.buildList(event.items, (item) => new Quantity(item.quantity)),
    });
    await this.projection.apply({
      eventId,
      orderId,
      occurredOn,
      changes: {
        status: OrderStatus.PAID,
        items: quantities.reduce((items, quantity) => items + quantity.value, 0),
      },
    });
  }
}
