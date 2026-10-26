import type { PrimitiveTypes } from '../../../../ddd/domain';
import { ConcurrencyException } from '../../../../ddd/application';
import { Shipment } from '../../domain/aggregate/Shipment';
import { ShipmentRepository } from '../../domain/repository/ShipmentRepository';
import type { ShipmentId } from '../../domain/value-object/ShipmentId';

interface ShipmentRow {
  version: number;
  primitives: PrimitiveTypes<Shipment>;
}

export class InMemoryShipmentRepository extends ShipmentRepository {
  private readonly rows = new Map<string, ShipmentRow>();
  private readonly versions = new WeakMap<Shipment, number>();

  async findById(id: ShipmentId): Promise<Shipment | null> {
    const row = this.rows.get(id.value);
    if (row === undefined) {
      return null;
    }
    const shipment = Shipment.fromPrimitives(structuredClone(row.primitives));
    this.versions.set(shipment, row.version);
    return shipment;
  }

  async save(shipment: Shipment): Promise<void> {
    const key = shipment.id.value;
    const version = this.versions.get(shipment) ?? 0;
    if ((this.rows.get(key)?.version ?? 0) !== version) {
      throw new ConcurrencyException('Shipment', key, version);
    }
    this.rows.set(key, {
      version: version + 1,
      primitives: structuredClone(shipment.toPrimitives()),
    });
    this.versions.set(shipment, version + 1);
  }
}
