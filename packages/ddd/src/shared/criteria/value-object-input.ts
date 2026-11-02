import { CriteriaError, quote } from './criteria-error';
import { ValueObjectBrand } from '../value-object/value-object-brand';

export type WhereSource = 'value-objects' | 'primitives';

export function isValueObject(value: unknown): value is { readonly value: unknown } {
  return ValueObjectBrand.isValueObject(value);
}

export function readValue(value: unknown, field: string, source: WhereSource): unknown {
  if (source === 'primitives') {
    return value;
  }
  if (!isValueObject(value)) {
    throw new CriteriaError('INVALID_VALUE', `Field "${quote(field)}" needs a value object`);
  }
  return value.value;
}
