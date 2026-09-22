import isInt from './isInt';

export default function isPort(str: unknown): boolean {
  return isInt(str, { allow_leading_zeroes: false, min: 0, max: 65535 });
}
