const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function decodeBase64(text: string): Uint8Array<ArrayBuffer> {
  const values = new Uint8Array(128);
  for (let index = 0; index < ALPHABET.length; index++) {
    values[ALPHABET.charCodeAt(index)] = index;
  }
  const length = text.length;
  const bytes = new Uint8Array(Math.floor((length * 3) / 4));
  let written = 0;
  for (let index = 0; index + 3 < length; index += 4) {
    const chunk =
      (values[text.charCodeAt(index)] << 18) |
      (values[text.charCodeAt(index + 1)] << 12) |
      (values[text.charCodeAt(index + 2)] << 6) |
      values[text.charCodeAt(index + 3)];
    bytes[written++] = chunk >> 16;
    if (text[index + 2] !== '=') bytes[written++] = (chunk >> 8) & 255;
    if (text[index + 3] !== '=') bytes[written++] = chunk & 255;
  }
  return bytes.subarray(0, written);
}
