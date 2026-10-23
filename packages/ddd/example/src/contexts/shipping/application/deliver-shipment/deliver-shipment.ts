import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import {
  AggregateNotFoundException,
  NotAllowedException,
  UseCase,
  ValueObjectBuilder,
} from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import type { Shipment } from '../../domain/shipment/shipment';
import type { ShipmentEvent } from '../../domain/shipment/shipment-events';
import { ShipmentId } from '../../domain/shipment/shipment-id';
import { StaffRole, StaffRoleType } from '../../domain/staff/staff-role';

export interface DeliverShipmentInput {
  actorRole: string;
  shipmentId: string;
}

export interface DeliverShipmentCommand {
  actorRole: StaffRoleType;
  shipmentId: ShipmentId;
}

export class DeliverShipment extends UseCase<DeliverShipmentInput, DeliverShipmentCommand, void> {
  constructor(
    private readonly shipments: AggregateFinder<Shipment> & AggregateSaver<Shipment>,
    private readonly events: EventBus<ShipmentEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: DeliverShipmentInput): DeliverShipmentCommand {
    return ValueObjectBuilder.build({
      actorRole: () => new StaffRoleType(input.actorRole as StaffRole),
      shipmentId: () => new ShipmentId(input.shipmentId),
    });
  }

  protected async handle(command: DeliverShipmentCommand): Promise<void> {
    if (command.actorRole.value !== StaffRole.WAREHOUSE) {
      throw new NotAllowedException(`The role ${command.actorRole.value} may not deliver`);
    }
    const shipment = await this.shipments.findById(command.shipmentId);
    if (shipment === null) {
      throw new AggregateNotFoundException('Shipment', command.shipmentId.value);
    }
    shipment.deliver(this.clock);
    await this.shipments.save(shipment);
    await this.events.publish(shipment.pullDomainEvents());
  }
}
