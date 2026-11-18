import type { PrimitiveTypes } from '../../../../ddd/domain';
import { ConcurrencyException } from '../../../../ddd/application';
import { Order } from '../../domain/order/aggregate/Order';
import { OrderRepository } from '../../domain/order/repository/OrderRepository';
import type { OrderId } from '../../domain/order/value-object/OrderId';

interface OrderRow {
  version: number;
  primitives: PrimitiveTypes<Order>;
}

export class InMemoryOrderRepository extends OrderRepository {
  private readonly rows = new Map<string, OrderRow>();
  private readonly versions = new WeakMap<Order, number>();

  async findById(id: OrderId): Promise<Order | null> {
    const row = this.rows.get(id.value);
    return row === undefined ? null : this.load(row);
  }

  async save(order: Order): Promise<void> {
    const version = this.checkedVersion(order);
    this.rows.set(order.id.value, {
      version: version + 1,
      primitives: structuredClone(order.toPrimitives()),
    });
    this.versions.delete(order);
  }

  async remove(order: Order): Promise<void> {
    this.checkedVersion(order);
    this.rows.delete(order.id.value);
    this.versions.delete(order);
  }

  private load(row: OrderRow): Order {
    const order = Order.fromPrimitives(structuredClone(row.primitives));
    this.versions.set(order, row.version);
    return order;
  }

  private checkedVersion(order: Order): number {
    const key = order.id.value;
    const version = this.versions.get(order) ?? 0;
    if ((this.rows.get(key)?.version ?? 0) !== version) {
      throw new ConcurrencyException('Order', key, version);
    }
    return version;
  }
}
