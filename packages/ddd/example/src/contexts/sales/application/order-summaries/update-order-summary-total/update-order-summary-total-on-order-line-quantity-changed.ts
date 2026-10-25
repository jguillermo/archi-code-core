import { CreatedAt, UuidType } from '../../../../../ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../../ddd/application';
import { Money } from '../../../../shared-kernel/money/Money';
import type { Currency } from '../../../../shared-kernel/money/MoneyCurrency';
import { OrderLineQuantityChangedDomainEvent } from '../../../domain/event/OrderLineQuantityChangedDomainEvent';
import { OrderId } from '../../../domain/value-object/OrderId';
import type { OrderSummaryProjection } from '../order-summary-projection';

@ListensTo(OrderLineQuantityChangedDomainEvent, {
  consumer: 'sales.update-order-summary-total-on-order-line-quantity-changed',
})
export class UpdateOrderSummaryTotalOnOrderLineQuantityChanged extends EventListener<OrderLineQuantityChangedDomainEvent> {
  constructor(private readonly projection: OrderSummaryProjection) {
    super();
  }

  async handle(event: OrderLineQuantityChangedDomainEvent): Promise<void> {
    const { eventId, orderId, occurredOn, total } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      orderId: () => new OrderId(event.orderId),
      occurredOn: () => new CreatedAt(event.occurredOn),
      total: () => Money.fromPrimitives(event.total as { amount: number; currency: Currency }),
    });
    await this.projection.apply({
      eventId,
      orderId,
      occurredOn,
      changes: { total: total.toPrimitives() },
    });
  }
}
