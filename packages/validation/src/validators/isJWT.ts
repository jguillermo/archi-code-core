import tryToString from './util/tryToString';
import isBase64 from './isBase64';

export default function isJWT(str) {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;

  const dotSplit = str.split('.');
  const len = dotSplit.length;

  if (len !== 3) {
    return false;
  }

  return dotSplit.reduce((acc, currElem) => acc && isBase64(currElem, { urlSafe: true }), true);
}
