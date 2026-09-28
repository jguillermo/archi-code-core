import { isInt } from './isInt';

export function isPort(value: unknown): boolean {
  return isInt(value, { allow_leading_zeroes: false, min: 0, max: 65535 });
}
