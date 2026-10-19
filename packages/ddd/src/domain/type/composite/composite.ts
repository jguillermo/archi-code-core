import { runValidations } from '@archi-code/validation';
import type { ValidatedClass } from '@archi-code/validation';
import { CompositeField } from './composite-field';
import type { FieldSpec } from './composite-field';
import { ValueObjects } from '../value-objects/value-objects';
import type { PrimitiveType } from '../../primitive/primitive-types';
import { TypePrimitiveException, ValidationException } from '../../../exceptions/index';

export type CompositeSchema = Record<string, FieldSpec>;

type FieldOf<Spec> = Spec extends readonly [infer Item]
  ? FieldOf<Item>[]
  : Spec extends abstract new (...args: any[]) => infer Instance
    ? Instance
    : never;

export type CompositeProps<Schema extends CompositeSchema> = {
  readonly [Field in keyof Schema]: FieldOf<Schema[Field]>;
};

export type CompositePrimitives<Schema extends CompositeSchema> = {
  [Field in keyof Schema]: PrimitiveType<FieldOf<Schema[Field]>>;
};

export interface CompositeValue<Schema extends CompositeSchema> {
  equals(other: unknown): boolean;
  toPrimitives(): CompositePrimitives<Schema>;
}

export interface CompositeType<Schema extends CompositeSchema> {
  new (props: CompositeProps<Schema>): CompositeProps<Schema> & CompositeValue<Schema>;
  fromPrimitives<Composed>(
    this: new (props: CompositeProps<Schema>) => Composed,
    primitives: CompositePrimitives<Schema>,
  ): Composed;
}

export function Composite<Schema extends CompositeSchema>(schema: Schema): CompositeType<Schema> {
  const fields = Object.keys(schema);

  class CompositeValueObject {
    static fromPrimitives(
      this: new (props: Record<string, unknown>) => CompositeValueObject,
      primitives: unknown,
    ): CompositeValueObject {
      if (typeof primitives !== 'object' || primitives === null || Array.isArray(primitives)) {
        throw new TypePrimitiveException(this.name, primitives);
      }
      const record = primitives as Record<string, unknown>;
      const props = ValueObjects.build(
        Object.fromEntries(
          fields.map((field) => [
            field,
            () => CompositeField.fromPrimitive(schema[field], record[field]),
          ]),
        ),
      );
      return new this(props);
    }

    constructor(props: Record<string, unknown>) {
      const owner = this.constructor.name;
      for (const field of fields) {
        Object.defineProperty(this, field, {
          value: CompositeField.accept(owner, field, schema[field], props?.[field]),
          enumerable: true,
        });
      }
      const brokenRules = runValidations(this.constructor as ValidatedClass, this).errors;
      if (brokenRules.length > 0) {
        throw new ValidationException(
          brokenRules.map((error) => ({ field: null, message: `${owner}: ${error.message}` })),
        );
      }
      Object.freeze(this);
    }

    equals(other: unknown): boolean {
      return (
        typeof other === 'object' &&
        other !== null &&
        other.constructor === this.constructor &&
        fields.every((field) =>
          CompositeField.equals(
            (this as Record<string, unknown>)[field],
            (other as Record<string, unknown>)[field],
          ),
        )
      );
    }

    toPrimitives(): Record<string, unknown> {
      return Object.fromEntries(
        fields.map((field) => [
          field,
          CompositeField.primitive((this as Record<string, unknown>)[field]),
        ]),
      );
    }
  }

  CompositeField.brand(CompositeValueObject.prototype);
  return CompositeValueObject as unknown as CompositeType<Schema>;
}
