import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import type { OrderRepository } from '../../domain/repository/OrderRepository';
import { CarrierTrackingNumber } from '../../domain/value-object/CarrierTrackingNumber';
import { OrderId } from '../../domain/value-object/OrderId';
import { ShipmentDispatchedDomainEvent } from './shipment-dispatched-domain-event';

@ListensTo(ShipmentDispatchedDomainEvent, {
  consumer: 'sales.mark-order-shipped-on-shipment-dispatched',
})
export class MarkOrderShippedOnShipmentDispatched extends EventListener<ShipmentDispatchedDomainEvent> {
  constructor(
    private readonly orders: OrderRepository,
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
