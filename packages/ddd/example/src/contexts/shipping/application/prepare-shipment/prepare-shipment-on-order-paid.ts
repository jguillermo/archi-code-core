import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import { Shipment } from '../../domain/aggregate/Shipment';
import { GiftWrapRequested } from '../../domain/value-object/GiftWrapRequested';
import { OrderReference } from '../../domain/value-object/OrderReference';
import { ShipmentAddress } from '../../domain/value-object/ShipmentAddress';
import { ShipmentContents } from '../../domain/value-object/ShipmentContents';
import { ShipmentId } from '../../domain/value-object/ShipmentId';
import { OrderPaidDomainEvent } from './order-paid-domain-event';

@ListensTo(OrderPaidDomainEvent, { consumer: 'shipping.prepare-shipment-on-order-paid' })
export class PrepareShipmentOnOrderPaid extends EventListener<OrderPaidDomainEvent> {
  constructor(
    private readonly shipments: AggregateFinder<Shipment> & AggregateSaver<Shipment>,
    private readonly events: EventBus,
    private readonly clock: Clock,
  ) {
    super();
  }

  async handle(event: OrderPaidDomainEvent): Promise<void> {
    const { orderReference, address, contents, giftWrap } = ValueObjectBuilder.build({
      orderReference: () => new OrderReference(event.orderId),
      address: () => ShipmentAddress.fromPrimitives(event.address),
      contents: () => ShipmentContents.fromPrimitives({ items: event.items }),
      giftWrap: () => new GiftWrapRequested(event.giftWrap),
    });
    const shipmentId = ShipmentId.forOrder(orderReference);
    if ((await this.shipments.findById(shipmentId)) !== null) {
      return;
    }
    const shipment = Shipment.create(
      shipmentId,
      orderReference,
      address,
      contents,
      giftWrap,
      this.clock,
    );
    await this.shipments.save(shipment);
    await this.events.publish(shipment.pullDomainEvents());
  }
}
