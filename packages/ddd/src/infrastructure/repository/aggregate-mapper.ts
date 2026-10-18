import type { AggregateRoot, PrimitiveTypes } from '../../domain/index';
import { AggregateShape } from './aggregate-shape';

export interface AggregateClass<Aggregate extends AggregateRoot<any, any>> {
  readonly name: string;
  fromPrimitives(primitives: PrimitiveTypes<Aggregate>): Aggregate;
}

export class AggregateMapper<
  Aggregate extends AggregateRoot<any, any> & { toPrimitives(): PrimitiveTypes<Aggregate> },
> {
  private constructor(private readonly aggregateClass: AggregateClass<Aggregate>) {}

  static of<
    Aggregate extends AggregateRoot<any, any> & { toPrimitives(): PrimitiveTypes<Aggregate> },
  >(aggregateClass: AggregateClass<Aggregate>): AggregateMapper<Aggregate> {
    return new AggregateMapper(aggregateClass);
  }

  toPrimitives(aggregate: Aggregate): PrimitiveTypes<Aggregate> {
    const primitives = aggregate.toPrimitives();
    AggregateShape.assert(this.aggregateClass.name, aggregate, primitives);
    return primitives;
  }

  fromPrimitives(primitives: PrimitiveTypes<Aggregate>): Aggregate {
    return this.aggregateClass.fromPrimitives(primitives);
  }
}
