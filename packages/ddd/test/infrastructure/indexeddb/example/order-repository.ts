import { AggregateRepository } from '../../../../src/domain/index';
import type {
  AggregateFinder,
  AggregateRemover,
  AggregateSaver,
} from '../../../../src/domain/index';
import type { Order, OrderId } from './order';

export abstract class OrderRepository
  extends AggregateRepository<Order>
  implements AggregateFinder<Order>, AggregateSaver<Order>, AggregateRemover<Order>
{
  abstract findById(id: OrderId): Promise<Order | null>;
  abstract save(order: Order): Promise<void>;
  abstract remove(order: Order): Promise<void>;
}
