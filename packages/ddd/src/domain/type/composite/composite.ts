import { runValidations } from '@archi-code/validation';
import type { ValidatedClass } from '@archi-code/validation';
import { CompositeBrand } from './composite-brand';
import { CompositeField } from './composite-field';
import type { FieldSpec } from './composite-field';
import { IssueCollector } from './issue-collector';
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

type InputOf<Spec> = Spec extends readonly [infer Item]
  ? InputOf<Item>[]
  : Spec extends { fromPrimitives(this: any, primitives: infer Primitives): unknown }
    ? Primitives
    : Spec extends abstract new (value: infer Value) => unknown
      ? Exclude<Value, undefined>
      : never;

export type CompositeInput<Schema extends CompositeSchema> = {
  [Field in keyof Schema]: InputOf<Schema[Field]>;
};

export interface CompositeValue<Schema extends CompositeSchema> {
  equals(other: unknown): boolean;
  toPrimitives(): CompositePrimitives<Schema>;
}

export interface CompositeType<Schema extends CompositeSchema> {
  new (props: CompositeProps<Schema>): CompositeProps<Schema> & CompositeValue<Schema>;
  fromPrimitives<Composed>(
    this: new (props: CompositeProps<Schema>) => Composed,
    primitives: CompositeInput<Schema>,
  ): Composed;
}

export function Composite<Schema extends CompositeSchema>(schema: Schema): CompositeType<Schema> {
  const fields = Object.entries(schema).map(
    ([name, spec]) => [name, CompositeField.of(spec)] as const,
  );

  class CompositeValueObject {
    readonly [field: string]: unknown;

    static fromPrimitives(
      this: new (props: Record<string, unknown>) => CompositeValueObject,
      primitives: unknown,
    ): CompositeValueObject {
      if (typeof primitives !== 'object' || primitives === null || Array.isArray(primitives)) {
        throw new TypePrimitiveException(this.name, primitives);
      }
      const record = primitives as Readonly<Record<string, unknown>>;
      const builds = Object.fromEntries(
        fields.map(([name, field]) => [name, () => field.fromPrimitive(record[name])]),
      );
      return new this(IssueCollector.collectFields(builds));
    }

    constructor(props: Readonly<Record<string, unknown>>) {
      const owner = this.constructor.name;
      for (const [name, field] of fields) {
        Object.defineProperty(this, name, {
          value: field.accept(`${owner}.${name}`, props?.[name]),
          enumerable: true,
        });
      }
      const brokenRules = runValidations(this.constructor as ValidatedClass, this).errors;
      if (brokenRules.length > 0) {
        throw new ValidationException(
          brokenRules.map((error) => ({
            field: null,
            /* v8 ignore next -- @preserve */
            code: 'custom' in error ? error.custom : error.validator,
            message: `${owner}: ${error.message}`,
          })),
        );
      }
      Object.freeze(this);
    }

    equals(other: unknown): boolean {
      return (
        typeof other === 'object' &&
        other !== null &&
        other.constructor === this.constructor &&
        fields.every(([name, field]) =>
          field.equals(this[name], (other as CompositeValueObject)[name]),
        )
      );
    }

    toPrimitives(): Record<string, unknown> {
      return Object.fromEntries(
        fields.map(([name, field]) => [name, field.toPrimitive(this[name])]),
      );
    }
  }

  CompositeBrand.mark(CompositeValueObject.prototype);
  return CompositeValueObject as unknown as CompositeType<Schema>;
}
