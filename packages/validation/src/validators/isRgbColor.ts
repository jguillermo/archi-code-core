import { toString } from '../convert/string';

const rgbColor =
  /^rgb\((([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5]),){2}([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\)$/;
const rgbaColor =
  /^rgba\((([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5]),){3}(0?\.\d\d?|1(\.0)?|0(\.0)?)\)$/;
const rgbColorPercent = /^rgb\((([0-9]%|[1-9][0-9]%|100%),){2}([0-9]%|[1-9][0-9]%|100%)\)$/;
const rgbaColorPercent = /^rgba\((([0-9]%|[1-9][0-9]%|100%),){3}(0?\.\d\d?|1(\.0)?|0(\.0)?)\)$/;
const startsWithRgb = /^rgba?/;

export default function isRgbColor(
  input: unknown,
  options?: { allowSpaces?: boolean; includePercentValues?: boolean },
): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  let str: string = s;
  // default options to true for percent and false for spaces
  let allowSpaces = false;
  let includePercentValues = true;
  if (typeof options === 'object') {
    allowSpaces = options.allowSpaces !== undefined ? options.allowSpaces : allowSpaces;
    includePercentValues =
      options.includePercentValues !== undefined
        ? options.includePercentValues
        : includePercentValues;
  }

  if (allowSpaces) {
    // make sure it starts with continuous rgba? without spaces before stripping
    if (!startsWithRgb.test(str)) {
      return false;
    }
    // strip all whitespace
    str = str.replace(/\s/g, '');
  }

  if (!includePercentValues) {
    return rgbColor.test(str) || rgbaColor.test(str);
  }

  return (
    rgbColor.test(str) ||
    rgbaColor.test(str) ||
    rgbColorPercent.test(str) ||
    rgbaColorPercent.test(str)
  );
}
