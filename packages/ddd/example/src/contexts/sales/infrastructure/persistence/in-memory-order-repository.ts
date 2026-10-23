import type {
  AggregateFinder,
  AggregateRemover,
  AggregateSaver,
  PrimitiveTypes,
} from '../../../../ddd/domain';
import { ConcurrencyException } from '../../../../ddd/application';
import { Order } from '../../domain/order/order';
import type { OrderId } from '../../domain/order/order-id';

interface OrderRow {
  version: number;
  primitives: PrimitiveTypes<Order>;
}

export class InMemoryOrderRepository
  implements AggregateFinder<Order>, AggregateSaver<Order>, AggregateRemover<Order>
{
  private readonly rows = new Map<string, OrderRow>();
  private readonly versions = new WeakMap<Order, number>();

  async findById(id: OrderId): Promise<Order | null> {
    const row = this.rows.get(id.value);
    if (row === undefined) {
      return null;
    }
    const order = Order.fromPrimitives(structuredClone(row.primitives));
    this.versions.set(order, row.version);
    return order;
  }

  async save(order: Order): Promise<void> {
    const version = this.checkedVersion(order);
    this.rows.set(order.id.value, {
      version: version + 1,
      primitives: structuredClone(order.toPrimitives()),
    });
    this.versions.set(order, version + 1);
  }

  async remove(order: Order): Promise<void> {
    this.checkedVersion(order);
    this.rows.delete(order.id.value);
  }

  versionOf(id: OrderId): number {
    return this.rows.get(id.value)?.version ?? 0;
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
