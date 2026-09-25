import tryToString from './util/tryToString';
import merge from './util/merge';
import type { IsHexColorOptions } from '../types';

const hexcolor = /^#?([0-9A-F]{3}|[0-9A-F]{4}|[0-9A-F]{6}|[0-9A-F]{8})$/i;
const hexcolor_with_prefix = /^#([0-9A-F]{3}|[0-9A-F]{4}|[0-9A-F]{6}|[0-9A-F]{8})$/i;

const default_is_hexcolor_options = {
  require_hashtag: false,
};

export default function isHexColor(input: unknown, options?: IsHexColorOptions): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;
  options = merge(options, default_is_hexcolor_options);

  const hexcolor_regex = options.require_hashtag ? hexcolor_with_prefix : hexcolor;
  return hexcolor_regex.test(str);
}
