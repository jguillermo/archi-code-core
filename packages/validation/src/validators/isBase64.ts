import type { IsBase64Options } from '../types';
import tryToString from './util/tryToString';
import merge from './util/merge';

const base64WithPadding = /^[A-Za-z0-9+/]+={0,2}$/;
const base64WithoutPadding = /^[A-Za-z0-9+/]+$/;
const base64UrlWithPadding = /^[A-Za-z0-9_-]+={0,2}$/;
const base64UrlWithoutPadding = /^[A-Za-z0-9_-]+$/;

export default function isBase64(str: unknown, options?: IsBase64Options): boolean {
  const s = tryToString(str);
  if (s === false) return false;
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
