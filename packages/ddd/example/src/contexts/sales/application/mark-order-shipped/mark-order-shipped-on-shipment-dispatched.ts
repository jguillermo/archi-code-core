import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import type { Order } from '../../domain/aggregate/Order';
import { CarrierTrackingNumber } from '../../domain/value-object/CarrierTrackingNumber';
import { OrderId } from '../../domain/value-object/OrderId';
import { ShipmentDispatchedDomainEvent } from './shipment-dispatched-domain-event';

@ListensTo(ShipmentDispatchedDomainEvent, {
  consumer: 'sales.mark-order-shipped-on-shipment-dispatched',
})
export class MarkOrderShippedOnShipmentDispatched extends EventListener<ShipmentDispatchedDomainEvent> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus,
    private readonly clock: Clock,
  ) {
    super();
  }

  async handle(event: ShipmentDispatchedDomainEvent): Promise<void> {
    const { orderId, trackingNumber } = ValueObjectBuilder.build({
      orderId: () => new OrderId(event.orderId),
      trackingNumber: () => new CarrierTrackingNumber(event.trackingNumber),
    });
    const order = await this.orders.findById(orderId);
    if (order === null) {
      return;
    }
    order.markShipped(trackingNumber, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
