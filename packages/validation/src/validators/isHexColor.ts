import { toString } from '../convert/string';
import { merge } from '../helpers/merge';

export interface IsHexColorOptions {
  /** When true the leading `#` is mandatory. */
  require_hashtag?: boolean;
}

const hexcolor = /^#?([0-9A-F]{3}|[0-9A-F]{4}|[0-9A-F]{6}|[0-9A-F]{8})$/i;
const hexcolor_with_prefix = /^#([0-9A-F]{3}|[0-9A-F]{4}|[0-9A-F]{6}|[0-9A-F]{8})$/i;

const default_is_hexcolor_options = {
  require_hashtag: false,
};

export function isHexColor(input: unknown, options?: IsHexColorOptions): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  options = merge(options, default_is_hexcolor_options);

  const hexcolor_regex = options.require_hashtag ? hexcolor_with_prefix : hexcolor;
  return hexcolor_regex.test(str);
}
