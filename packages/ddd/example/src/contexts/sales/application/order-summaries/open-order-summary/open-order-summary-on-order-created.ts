import { CreatedAt, UuidType } from '../../../../../ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../../ddd/application';
import { Money } from '../../../../shared-kernel/money/Money';
import type { Currency } from '../../../../shared-kernel/money/MoneyCurrency';
import { OrderCreatedDomainEvent } from '../../../domain/event/OrderCreatedDomainEvent';
import { CustomerId } from '../../../domain/value-object/CustomerId';
import { OrderId } from '../../../domain/value-object/OrderId';
import { OrderStatus } from '../../../domain/value-object/OrderStatusType';
import { Quantity } from '../../../domain/value-object/Quantity';
import type { OrderSummaryProjection } from '../order-summary-projection';

@ListensTo(OrderCreatedDomainEvent, { consumer: 'sales.open-order-summary-on-order-created' })
export class OpenOrderSummaryOnOrderCreated extends EventListener<OrderCreatedDomainEvent> {
  constructor(private readonly projection: OrderSummaryProjection) {
    super();
  }

  async handle(event: OrderCreatedDomainEvent): Promise<void> {
    const { eventId, orderId, occurredOn, customerId, total, quantities } =
      ValueObjectBuilder.build({
        eventId: () => new UuidType(event.eventId),
        orderId: () => new OrderId(event.orderId),
        occurredOn: () => new CreatedAt(event.occurredOn),
        customerId: () => new CustomerId(event.customerId),
        total: () => Money.fromPrimitives(event.total as { amount: number; currency: Currency }),
        quantities: () =>
          ValueObjectBuilder.buildList(event.lines, (line) => new Quantity(line.quantity)),
      });
    await this.projection.apply({
      eventId,
      orderId,
      occurredOn,
      changes: {
        customerId: customerId.value,
        status: OrderStatus.PENDING_PAYMENT,
        total: total.toPrimitives(),
        items: quantities.reduce((items, quantity) => items + quantity.value, 0),
      },
    });
  }
}
