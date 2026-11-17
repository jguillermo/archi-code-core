import { ConcurrencyException } from '../../../../src/application/index';
import type { IndexedDbStored, IndexedDbTable } from '../../../../src/infrastructure/index';
import { Order } from './order';
import type { OrderId } from './order';
import { OrderRepository } from './order-repository';
import { OrderSchema } from './order.schema';
import type { OrderRow } from './order.schema';
import type { SalesDb } from './sales.db';

export class IndexedDbOrderRepository extends OrderRepository {
  private readonly table: IndexedDbTable<OrderRow>;
  private readonly rowVersions = new WeakMap<Order, number>();

  constructor(database: SalesDb) {
    super();
    this.table = database.table(new OrderSchema());
  }

  async findById(id: OrderId): Promise<Order | null> {
    const row = await this.table.get(id.value);
    return row === null ? null : this.load(row);
  }

  async save(order: Order): Promise<void> {
    const rowVersion = this.rowVersions.get(order) ?? 0;
    await this.guarded(order, rowVersion, () =>
      this.table.persist({ ...order.toPrimitives(), rowVersion }),
    );
    this.rowVersions.set(order, rowVersion + 1);
  }

  async remove(order: Order): Promise<void> {
    const rowVersion = this.rowVersions.get(order);
    if (rowVersion === undefined) {
      return;
    }
    await this.guarded(order, rowVersion, () => this.table.remove(order.id.value, rowVersion));
    this.rowVersions.delete(order);
  }

  private async guarded(
    order: Order,
    rowVersion: number,
    write: () => Promise<void>,
  ): Promise<void> {
    try {
      await write();
    } catch (error) {
      if (error instanceof ConcurrencyException) {
        throw new ConcurrencyException('Order', order.id.value, rowVersion, { cause: error });
      }
      throw error;
    }
  }

  private load(row: IndexedDbStored<OrderRow>): Order {
    const order = Order.fromPrimitives(row);
    this.rowVersions.set(order, row.rowVersion);
    return order;
  }
}
