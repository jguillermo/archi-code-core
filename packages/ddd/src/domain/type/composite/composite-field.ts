import type { AbstractType } from '../abstract-type';
import { ValueObjects } from '../value-objects/value-objects';
import { RequiredValueException, TypePrimitiveException } from '../../../exceptions/index';

const COMPOSITE: unique symbol = Symbol.for('@archi-code/ddd/composite.v1');

export type ValueClass = new (value: any) => AbstractType<any>;

export interface CompositeClass {
  readonly name: string;
  readonly prototype: object;
  new (props: any): object;
  fromPrimitives(primitives: any): object;
}

export type FieldClass = ValueClass | CompositeClass;

export type FieldSpec = FieldClass | readonly [FieldClass];

interface Comparable {
  equals(other: unknown): boolean;
}

interface WithPrimitives {
  toPrimitives(): unknown;
}

export class CompositeField {
  static brand(prototype: object): void {
    Object.defineProperty(prototype, COMPOSITE, { value: true });
  }

  static isComposite(value: unknown): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value as Record<symbol, unknown>)[COMPOSITE] === true
    );
  }

  static accept(owner: string, field: string, spec: FieldSpec, value: unknown): unknown {
    if (!Array.isArray(spec)) {
      return CompositeField.acceptOne(owner, field, spec as FieldClass, value);
    }
    if (!Array.isArray(value)) {
      throw new TypePrimitiveException(`list for ${owner}.${field}`, value);
    }
    return Object.freeze(
      value.map((item, index) =>
        CompositeField.acceptOne(owner, `${field}.${index}`, spec[0], item),
      ),
    );
  }

  static fromPrimitive(spec: FieldSpec, primitive: unknown): unknown {
    if (Array.isArray(spec)) {
      if (!Array.isArray(primitive)) {
        throw new TypePrimitiveException('Array', primitive);
      }
      return ValueObjects.buildList(primitive, (item) =>
        CompositeField.fromPrimitive(spec[0], item),
      );
    }
    const fieldClass = spec as FieldClass;
    return CompositeField.isComposite(fieldClass.prototype)
      ? (fieldClass as CompositeClass).fromPrimitives(primitive)
      : new (fieldClass as ValueClass)(primitive);
  }

  static equals(left: unknown, right: unknown): boolean {
    if (Array.isArray(left)) {
      return (
        Array.isArray(right) &&
        left.length === right.length &&
        left.every((item, index) => CompositeField.equals(item, right[index]))
      );
    }
    return (left as Comparable).equals(right);
  }

  static primitive(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => CompositeField.primitive(item));
    }
    return CompositeField.isComposite(value)
      ? (value as WithPrimitives).toPrimitives()
      : (value as AbstractType<unknown>).value;
  }

  private static acceptOne(
    owner: string,
    field: string,
    fieldClass: FieldClass,
    value: unknown,
  ): unknown {
    if (value === null || value === undefined) {
      throw new RequiredValueException(`${owner}.${field}`, value);
    }
    if (!(value instanceof fieldClass)) {
      throw new TypePrimitiveException(`${fieldClass.name} for ${owner}.${field}`, value);
    }
    return value;
  }
}
