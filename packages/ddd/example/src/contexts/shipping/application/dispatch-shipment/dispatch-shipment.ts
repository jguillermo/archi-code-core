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
import { TrackingNumber } from '../../domain/shipment/tracking-number';
import { StaffRole, StaffRoleType } from '../../domain/staff/staff-role';

export interface DispatchShipmentInput {
  actorRole: string;
  shipmentId: string;
  trackingNumber?: string | null;
}

export interface DispatchShipmentCommand {
  actorRole: StaffRoleType;
  shipmentId: ShipmentId;
  trackingNumber: TrackingNumber;
}

export class DispatchShipment extends UseCase<
  DispatchShipmentInput,
  DispatchShipmentCommand,
  void
> {
  constructor(
    private readonly shipments: AggregateFinder<Shipment> & AggregateSaver<Shipment>,
    private readonly events: EventBus<ShipmentEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: DispatchShipmentInput): DispatchShipmentCommand {
    return ValueObjectBuilder.build({
      actorRole: () => new StaffRoleType(input.actorRole as StaffRole),
      shipmentId: () => new ShipmentId(input.shipmentId),
      trackingNumber: () => new TrackingNumber(input.trackingNumber),
    });
  }

  protected async handle(command: DispatchShipmentCommand): Promise<void> {
    if (command.actorRole.value !== StaffRole.WAREHOUSE) {
      throw new NotAllowedException(`The role ${command.actorRole.value} may not dispatch`);
    }
    const shipment = await this.shipments.findById(command.shipmentId);
    if (shipment === null) {
      throw new AggregateNotFoundException('Shipment', command.shipmentId.value);
    }
    shipment.dispatch(command.trackingNumber, this.clock);
    await this.shipments.save(shipment);
    await this.events.publish(shipment.pullDomainEvents());
  }
}
