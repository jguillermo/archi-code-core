import { merge } from '../helpers/merge';
import { analyzePassword } from '../helpers/analyzePassword';
import { toString } from '../convert/string';

export interface IsStrongPasswordOptions {
  minLength?: number;
  minLowercase?: number;
  minUppercase?: number;
  minNumbers?: number;
  minSymbols?: number;
}

const defaultOptions = {
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
};

/** The numeric strength score lives in `scorePassword()` (src/helpers). */
export function isStrongPassword(str: unknown, options?: IsStrongPasswordOptions): boolean {
  const stringResult = toString(str);
  if (!stringResult.ok) return false;
  const analysis = analyzePassword(stringResult.value);
  const mergedOptions = merge(options || {}, defaultOptions) as typeof defaultOptions;
  return (
    analysis.length >= mergedOptions.minLength &&
    analysis.lowercaseCount >= mergedOptions.minLowercase &&
    analysis.uppercaseCount >= mergedOptions.minUppercase &&
    analysis.numberCount >= mergedOptions.minNumbers &&
    analysis.symbolCount >= mergedOptions.minSymbols
  );
}
