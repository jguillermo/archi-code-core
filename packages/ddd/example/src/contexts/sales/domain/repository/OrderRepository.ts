import { AggregateRepository } from '../../../../ddd/domain';
import type { AggregateFinder, AggregateRemover, AggregateSaver } from '../../../../ddd/domain';
import type { Order } from '../aggregate/Order';
import type { OrderId } from '../value-object/OrderId';

export abstract class OrderRepository
  extends AggregateRepository<Order>
  implements AggregateFinder<Order>, AggregateSaver<Order>, AggregateRemover<Order>
{
  abstract findById(id: OrderId): Promise<Order | null>;
  abstract save(order: Order): Promise<void>;
  abstract remove(order: Order): Promise<void>;
}
