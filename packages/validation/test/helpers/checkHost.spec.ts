import { checkHost } from '../../src/helpers/checkHost';

describe('#16 checkHost — stateful (g/y) regexes give stable results', () => {
  it('same host matches on every call', () => {
    const re = /^foo\.com$/g;
    expect(checkHost('foo.com', [re])).toBe(true);
    expect(checkHost('foo.com', [re])).toBe(true);
    expect(checkHost('foo.com', [re])).toBe(true);
  });
});
