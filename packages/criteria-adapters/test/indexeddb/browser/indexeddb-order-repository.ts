import type { Criteria, SearchOptions, SearchResult } from '@archi-code/ddd/domain';
import type { IndexedDbStored, IndexedDbTable } from '@archi-code/ddd/infrastructure';
import { toIndexedDbQuery } from '../../../src/indexeddb/index';
import { Order } from './order';
import type { OrderId } from './order';
import { OrderRepository } from './order-repository';
import { OrderSchema } from './order.schema';
import type { OrderRow } from './order.schema';
import type { ShopDb } from './shop.db';

export class IndexedDbOrderRepository extends OrderRepository {
  private readonly table: IndexedDbTable<OrderRow>;
  private readonly rowVersions = new WeakMap<Order, number>();

  constructor(database: ShopDb) {
    super();
    this.table = database.table(new OrderSchema());
  }

  async findById(id: OrderId): Promise<Order | null> {
    const row = await this.table.get(id.value);
    return row === null ? null : this.load(row);
  }

  async search(criteria: Criteria<Order>, options?: SearchOptions): Promise<SearchResult<Order>> {
    const page = await this.table.find(toIndexedDbQuery(criteria, this.table.indexes));
    const items = page.items.map((row) => this.load(row));
    return options?.withTotal === true ? { items, total: page.total } : { items };
  }

  async save(order: Order): Promise<void> {
    const rowVersion = this.rowVersions.get(order) ?? 0;
    await this.table.persist({ ...order.toPrimitives(), rowVersion });
    this.rowVersions.delete(order);
  }

  private load(row: IndexedDbStored<OrderRow>): Order {
    const order = Order.fromPrimitives(row);
    this.rowVersions.set(order, row.rowVersion);
    return order;
  }
}
