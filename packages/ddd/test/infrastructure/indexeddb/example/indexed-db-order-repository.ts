import { ConcurrencyException } from '../../../../src/application/index';
import type { IndexedDbStored, IndexedDbTable } from '../../../../src/infrastructure/index';
import { Order } from './order';
import type { OrderId, OrderStatus } from './order';
import { OrderRepository } from './order-repository';
import { OrderSchema } from './order-schema';
import type { OrderRow } from './order-schema';
import type { SalesDatabase } from './sales-database';

export class IndexedDbOrderRepository extends OrderRepository {
  private readonly orders: IndexedDbTable<OrderRow>;
  private readonly versions = new WeakMap<Order, number>();

  constructor(database: SalesDatabase) {
    super();
    this.orders = database.table(new OrderSchema());
  }

  async findById(id: OrderId): Promise<Order | null> {
    const row = await this.orders.get(id.value);
    return row === null ? null : this.load(row);
  }

  async save(order: Order): Promise<void> {
    const rowVersion = this.versions.get(order) ?? 0;
    await this.guarded(order, rowVersion, () =>
      this.orders.persist({ ...this.rowOf(order), rowVersion }),
    );
    this.versions.set(order, rowVersion + 1);
  }

  async remove(order: Order): Promise<void> {
    const rowVersion = this.versions.get(order);
    if (rowVersion === undefined) {
      return;
    }
    await this.guarded(order, rowVersion, () => this.orders.remove(order.id.value, rowVersion));
    this.versions.delete(order);
  }

  private async guarded(order: Order, rowVersion: number, write: () => Promise<void>) {
    try {
      await write();
    } catch (error) {
      if (error instanceof ConcurrencyException) {
        throw new ConcurrencyException('Order', order.id.value, rowVersion, { cause: error });
      }
      throw error;
    }
  }

  private rowOf(order: Order): OrderRow {
    const primitives = order.toPrimitives();
    return {
      ...primitives,
      createdAt: primitives.createdAt.toISOString(),
      updatedAt: primitives.updatedAt.toISOString(),
    };
  }

  private load(row: IndexedDbStored<OrderRow>): Order {
    const order = Order.fromPrimitives({
      id: row.id,
      customerId: row.customerId,
      lines: row.lines,
      status: row.status as OrderStatus,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
    this.versions.set(order, row.rowVersion);
    return order;
  }
}
