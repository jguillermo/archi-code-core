import { describe, expect, it } from '@jest/globals';
import { decodeBase64 } from '../../src/wasm/base64';

describe('decodeBase64', () => {
  it.each([
    ['', []],
    ['YQ==', [97]],
    ['YWI=', [97, 98]],
    ['YWJj', [97, 98, 99]],
    ['+/8A', [251, 255, 0]],
  ])('decodes %p', (text, bytes) => {
    expect([...decodeBase64(text)]).toEqual(bytes);
  });

  it('decodes the same bytes as Buffer', () => {
    const bytes = Uint8Array.from({ length: 1000 }, (_, index) => (index * 37) % 256);
    const text = Buffer.from(bytes).toString('base64');
    expect(decodeBase64(text)).toEqual(bytes);
  });
});
