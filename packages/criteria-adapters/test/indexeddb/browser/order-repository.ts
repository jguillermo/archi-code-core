import { AggregateRepository } from '@archi-code/ddd/domain';
import type {
  AggregateFinder,
  AggregateSaver,
  AggregateSearcher,
  Criteria,
  SearchOptions,
  SearchResult,
} from '@archi-code/ddd/domain';
import type { Order, OrderId } from './order';

export abstract class OrderRepository
  extends AggregateRepository<Order>
  implements AggregateFinder<Order>, AggregateSaver<Order>, AggregateSearcher<Order>
{
  abstract findById(id: OrderId): Promise<Order | null>;
  abstract save(order: Order): Promise<void>;
  abstract search(criteria: Criteria<Order>, options?: SearchOptions): Promise<SearchResult<Order>>;
}
