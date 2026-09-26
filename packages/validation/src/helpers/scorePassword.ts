import { merge } from './merge';
import { analyzePassword } from './analyzePassword';
import { toString } from '../convert/string';

export interface ScorePasswordOptions {
  pointsPerUnique?: number;
  pointsPerRepeat?: number;
  pointsForContainingLower?: number;
  pointsForContainingUpper?: number;
  pointsForContainingNumber?: number;
  pointsForContainingSymbol?: number;
}

const defaultOptions = {
  pointsPerUnique: 1,
  pointsPerRepeat: 0.5,
  pointsForContainingLower: 10,
  pointsForContainingUpper: 10,
  pointsForContainingNumber: 10,
  pointsForContainingSymbol: 10,
};

/**
 * Numeric strength score of a password (see the `points*` options for the weights).
 * Returns 0 for values that cannot be read as a string.
 */
export function scorePassword(str: unknown, options?: ScorePasswordOptions): number {
  const stringResult = toString(str);
  if (!stringResult.ok) return 0;
  const analysis = analyzePassword(stringResult.value);
  const scoringOptions = merge(options || {}, defaultOptions) as typeof defaultOptions;
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
