import { toString } from '../convert/string';

const extlang = '([A-Za-z]{3}(-[A-Za-z]{3}){0,2})';

const language = `(([a-zA-Z]{2,3}(-${extlang})?)|([a-zA-Z]{5,8}))`;

const script = '([A-Za-z]{4})';

const region = '([A-Za-z]{2}|\\d{3})';

const variant = '([A-Za-z0-9]{5,8}|(\\d[A-Z-a-z0-9]{3}))';

const singleton = '(\\d|[A-W]|[Y-Z]|[a-w]|[y-z])';

const extension = `(${singleton}(-[A-Za-z0-9]{2,8})+)`;

const privateuse = '(x(-[A-Za-z0-9]{1,8})+)';

const irregular =
  '((en-GB-oed)|(i-ami)|(i-bnn)|(i-default)|(i-enochian)|' +
  '(i-hak)|(i-klingon)|(i-lux)|(i-mingo)|(i-navajo)|(i-pwn)|(i-tao)|' +
  '(i-tay)|(i-tsu)|(sgn-BE-FR)|(sgn-BE-NL)|(sgn-CH-DE))';

const regular =
  '((art-lojban)|(cel-gaulish)|(no-bok)|(no-nyn)|(zh-guoyu)|' +
  '(zh-hakka)|(zh-min)|(zh-min-nan)|(zh-xiang))';

const grandfathered = `(${irregular}|${regular})`;

// RFC 5646 delimits subtags with '-' only; '_' is kept for validator.js compatibility.
const delimiter = '(-|_)';

const langtag = `${language}(${delimiter}${script})?(${delimiter}${region})?(${delimiter}${variant})*(${delimiter}${extension})*(${delimiter}${privateuse})?`;

// BCP 47 language tags: https://www.rfc-editor.org/rfc/rfc5646.html
const languageTagRegex = new RegExp(`(^${privateuse}$)|(^${grandfathered}$)|(^${langtag}$)`);

export function isLocale(value: unknown): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return languageTagRegex.test(str);
}
