import { describe, expect, it } from '@jest/globals';
import { escapeRegex } from '../../src/mongodb/escape-regex';

describe('escapeRegex', () => {
  it('escapes every character with a meaning in a regular expression', () => {
    const special = '.*+?^${}()|[]\\/-';
    expect(new RegExp(`^${escapeRegex(special)}$`).test(special)).toBe(true);
    expect(escapeRegex('a.b*c')).toBe('a\\.b\\*c');
  });

  it('leaves letters, digits and spaces as they are', () => {
    expect(escapeRegex('Ana María 21')).toBe('Ana María 21');
  });
});
