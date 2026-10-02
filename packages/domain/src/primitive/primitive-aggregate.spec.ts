import { describe, it } from '@jest/globals';
import { PrimitiveTypes } from './primitive-types';
import { expectTypeOf } from 'expect-type';
import { AggregateRoot } from '../aggregate/aggregate-root';
import { AbstractStringType, IdType, NumberTypeOptional, Required } from '../type';

class Name extends Required(AbstractStringType) {}

describe('Primitive aggregate', () => {
  it('id readonly', () => {
    class Aggregate extends AggregateRoot {
      constructor(public id: IdType) {
        super();
      }
    }

    class AggregateB extends AggregateRoot {
      constructor(public readonly _id: IdType) {
        super();
      }
    }

    class AggregateC extends AggregateRoot {
      constructor(private readonly _id: IdType) {
        super();
      }

      get id(): IdType {
        return this._id;
      }
    }

    interface expectedPrimitives {
      id: string;
    }

    expectTypeOf<PrimitiveTypes<Aggregate>>().toEqualTypeOf<expectedPrimitives>();
    expectTypeOf<PrimitiveTypes<AggregateB>>().toEqualTypeOf<expectedPrimitives>();
    expectTypeOf<PrimitiveTypes<AggregateC>>().toEqualTypeOf<expectedPrimitives>();
  });

  it('id stringREquired and number optional', () => {
    class Aggregate extends AggregateRoot {
      constructor(
        private readonly _id: IdType,
        private _name: Name,
        private _age: NumberTypeOptional,
      ) {
        super();
      }

      get id(): IdType {
        return this._id;
      }

      get name(): Name {
        return this._name;
      }

      get age(): NumberTypeOptional {
        return this._age;
      }
    }

    interface expectedPrimitives {
      id: string;
      name: string;
      age: number | null;
    }

    expectTypeOf<PrimitiveTypes<Aggregate>>().toEqualTypeOf<expectedPrimitives>();
  });

  it('id array', () => {
    class Aggregate extends AggregateRoot {
      constructor(
        private readonly _id: IdType,
        private _tags: Name[],
      ) {
        super();
      }

      get id(): IdType {
        return this._id;
      }

      get tags(): Name[] {
        return this._tags;
      }
    }

    interface expectedPrimitives {
      id: string;
      tags: string[];
    }

    expectTypeOf<PrimitiveTypes<Aggregate>>().toEqualTypeOf<expectedPrimitives>();
  });
});
