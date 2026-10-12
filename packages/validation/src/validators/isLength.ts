import { toString } from '../convert/string';
import { boundsOf } from '../helpers/config';

export interface IsLengthOptions {
  min?: number;
  max?: number;
  discreteLengths?: number[];
  graphemes?: boolean;
}

function countCodePointsWithoutPresentationSelectors(s: string): number {
  const presentationSequences = s.match(/[^\uFE0F\uFE0E][\uFE0F\uFE0E]/g) || [];
  const surrogatePairs = s.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g) || [];
  return s.length - presentationSequences.length - surrogatePairs.length;
}

let segmenter: Intl.Segmenter | undefined;

function countGraphemes(s: string): number {
  segmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return Array.from(segmenter.segment(s)).length;
}

export function isLength(value: unknown, options?: IsLengthOptions): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const { options: opts, min, max } = boundsOf(options);

  const len = opts.graphemes ? countGraphemes(s) : countCodePointsWithoutPresentationSelectors(s);
  const isInsideRange = len >= min && (typeof max === 'undefined' || len <= max);

  if (isInsideRange && Array.isArray(opts.discreteLengths)) {
    return opts.discreteLengths.some((discreteLen) => discreteLen === len);
  }

  return isInsideRange;
}
