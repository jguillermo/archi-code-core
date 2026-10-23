import type { AbstractType } from '../abstract-type';
import { CompositeBrand } from './composite-brand';
import { CompositeIssues } from './composite-issues';
import { RequiredValueException } from '../../exceptions/required-value.exception';
import { TypePrimitiveException } from '../../exceptions/type-primitive.exception';

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

export abstract class CompositeField {
  static of(spec: FieldSpec): CompositeField {
    if (Array.isArray(spec)) {
      return new ListField(CompositeField.of(spec[0]));
    }
    const fieldClass = spec as FieldClass;
    return CompositeBrand.isComposite(fieldClass.prototype)
      ? new NestedCompositeField(fieldClass as CompositeClass)
      : new ValueField(fieldClass as ValueClass);
  }

  abstract readonly typeName: string;

  abstract accept(path: string, value: unknown): unknown;

  abstract fromPrimitive(primitive: unknown): unknown;

  abstract toPrimitive(value: unknown): unknown;

  abstract equals(left: unknown, right: unknown): boolean;
}

abstract class SingleField<Class extends FieldClass> extends CompositeField {
  constructor(protected readonly fieldClass: Class) {
    super();
  }

  get typeName(): string {
    return this.fieldClass.name;
  }

  accept(path: string, value: unknown): unknown {
    if (value === null || value === undefined) {
      throw new RequiredValueException(path, value);
    }
    if (!(value instanceof this.fieldClass)) {
      throw new TypePrimitiveException(`${this.typeName} for ${path}`, value);
    }
    return value;
  }

  equals(left: unknown, right: unknown): boolean {
    return (left as Comparable).equals(right);
  }
}

class ValueField extends SingleField<ValueClass> {
  fromPrimitive(primitive: unknown): unknown {
    return new this.fieldClass(primitive);
  }

  toPrimitive(value: unknown): unknown {
    return (value as AbstractType<unknown>).value;
  }
}

class NestedCompositeField extends SingleField<CompositeClass> {
  fromPrimitive(primitive: unknown): unknown {
    return this.fieldClass.fromPrimitives(primitive);
  }

  toPrimitive(value: unknown): unknown {
    return (value as WithPrimitives).toPrimitives();
  }
}

class ListField extends CompositeField {
  constructor(private readonly item: CompositeField) {
    super();
  }

  get typeName(): string {
    return `list of ${this.item.typeName}`;
  }

  accept(path: string, value: unknown): unknown {
    if (!Array.isArray(value)) {
      throw new TypePrimitiveException(`${this.typeName} for ${path}`, value);
    }
    return Object.freeze(value.map((item, index) => this.item.accept(`${path}.${index}`, item)));
  }

  fromPrimitive(primitive: unknown): unknown {
    if (!Array.isArray(primitive)) {
      throw new TypePrimitiveException(this.typeName, primitive);
    }
    return CompositeIssues.collectItems(primitive, (item) => this.item.fromPrimitive(item));
  }

  toPrimitive(value: unknown): unknown {
    return (value as readonly unknown[]).map((item) => this.item.toPrimitive(item));
  }

  equals(left: unknown, right: unknown): boolean {
    const items = left as readonly unknown[];
    return (
      Array.isArray(right) &&
      items.length === right.length &&
      items.every((item, index) => this.item.equals(item, right[index]))
    );
  }
}
