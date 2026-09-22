import type { IsLengthOptions } from '../types';
import tryToString from './util/tryToString';

export default function isLength(
  str: unknown,
  optionsOrMin?: IsLengthOptions | number,
  maxArg?: number,
): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  let min: number;
  let max: number | undefined;

  if (typeof optionsOrMin === 'object') {
    min = optionsOrMin.min || 0;
    max = optionsOrMin.max;
  } else {
    // backwards compatibility: isLength(str, min [, max])
    min = optionsOrMin || 0;
    max = maxArg;
  }

  const presentationSequences = s.match(/[^\uFE0F\uFE0E][\uFE0F\uFE0E]/g) || [];
  const surrogatePairs = s.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g) || [];
  const len = s.length - presentationSequences.length - surrogatePairs.length;
  const isInsideRange = len >= min && (typeof max === 'undefined' || len <= max);

  if (
    isInsideRange &&
    typeof optionsOrMin === 'object' &&
    Array.isArray(optionsOrMin?.discreteLengths)
  ) {
    return optionsOrMin.discreteLengths.some((discreteLen) => discreteLen === len);
  }

  return isInsideRange;
}
