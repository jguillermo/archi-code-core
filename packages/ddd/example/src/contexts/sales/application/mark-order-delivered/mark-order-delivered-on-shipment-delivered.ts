import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import type { Order } from '../../domain/aggregate/Order';
import type { OrderEvent } from '../../domain/event/OrderEvent';
import { OrderId } from '../../domain/value-object/OrderId';
import { ShipmentDeliveredDomainEvent } from './shipment-delivered-domain-event';

@ListensTo(ShipmentDeliveredDomainEvent, {
  consumer: 'sales.mark-order-delivered-on-shipment-delivered',
})
export class MarkOrderDeliveredOnShipmentDelivered extends EventListener<ShipmentDeliveredDomainEvent> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  async handle(event: ShipmentDeliveredDomainEvent): Promise<void> {
    const { orderId } = ValueObjectBuilder.build({
      orderId: () => new OrderId(event.orderId),
    });
    const order = await this.orders.findById(orderId);
    if (order === null) {
      return;
    }
    order.markDelivered(this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
