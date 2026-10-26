import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import type { Shipment } from '../../domain/aggregate/Shipment';
import { OrderReference } from '../../domain/value-object/OrderReference';
import { ShipmentId } from '../../domain/value-object/ShipmentId';
import { OrderCancelledDomainEvent } from './order-cancelled-domain-event';

@ListensTo(OrderCancelledDomainEvent, { consumer: 'shipping.cancel-shipment-on-order-cancelled' })
export class CancelShipmentOnOrderCancelled extends EventListener<OrderCancelledDomainEvent> {
  constructor(
    private readonly shipments: AggregateFinder<Shipment> & AggregateSaver<Shipment>,
    private readonly events: EventBus,
    private readonly clock: Clock,
  ) {
    super();
  }

  async handle(event: OrderCancelledDomainEvent): Promise<void> {
    const { orderReference } = ValueObjectBuilder.build({
      orderReference: () => new OrderReference(event.orderId),
    });
    const shipment = await this.shipments.findById(ShipmentId.forOrder(orderReference));
    if (shipment === null) {
      return;
    }
    shipment.cancelForCancelledOrder(this.clock);
    await this.shipments.save(shipment);
    await this.events.publish(shipment.pullDomainEvents());
  }
}
