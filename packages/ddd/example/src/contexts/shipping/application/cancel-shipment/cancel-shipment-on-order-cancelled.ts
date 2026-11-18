import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../ddd/application';
import type { EventBus } from '../../../../ddd/application';
import { Shipment } from '../../domain/shipment/aggregate/Shipment';
import type { ShipmentRepository } from '../../domain/shipment/repository/ShipmentRepository';
import { OrderReference } from '../../domain/shipment/value-object/OrderReference';
import { OrderWasPaid } from '../../domain/shipment/value-object/OrderWasPaid';
import { ShipmentId } from '../../domain/shipment/value-object/ShipmentId';
import { OrderCancelledDomainEvent } from './order-cancelled-domain-event';

@ListensTo(OrderCancelledDomainEvent, { consumer: 'shipping.cancel-shipment-on-order-cancelled' })
export class CancelShipmentOnOrderCancelled extends EventListener<OrderCancelledDomainEvent> {
  constructor(
    private readonly shipments: ShipmentRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  async handle(event: OrderCancelledDomainEvent): Promise<void> {
    const { orderReference, wasPaid } = ValueObjectBuilder.build({
      orderReference: () => new OrderReference(event.orderId),
      wasPaid: () => new OrderWasPaid(event.wasPaid),
    });
    const shipmentId = ShipmentId.forOrder(orderReference);
    const found = await this.shipments.findById(shipmentId);
    if (found === null && !wasPaid.value) {
      return;
    }
    const shipment = found ?? Shipment.createCancelled(shipmentId, orderReference);
    shipment.cancelForCancelledOrder();
    await this.shipments.save(shipment);
    await this.events.publish(shipment.pullDomainEvents());
  }
}
