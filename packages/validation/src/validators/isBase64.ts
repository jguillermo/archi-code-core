import { toString } from '../convert/string';
import { merge } from '../helpers/merge';

export interface IsBase64Options {
  urlSafe?: boolean;
  padding?: boolean;
}

const base64WithPadding = /^[A-Za-z0-9+/]+={0,2}$/;
const base64WithoutPadding = /^[A-Za-z0-9+/]+$/;
const base64UrlWithPadding = /^[A-Za-z0-9_-]+={0,2}$/;
const base64UrlWithoutPadding = /^[A-Za-z0-9_-]+$/;

export function isBase64(str: unknown, options?: IsBase64Options): boolean {
  const stringResult = toString(str);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  options = merge(options, { urlSafe: false, padding: !options?.urlSafe });

  if (s === '') return true;

  if (options.padding && s.length % 4 !== 0) return false;

  let regex;
  if (options.urlSafe) {
    regex = options.padding ? base64UrlWithPadding : base64UrlWithoutPadding;
  } else {
    regex = options.padding ? base64WithPadding : base64WithoutPadding;
  }

  return (!options.padding || s.length % 4 === 0) && regex.test(s);
}
