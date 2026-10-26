import { AggregateRepository } from '../../../../ddd/domain';
import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import type { Shipment } from '../aggregate/Shipment';
import type { ShipmentId } from '../value-object/ShipmentId';

export abstract class ShipmentRepository
  extends AggregateRepository<Shipment>
  implements AggregateFinder<Shipment>, AggregateSaver<Shipment>
{
  abstract findById(id: ShipmentId): Promise<Shipment | null>;
  abstract save(shipment: Shipment): Promise<void>;
}
