import tryToString from './util/tryToString';
import isBase64 from './isBase64';

export default function isJWT(input: unknown): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;

  const dotSplit = str.split('.');
  const len = dotSplit.length;

  if (len !== 3) {
    return false;
  }

  const [header, payload, signature] = dotSplit;
  // Header and payload are mandatory; the signature may be empty (unsecured JWT, `alg: none`).
  if (header === '' || payload === '') return false;
  return (
    isBase64(header, { urlSafe: true }) &&
    isBase64(payload, { urlSafe: true }) &&
    isBase64(signature, { urlSafe: true })
  );
}
