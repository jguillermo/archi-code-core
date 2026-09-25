/**
 * Regression tests for the defects found in the validation audit (§4 of the audit report).
 * Each block names the defect number it pins down.
 */
import { describe, expect, it } from '@jest/globals';
import validator from '../../src/validators';
import * as sanitizer from '../../src/sanitizer';
import { createValidator } from '../../src/createValidator';
import { ValidationConfigError } from '../../src/validators/util/errors';
import escapeRegExp from '../../src/validators/util/escapeRegExp';
import BoundedCache from '../../src/validators/util/boundedCache';
import checkHost from '../../src/validators/util/checkHost';
import { scorePassword } from '../../src/validators/isStrongPassword';

describe('#1 isEmail blacklisted_chars — taken literally, never as regex syntax', () => {
  it.each(['\\', ']', '^', '-', '[', '.*'])('%p does not throw', (chars) => {
    expect(() => validator.isEmail('a@b.com', { blacklisted_chars: chars })).not.toThrow();
  });
  it('matches the literal characters only', () => {
    expect(validator.isEmail('a.b@c.com', { blacklisted_chars: '.' })).toBe(false);
    expect(validator.isEmail('ab@c.com', { blacklisted_chars: '.' })).toBe(true);
    expect(validator.isEmail('a-b@c.com', { blacklisted_chars: 'a-c' })).toBe(false); // literal '-'
    // 'b' would be inside a regex range a-c; taken literally it is allowed
    expect(validator.isEmail('bx@c.com', { blacklisted_chars: 'a-c' })).toBe(true);
  });
});

describe('#2 sanitizer blacklist / whitelist / ltrim / rtrim — chars are literal', () => {
  it('special characters never throw', () => {
    expect(sanitizer.blacklist('a\\b]c', '\\]')).toBe('abc');
    expect(sanitizer.whitelist('a\\b]c', '\\]')).toBe('\\]');
  });
  it("'a-c' means the three characters a, - and c (not a range)", () => {
    expect(sanitizer.blacklist('abc-d', 'a-c')).toBe('bd');
    expect(sanitizer.whitelist('abc-d', 'a-c')).toBe('ac-');
    expect(sanitizer.ltrim('-a-b', 'a-')).toBe('b');
    expect(sanitizer.rtrim('b-a-', 'a-')).toBe('b');
  });
  it('empty chars are a no-op (blacklist) / remove everything (whitelist)', () => {
    expect(sanitizer.blacklist('abc', '')).toBe('abc');
    expect(sanitizer.whitelist('abc', '')).toBe('');
  });
  it('stripLow keeps working without relying on regex ranges in blacklist', () => {
    expect(sanitizer.stripLow('a\u0000b\nc\u007f')).toBe('abc');
    expect(sanitizer.stripLow('a\u0000b\nc\r', true)).toBe('ab\nc\r');
  });
  it('escapeRegExp escapes every meta character', () => {
    const meta = '.*+?^${}()|[]\\-';
    expect(new RegExp(`^${escapeRegExp(meta)}$`).test(meta)).toBe(true);
  });
});

describe('#8 isInt — exact bounds beyond Number.MAX_SAFE_INTEGER', () => {
  it('compares big integers exactly (BigInt)', () => {
    expect(validator.isInt('9007199254740993', { max: 9007199254740992 })).toBe(false);
    expect(validator.isInt('9007199254740993', { min: 9007199254740992 })).toBe(true);
    expect(validator.isInt('9007199254740993', { gt: 9007199254740992 })).toBe(true);
    expect(validator.isInt('9007199254740993', { lt: 9007199254740992 })).toBe(false);
    expect(validator.isInt('-9007199254740993', { min: -9007199254740992 })).toBe(false);
    expect(validator.isInt('9007199254740992', { max: 9007199254740992 })).toBe(true); // equal
  });
  it('big integers against non-integer bounds fall back to numeric comparison', () => {
    expect(validator.isInt('9007199254740993', { min: 10.5 })).toBe(true);
    expect(validator.isInt('9007199254740993', { max: 10.5 })).toBe(false);
  });
  it('unbounded big integers stay valid', () => {
    expect(validator.isInt('123456789012345678901234567890')).toBe(true);
  });
});

describe('#11 isRFC3339 — calendar validation', () => {
  it.each([
    '2024-02-30T00:00:00Z',
    '2023-02-29T00:00:00Z',
    '2024-04-31T00:00:00Z',
    '1900-02-29T00:00:00Z',
  ])('%s → false', (s) => expect(validator.isRFC3339(s)).toBe(false));
  it.each(['2024-02-29T00:00:00Z', '2000-02-29T23:59:60Z', '2024-12-31T23:59:59.999+01:00'])(
    '%s → true',
    (s) => expect(validator.isRFC3339(s)).toBe(true),
  );
  it('isISO8601 strict rejects impossible dates; non-strict keeps syntax-only (documented)', () => {
    expect(validator.isISO8601('2024-02-30', { strict: true })).toBe(false);
    expect(validator.isISO8601('2024-02-30')).toBe(true);
  });
});

describe('#13 isDivisibleBy — decimal notation only', () => {
  it('hex/binary literals are not numbers here', () => {
    expect(validator.isDivisibleBy('0x10', 2)).toBe(false);
    expect(validator.isDivisibleBy('0b100', 2)).toBe(false);
    expect(validator.isDivisibleBy('16', 2)).toBe(true);
  });
});

describe('#15 isDate — configurable two-digit-year pivot', () => {
  it('twoDigitYearPivot makes the century deterministic', () => {
    // 29/02/00 → 2000 (leap) when pivot > 0; → 1900 (not leap) when pivot = 0
    expect(validator.isDate('29/02/00', { format: 'DD/MM/YY', twoDigitYearPivot: 50 })).toBe(true);
    expect(validator.isDate('29/02/00', { format: 'DD/MM/YY', twoDigitYearPivot: 0 })).toBe(false);
  });
});

describe('#16 checkHost — stateful (g/y) regexes give stable results', () => {
  it('same host matches on every call', () => {
    const re = /^foo\.com$/g;
    expect(checkHost('foo.com', [re])).toBe(true);
    expect(checkHost('foo.com', [re])).toBe(true);
    expect(checkHost('foo.com', [re])).toBe(true);
  });
});

describe('#17 isURL host_whitelist — whitelisted hosts must still be valid hosts', () => {
  it('whitelist narrows, never bypasses, host validation', () => {
    expect(validator.isURL('http://foo.com/', { host_whitelist: ['foo.com'] })).toBe(true);
    expect(validator.isURL('http://foo_bar/', { host_whitelist: [/.*/] })).toBe(false);
    expect(validator.isURL('http://qux.com/', { host_whitelist: ['foo.com'] })).toBe(false);
  });
});

describe('#18 isStrongPassword — Unicode aware', () => {
  it('ñ/Ñ are letters, € ¿ are symbols', () => {
    expect(validator.isStrongPassword('Ñandú1€x')).toBe(true);
    expect(validator.isStrongPassword('ñandú12¿A')).toBe(true);
  });
  it('length counts characters (code points), not UTF-16 units', () => {
    // 7 characters, one of them astral: must fail minLength 8
    expect(validator.isStrongPassword('Aa1!😀bc')).toBe(false);
    expect(validator.isStrongPassword('Aa1!😀bcd')).toBe(true);
  });
  it('characters outside every class (e.g. CJK) count for nothing', () => {
    expect(validator.isStrongPassword('中中中中中中中中', { returnScore: true })).toBe(1 + 7 * 0.5);
  });
});

describe('scorePassword — numeric score without overloading isStrongPassword', () => {
  it('matches the deprecated returnScore path and handles non-strings', () => {
    expect(scorePassword('Aa1!Aa1!')).toBe(
      validator.isStrongPassword('Aa1!Aa1!', { returnScore: true }),
    );
    expect(scorePassword('abc', { pointsPerUnique: 2, pointsForContainingLower: 0 })).toBe(6);
    expect(scorePassword(null)).toBe(0);
  });
});

describe('#19 isLength — optional grapheme counting', () => {
  it('graphemes: true counts user-perceived characters', () => {
    const family = '👨‍👩‍👧';
    expect(validator.isLength(family, { max: 1 })).toBe(false);
    expect(validator.isLength(family, { max: 1, graphemes: true })).toBe(true);
    expect(validator.isLength('é', { min: 1, max: 1, graphemes: true })).toBe(true);
  });
});

describe('B.3 hostile options', () => {
  it('isCurrency escapes symbol and separators completely', () => {
    expect(validator.isCurrency('(€)1', { symbol: '(€)', require_symbol: true })).toBe(true);
    expect(validator.isCurrency('€1', { symbol: '(€)', require_symbol: true })).toBe(false);
    // 's' as thousands separator must not become the regex class \s
    expect(validator.isCurrency('1 000', { thousands_separator: 's' })).toBe(false);
    expect(validator.isCurrency('1s000', { thousands_separator: 's' })).toBe(true);
  });
  it('isCurrency rejects malformed options with ValidationConfigError', () => {
    expect(() => validator.isCurrency('1', { symbol: 5 as never })).toThrow(ValidationConfigError);
    expect(() => validator.isCurrency('1', { digits_after_decimal: ['2}' as never] })).toThrow(
      ValidationConfigError,
    );
    expect(() => validator.isCurrency('1', { digits_after_decimal: [] })).toThrow(
      ValidationConfigError,
    );
  });
  it('isDecimal validates decimal_digits before interpolating it', () => {
    expect(() => validator.isDecimal('1.5', { decimal_digits: '1}|.*' })).toThrow(
      ValidationConfigError,
    );
    expect(() => validator.isDecimal('1.5', { decimal_digits: 2 as never })).toThrow(
      ValidationConfigError,
    );
    expect(validator.isDecimal('1.55', { decimal_digits: '2' })).toBe(true);
    expect(validator.isDecimal('1.5', { decimal_digits: '2,3' })).toBe(false);
  });
  it('BoundedCache evicts the least recently used entry at its limit', () => {
    const cache = new BoundedCache<number>(2);
    cache.getOrCreate('a', () => 1);
    cache.getOrCreate('b', () => 2);
    cache.getOrCreate('a', () => -1); // hit → 'a' becomes most recent
    cache.getOrCreate('c', () => 3); // evicts 'b'
    expect(cache.size).toBe(2);
    expect(cache.getOrCreate('a', () => -1)).toBe(1);
    expect(cache.getOrCreate('b', () => 22)).toBe(22); // was evicted → recreated
  });
  it('currency regex cache stays bounded under per-request option variety', () => {
    for (let i = 0; i < 1000; i++) validator.isCurrency('1', { symbol: `S${i}` });
    // no assertion on internals beyond "does not throw / grow unbounded": BoundedCache caps at 256
    expect(validator.isCurrency('S999 1', { symbol: 'S999', allow_space_after_symbol: true })).toBe(
      true,
    );
  });
});

describe('immutability', () => {
  it('the validator registry and its locale lists are frozen', () => {
    expect(Object.isFrozen(validator)).toBe(true);
    expect(Object.isFrozen(validator.isAlphaLocales)).toBe(true);
    expect(() => {
      (validator as unknown as Record<string, unknown>).isEmail = () => true;
    }).toThrow(TypeError);
  });
  it('createValidator extends without mutating the singleton', () => {
    const custom = createValidator({ isAnswer: (v: unknown) => v === 42 });
    expect(custom.isAnswer(42)).toBe(true);
    expect(custom.isEmail('a@b.com')).toBe(true);
    expect((validator as unknown as Record<string, unknown>).isAnswer).toBeUndefined();
  });
});
