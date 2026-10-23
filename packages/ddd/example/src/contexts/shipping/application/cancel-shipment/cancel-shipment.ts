import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import { UseCase } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import { OrderReference } from '../../domain/shipment/order-reference';
import type { Shipment } from '../../domain/shipment/shipment';
import type { ShipmentEvent } from '../../domain/shipment/shipment-events';
import { ShipmentId } from '../../domain/shipment/shipment-id';

export class CancelShipment extends UseCase<{ orderId: string }, OrderReference, void> {
  constructor(
    private readonly shipments: AggregateFinder<Shipment> & AggregateSaver<Shipment>,
    private readonly events: EventBus<ShipmentEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: { orderId: string }): OrderReference {
    return new OrderReference(input.orderId);
  }

  protected async handle(orderReference: OrderReference): Promise<void> {
    const shipment = await this.shipments.findById(ShipmentId.forOrder(orderReference));
    if (shipment === null) {
      return;
    }
    shipment.cancelForCancelledOrder(this.clock);
    await this.shipments.save(shipment);
    await this.events.publish(shipment.pullDomainEvents());
  }
}
