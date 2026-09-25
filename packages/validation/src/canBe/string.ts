import { toString } from '../convert/string';

/** Strings, booleans and finite numbers. */
export function canBeString(v: unknown): boolean {
  return toString(v).ok;
}
