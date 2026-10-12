import { toBoolean } from '../convert/boolean';

export interface IsBooleanOptions {
  loose?: boolean;
}

export function isBoolean(value: unknown, options?: IsBooleanOptions): boolean {
  return toBoolean(value, { mode: options?.loose ? 'loose' : 'strict' }).ok;
}
