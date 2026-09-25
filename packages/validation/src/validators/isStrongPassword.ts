import merge from './util/merge';
import { toString } from '../convert/string';

export interface IsStrongPasswordOptions {
  minLength?: number;
  minLowercase?: number;
  minUppercase?: number;
  minNumbers?: number;
  minSymbols?: number;
  returnScore?: boolean;
  pointsPerUnique?: number;
  pointsPerRepeat?: number;
  pointsForContainingLower?: number;
  pointsForContainingUpper?: number;
  pointsForContainingNumber?: number;
  pointsForContainingSymbol?: number;
}

// Unicode-aware classes: 'Ñ'/'ñ' count as upper/lower case, '€'/'¿' as symbols, etc.
// Every ASCII symbol of the historic set (including space) is in \p{P} ∪ \p{S} ∪ \p{Zs}.
const upperCaseRegex = /^\p{Lu}$/u;
const lowerCaseRegex = /^\p{Ll}$/u;
const numberRegex = /^\p{Nd}$/u;
const symbolRegex = /^[\p{P}\p{S}\p{Zs}]$/u;

const defaultOptions = {
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
  returnScore: false,
  pointsPerUnique: 1,
  pointsPerRepeat: 0.5,
  pointsForContainingLower: 10,
  pointsForContainingUpper: 10,
  pointsForContainingNumber: 10,
  pointsForContainingSymbol: 10,
};

/* Counts occurrences of each character (code point, so emoji/astral chars count once). */
function countChars(chars: string[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const char of chars) {
    result.set(char, (result.get(char) ?? 0) + 1);
  }
  return result;
}

/* Return information about a password */
function analyzePassword(password: string): {
  length: number;
  uniqueChars: number;
  uppercaseCount: number;
  lowercaseCount: number;
  numberCount: number;
  symbolCount: number;
} {
  const chars = Array.from(password);
  const charMap = countChars(chars);
  const analysis = {
    // Length in characters (code points), consistent with how unique characters are counted.
    length: chars.length,
    uniqueChars: charMap.size,
    uppercaseCount: 0,
    lowercaseCount: 0,
    numberCount: 0,
    symbolCount: 0,
  };
  charMap.forEach((count, char) => {
    if (upperCaseRegex.test(char)) {
      analysis.uppercaseCount += count;
    } else if (lowerCaseRegex.test(char)) {
      analysis.lowercaseCount += count;
    } else if (numberRegex.test(char)) {
      analysis.numberCount += count;
    } else if (symbolRegex.test(char)) {
      analysis.symbolCount += count;
    }
  });
  return analysis;
}

function scorePasswordAnalysis(
  analysis: {
    uniqueChars: number;
    length: number;
    lowercaseCount: number;
    uppercaseCount: number;
    numberCount: number;
    symbolCount: number;
  },
  scoringOptions: typeof defaultOptions,
): number {
  let points = 0;
  points += analysis.uniqueChars * scoringOptions.pointsPerUnique;
  points += (analysis.length - analysis.uniqueChars) * scoringOptions.pointsPerRepeat;
  if (analysis.lowercaseCount > 0) {
    points += scoringOptions.pointsForContainingLower;
  }
  if (analysis.uppercaseCount > 0) {
    points += scoringOptions.pointsForContainingUpper;
  }
  if (analysis.numberCount > 0) {
    points += scoringOptions.pointsForContainingNumber;
  }
  if (analysis.symbolCount > 0) {
    points += scoringOptions.pointsForContainingSymbol;
  }
  return points;
}

/**
 * Numeric strength score of a password (see the `points*` options for the weights).
 * Returns 0 for values that cannot be read as a string.
 */
export function scorePassword(str: unknown, options?: IsStrongPasswordOptions): number {
  const stringResult = toString(str);
  if (!stringResult.ok) return 0;
  const s = stringResult.value;
  const mergedOptions = merge(options || {}, defaultOptions) as typeof defaultOptions;
  return scorePasswordAnalysis(analyzePassword(s), mergedOptions);
}

/** @deprecated `returnScore: true` — use `scorePassword()` to get the numeric score. */
export default function isStrongPassword(
  str: unknown,
  options: IsStrongPasswordOptions & { returnScore: true },
): number | false;
export default function isStrongPassword(
  str: unknown,
  options?: IsStrongPasswordOptions & { returnScore?: false },
): boolean;
export default function isStrongPassword(
  str: unknown,
  options?: IsStrongPasswordOptions,
): boolean | number {
  const stringResult = toString(str);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const analysis = analyzePassword(s);
  const mergedOptions = merge(options || {}, defaultOptions) as typeof defaultOptions;
  if (mergedOptions.returnScore) {
    return scorePasswordAnalysis(analysis, mergedOptions);
  }
  return (
    analysis.length >= mergedOptions.minLength &&
    analysis.lowercaseCount >= mergedOptions.minLowercase &&
    analysis.uppercaseCount >= mergedOptions.minUppercase &&
    analysis.numberCount >= mergedOptions.minNumbers &&
    analysis.symbolCount >= mergedOptions.minSymbols
  );
}
