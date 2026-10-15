import { describe, expect, it } from '@jest/globals';
import { Criteria } from '../src/criteria';
import { CriteriaError } from '../src/criteria-error';
import { DEFAULT_CRITERIA_LIMITS } from '../src/criteria-limits';
import { decodeUrlText, encodeUrlText } from '../src/criteria-url';
import { UserPrimitives } from './support/user';

const URL_SAFE = /^[A-Za-z0-9_-]+$/;

function codeOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    return (error as CriteriaError).code;
  }
  return 'NO_ERROR';
}

describe('Criteria URL text', () => {
  it('uses only characters that need no escaping in a URL', () => {
    const criteria = Criteria.create<UserPrimitives>({
      where: {
        name: { contains: 'año ñandú 🚀 ?&=/+#%' },
        'address.city': { in: ['Cádiz', 'A Coruña'] },
        createdAt: { lt: new Date('2024-01-01T00:00:00Z') },
      },
      orderBy: { name: 'desc' },
      limit: 50,
    });
    const text = criteria.toUrl();
    expect(text).toMatch(URL_SAFE);
    expect(encodeURIComponent(text)).toBe(text);
    expect(Criteria.fromUrl<UserPrimitives>(text).equals(criteria)).toBe(true);
    expect(Criteria.fromUrl<UserPrimitives>(text).filter).toEqual(criteria.filter);
  });

  it('gives the same text for the same criteria', () => {
    const build = () =>
      Criteria.create<UserPrimitives>({ where: { status: 'active' }, orderBy: { id: 'asc' } });
    expect(build().toUrl()).toBe(build().toUrl());
  });

  it('encodes an empty criteria', () => {
    expect(Criteria.fromUrl(Criteria.create().toUrl()).filter).toBeNull();
  });

  it('round trips every padding length', () => {
    for (const value of ['a', 'ab', 'abc', 'abcd']) {
      expect(decodeUrlText(encodeUrlText({ value }))).toEqual({ value });
    }
  });

  it('checks the result with a schema when one is given', () => {
    const limited = Criteria.create({ limit: 1 });
    const schema = { limits: DEFAULT_CRITERIA_LIMITS, check: () => limited };
    expect(Criteria.fromUrl(Criteria.create().toUrl(), schema)).toBe(limited);
  });

  it.each([
    ['', 'INVALID_TEXT'],
    ['abc=', 'INVALID_TEXT'],
    ['a+b/', 'INVALID_TEXT'],
    ['abcde', 'INVALID_TEXT'],
    ['_w', 'INVALID_TEXT'],
    [encodeUrlText('x').slice(0, -1), 'INVALID_TEXT'],
    [encodeUrlText([1]), 'INVALID_FORMAT'],
    [encodeUrlText({ v: 9 }), 'UNSUPPORTED_VERSION'],
  ])('rejects %j', (text, code) => {
    expect(codeOf(() => Criteria.fromUrl(text))).toBe(code);
  });

  it('keeps the parse error as the cause of INVALID_TEXT', () => {
    const notJson = encodeUrlText('x').slice(0, -1);
    let error: unknown = null;
    try {
      decodeUrlText(notJson);
    } catch (thrown) {
      error = thrown;
    }
    expect(error).toBeInstanceOf(CriteriaError);
    expect((error as CriteriaError).cause).toBeInstanceOf(SyntaxError);
    expect(codeOf(() => decodeUrlText(5))).toBe('INVALID_TEXT');
  });

  it('rejects text that is not a string', () => {
    expect(codeOf(() => decodeUrlText(5))).toBe('INVALID_TEXT');
  });
});
