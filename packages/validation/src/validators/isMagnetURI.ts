import coerceToString from './util/coerceToString';

const magnetURIComponent =
  /(?:^magnet:\?|[^?&]&)xt(?:\.1)?=urn:(?:(?:aich|bitprint|btih|ed2k|ed2khash|kzhash|md5|sha1|tree:tiger):[a-z0-9]{32}(?:[a-z0-9]{8})?|btmh:1220[a-z0-9]{64})(?:$|&)/i;

export default function isMagnetURI(url) {
  const s = coerceToString(url);
  if (s === false) return false;
  url = s;

  if (url.indexOf('magnet:?') !== 0) {
    return false;
  }

  return magnetURIComponent.test(url);
}
