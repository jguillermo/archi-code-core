import { toString } from '../convert/string';

// The {1,100} subtype bound is this library's own limit, not taken from the RFCs.
const mimeTypeSimple =
  /^(application|audio|font|image|message|model|multipart|text|video)\/[a-zA-Z0-9.\-+_]{1,100}$/i;

const mimeTypeText =
  /^text\/[a-zA-Z0-9.\-+]{1,100};\s?charset=("[a-zA-Z0-9.\-+\s]{0,70}"|[a-zA-Z0-9.\-+]{0,70})(\s?\([a-zA-Z0-9.\-+\s]{1,20}\))?$/i;

const mimeTypeMultipart =
  /^multipart\/[a-zA-Z0-9.\-+]{1,100}(;\s?(boundary|charset)=("[a-zA-Z0-9.\-+\s]{0,70}"|[a-zA-Z0-9.\-+]{0,70})(\s?\([a-zA-Z0-9.\-+\s]{1,20}\))?){0,2}$/i;

export function isMimeType(value: unknown): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return mimeTypeSimple.test(str) || mimeTypeText.test(str) || mimeTypeMultipart.test(str);
}
