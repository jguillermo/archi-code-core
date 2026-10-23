import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import { UseCase, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import { GiftWrapRequested } from '../../domain/shipment/gift-wrap-requested';
import { OrderReference } from '../../domain/shipment/order-reference';
import { Shipment } from '../../domain/shipment/shipment';
import { ShipmentAddress } from '../../domain/shipment/shipment-address';
import { ShipmentContents } from '../../domain/shipment/shipment-contents';
import type { ShipmentEvent } from '../../domain/shipment/shipment-events';
import { ShipmentId } from '../../domain/shipment/shipment-id';
import type { PaidOrderAddress, PaidOrderItem } from './order-paid';

export interface PrepareShipmentInput {
  orderId: string;
  address: PaidOrderAddress;
  items: PaidOrderItem[];
  giftWrap: boolean;
}

export interface PrepareShipmentCommand {
  orderReference: OrderReference;
  address: ShipmentAddress;
  contents: ShipmentContents;
  giftWrap: GiftWrapRequested;
}

export class PrepareShipment extends UseCase<PrepareShipmentInput, PrepareShipmentCommand, void> {
  constructor(
    private readonly shipments: AggregateFinder<Shipment> & AggregateSaver<Shipment>,
    private readonly events: EventBus<ShipmentEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: PrepareShipmentInput): PrepareShipmentCommand {
    return ValueObjectBuilder.build({
      orderReference: () => new OrderReference(input.orderId),
      address: () => ShipmentAddress.fromPrimitives(input.address),
      contents: () => ShipmentContents.fromPrimitives({ items: input.items }),
      giftWrap: () => new GiftWrapRequested(input.giftWrap),
    });
  }

  protected async handle(command: PrepareShipmentCommand): Promise<void> {
    if ((await this.shipments.findById(ShipmentId.forOrder(command.orderReference))) !== null) {
      return;
    }
    const shipment = Shipment.prepare(command, this.clock);
    await this.shipments.save(shipment);
    await this.events.publish(shipment.pullDomainEvents());
  }
}
