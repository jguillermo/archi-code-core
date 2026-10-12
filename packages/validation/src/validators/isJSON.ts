import { toJsonValue } from '../convert/json';

export interface IsJSONOptions {
  allow_primitives?: boolean;
  allow_any_value?: boolean;
}

export function isJSON(value: unknown, options?: IsJSONOptions): boolean {
  return toJsonValue(value, {
    allowPrimitives: options?.allow_primitives,
    allowAnyValue: options?.allow_any_value,
  }).ok;
}
