import { toString } from '../convert/string';

export interface IsLengthOptions {
  min?: number;
  max?: number;
  discreteLengths?: number[];
  /** Count user-perceived characters (grapheme clusters, via `Intl.Segmenter`). Default: false. */
  graphemes?: boolean;
}

/** Historic count: code points, with emoji presentation selectors (U+FE0E/U+FE0F) not counted. */
function countCharacters(s: string): number {
  const presentationSequences = s.match(/[^\uFE0F\uFE0E][\uFE0F\uFE0E]/g) || [];
  const surrogatePairs = s.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g) || [];
  return s.length - presentationSequences.length - surrogatePairs.length;
}

let segmenter: Intl.Segmenter | undefined;

/** User-perceived characters (extended grapheme clusters): '👨‍👩‍👧' or 'é' (e + ◌́) count as 1. */
function countGraphemes(s: string): number {
  segmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return Array.from(segmenter.segment(s)).length;
}

export function isLength(
  str: unknown,
  optionsOrMin?: IsLengthOptions | number,
  maxArg?: number,
): boolean {
  const stringResult = toString(str);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
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

  const len =
    typeof optionsOrMin === 'object' && optionsOrMin.graphemes
      ? countGraphemes(s)
      : countCharacters(s);
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
