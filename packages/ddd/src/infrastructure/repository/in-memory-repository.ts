import type {
  AggregateFinder,
  AggregateRemover,
  AggregateRoot,
  AggregateSaver,
  PrimitiveTypes,
} from '../../domain/index';
import { ConcurrencyException } from '../../exceptions/index';
import type { AggregateMapper } from './aggregate-mapper';
import type { TransactionParticipant } from '../transaction/transaction-participant';

interface StoredAggregate<Aggregate> {
  readonly version: number;
  readonly primitives: PrimitiveTypes<Aggregate>;
}

export class InMemoryRepository<
  Aggregate extends AggregateRoot<any, any> & { toPrimitives(): PrimitiveTypes<Aggregate> },
>
  implements
    AggregateFinder<Aggregate>,
    AggregateSaver<Aggregate>,
    AggregateRemover<Aggregate>,
    TransactionParticipant
{
  private readonly rows = new Map<string, StoredAggregate<Aggregate>>();

  constructor(private readonly mapper: AggregateMapper<Aggregate>) {}

  async findById(id: Aggregate['id']): Promise<Aggregate | null> {
    const row = this.rows.get(id.toString());
    return row === undefined ? null : this.load(row);
  }

  async findAll(): Promise<Aggregate[]> {
    return Array.from(this.rows.values(), (row) => this.load(row));
  }

  async save(aggregate: Aggregate): Promise<void> {
    const key = aggregate.id.toString();
    const storedVersion = this.rows.get(key)?.version ?? 0;
    if (storedVersion !== aggregate.version) {
      throw new ConcurrencyException(this.mapper.aggregateName, key, aggregate.version);
    }
    const primitives = structuredClone(this.mapper.toPrimitives(aggregate));
    this.rows.set(key, { version: aggregate.version + 1, primitives });
    aggregate.markPersisted();
  }

  async remove(id: Aggregate['id']): Promise<void> {
    this.rows.delete(id.toString());
  }

  snapshot(): () => void {
    const saved = new Map(this.rows);
    return () => {
      this.rows.clear();
      saved.forEach((row, key) => this.rows.set(key, row));
    };
  }

  private load(row: StoredAggregate<Aggregate>): Aggregate {
    return this.mapper.fromPrimitives(structuredClone(row.primitives), row.version);
  }
}
