const VALUE_OBJECT: unique symbol = Symbol.for('@archi-code/ddd/value-object.v1');
const VALUE_KIND: unique symbol = Symbol.for('@archi-code/ddd/value-kind.v1');

export type ValueKind = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array';

export class ValueObjectBrand {
  static brandClass(valueObjectClass: Function): void {
    Object.defineProperty(valueObjectClass.prototype, VALUE_OBJECT, { value: true });
  }

  static brandKind(valueObjectClass: Function, kind: ValueKind): void {
    Object.defineProperty(valueObjectClass, VALUE_KIND, { value: kind });
  }

  static isValueObject(candidate: unknown): candidate is { readonly value: unknown } {
    return (
      typeof candidate === 'object' &&
      candidate !== null &&
      (candidate as Record<symbol, unknown>)[VALUE_OBJECT] === true
    );
  }

  static kindOf(valueObjectClass: unknown): ValueKind | null {
    if (typeof valueObjectClass !== 'function') {
      return null;
    }
    const kind = (valueObjectClass as unknown as Record<symbol, unknown>)[VALUE_KIND];
    return typeof kind === 'string' ? (kind as ValueKind) : null;
  }
}
