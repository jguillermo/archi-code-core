import { escapeRegExp } from '../../src/helpers/escapeRegExp';

describe('#2 sanitizer blacklist / whitelist / ltrim / rtrim — chars are literal', () => {
  it('escapeRegExp escapes every meta character', () => {
    const meta = '.*+?^${}()|[]\\-';
    expect(new RegExp(`^${escapeRegExp(meta)}$`).test(meta)).toBe(true);
  });
});
