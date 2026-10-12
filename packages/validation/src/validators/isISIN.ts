import { toString } from '../convert/string';

const isin = /^[A-Z]{2}[0-9A-Z]{9}[0-9]$/;

// Check digit: https://www.isin.org/isin-format/ (Luhn over digits; a letter counts as two digits).

export function isISIN(value: unknown): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  if (!isin.test(str)) {
    return false;
  }

  let double = true;
  let sum = 0;
  for (let i = str.length - 2; i >= 0; i--) {
    if (str[i] >= 'A' && str[i] <= 'Z') {
      const code = str[i].charCodeAt(0) - 55;
      const lo = code % 10;
      const hi = Math.trunc(code / 10);
      for (const digit of [lo, hi]) {
        if (double) {
          if (digit >= 5) {
            sum += 1 + (digit - 5) * 2;
          } else {
            sum += digit * 2;
          }
        } else {
          sum += digit;
        }
        double = !double;
      }
    } else {
      const digit = str[i].charCodeAt(0) - '0'.charCodeAt(0);
      if (double) {
        if (digit >= 5) {
          sum += 1 + (digit - 5) * 2;
        } else {
          sum += digit * 2;
        }
      } else {
        sum += digit;
      }
      double = !double;
    }
  }

  const check = Math.trunc((sum + 9) / 10) * 10 - sum;

  return +str[str.length - 1] === check;
}
