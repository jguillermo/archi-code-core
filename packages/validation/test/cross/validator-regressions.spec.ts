/**
 * Regression guard for the production-readiness blockers found in the 2026-09-25 review (security
 * false positives and values that made a validator throw). It lives in cross/ because the mirror
 * specs in test/validators are frozen.
 */
import { describe, expect, it } from '@jest/globals';
import { validator } from '../../src/validators';
import { ValidationConfigError } from '../../src/validators/util/errors';

describe('isURL — host checks cannot be bypassed', () => {
  it('rejects a backslash in the authority (browsers read it as "/")', () => {
    expect(validator.isURL('http://evil.com\\@good.com', { host_whitelist: ['good.com'] })).toBe(
      false,
    );
    expect(validator.isURL('https://evil.com\\@good.com', { host_blacklist: ['evil.com'] })).toBe(
      false,
    );
    expect(validator.isURL('http:\\\\evil.com')).toBe(false);
    expect(validator.isURL('http://good.com/path\\file')).toBe(true);
  });

  it('matches hosts case-insensitively and ignoring one trailing dot', () => {
    expect(validator.isURL('http://EVIL.com', { host_blacklist: ['evil.com'] })).toBe(false);
    expect(validator.isURL('http://evil.com', { host_blacklist: ['EVIL.COM'] })).toBe(false);
    expect(
      validator.isURL('http://evil.com.', {
        host_blacklist: ['evil.com'],
        allow_trailing_dot: true,
      }),
    ).toBe(false);
    expect(validator.isURL('http://evil.com', { host_blacklist: ['evil.com.'] })).toBe(false);
    expect(validator.isURL('http://Good.COM', { host_whitelist: ['good.com'] })).toBe(true);
    expect(validator.isURL('http://sub.EVIL.com', { host_blacklist: [/\.evil\.com$/] })).toBe(
      false,
    );
  });

  it('checks bracketed IPv6 hosts against the whitelist by their address', () => {
    expect(validator.isURL('http://[::1]', { host_whitelist: ['::1'] })).toBe(true);
    expect(validator.isURL('http://[::1]', { host_whitelist: [''] })).toBe(false);
    // An empty host (only allowed with require_host: false) is checked as ''.
    expect(
      validator.isURL('http://user@', { require_host: false, host_whitelist: ['good.com'] }),
    ).toBe(false);
    expect(validator.isURL('http://user@', { require_host: false, host_whitelist: [''] })).toBe(
      true,
    );
  });

  it('rejects invisible / bidi characters in the host', () => {
    for (const cp of ['​', '‍', '‮', '⁦', '﻿', '­', '　', ' ']) {
      expect(validator.isURL(`http://exa${cp}mple.com`)).toBe(false);
    }
    expect(validator.isURL('http://例子.测试')).toBe(true);
  });
});

describe('isFQDN — invisible characters', () => {
  it('rejects format, separator and unpaired surrogate code points', () => {
    expect(validator.isFQDN('exa​mple.com')).toBe(false);
    expect(validator.isFQDN('example.co​m')).toBe(false);
    expect(validator.isFQDN('exa‮mple.com')).toBe(false);
    expect(validator.isFQDN('exa\uD800mple.com')).toBe(false);
    expect(validator.isFQDN('müller.de')).toBe(true);
    expect(validator.isFQDN('💩.la')).toBe(true);
  });
});

describe('isEmail — quoted local part and hostile input', () => {
  it('rejects CR, LF, DEL and C0 controls inside quotes (header injection)', () => {
    expect(validator.isEmail('"\r\nBcc: x@evil.com"@c.com')).toBe(false);
    expect(validator.isEmail('"a\nb"@example.com')).toBe(false);
    expect(validator.isEmail('"a\x7f"@example.com')).toBe(false);
    expect(validator.isEmail('"a\x01"@example.com')).toBe(false);
    expect(validator.isEmail('"a\\\r"@example.com')).toBe(false);
    expect(validator.isEmail('"a\r\nb"@example.com', { allow_utf8_local_part: false })).toBe(false);
  });

  it('keeps accepting spaces, tabs and quoted pairs', () => {
    expect(validator.isEmail('"  foo  bar  "@example.com')).toBe(true);
    expect(validator.isEmail('"a\tb"@example.com')).toBe(true);
    expect(validator.isEmail('"foo\\@bar"@example.com')).toBe(true);
    expect(validator.isEmail('"foo\\"bar"@example.com', { allow_utf8_local_part: false })).toBe(
      true,
    );
  });

  it('never throws on unpaired surrogates', () => {
    expect(() => validator.isEmail('\uD800@example.com')).not.toThrow();
    expect(validator.isEmail('a@exa\uD800mple.com')).toBe(false);
  });

  it('rejects invisible characters in the domain', () => {
    expect(validator.isEmail('a@exa​mple.com')).toBe(false);
  });
});

describe('isByteLength — UTF-8 length without encodeURI', () => {
  it('counts bytes like TextEncoder and never throws', () => {
    expect(validator.isByteLength('\uD800', { min: 3, max: 3 })).toBe(true);
    expect(validator.isByteLength('a\uDC00b', { min: 5, max: 5 })).toBe(true);
    expect(validator.isByteLength('😀', { min: 4, max: 4 })).toBe(true);
    expect(validator.isByteLength('\uD83D', { min: 3, max: 3 })).toBe(true);
    expect(validator.isByteLength('é€', { min: 5, max: 5 })).toBe(true);
  });
});

describe('isFloat / isInt — no non-finite successes', () => {
  it('isFloat rejects forms without digits and values beyond the number range', () => {
    expect(validator.isFloat('.e5')).toBe(false);
    expect(validator.isFloat('e5')).toBe(false);
    expect(validator.isFloat('1e400')).toBe(false);
    expect(validator.isFloat('1e308')).toBe(true);
  });

  it('isFloat reads the locale separator correctly (bounds see the right value)', () => {
    expect(validator.isFloat('1٫5', { locale: 'ar-SA', min: 1.4, max: 1.6 })).toBe(true);
    expect(validator.isFloat('1,5', { locale: 'de-DE', min: 1.4, max: 1.6 })).toBe(true);
  });

  it('isInt still accepts integers too large for a number and compares them exactly', () => {
    const huge = '9'.repeat(400);
    expect(validator.isInt(huge)).toBe(true);
    expect(validator.isInt(`-${huge}`)).toBe(true);
    expect(validator.isInt(huge, { max: 10 })).toBe(false);
    expect(validator.isInt(huge, { min: 10 })).toBe(true);
    expect(validator.isInt(huge, { lt: 1.5 })).toBe(false);
    expect(validator.isInt(`-${huge}`, { lt: 1.5 })).toBe(true);
  });
});

describe('isDate — unusable format options do not throw', () => {
  it('format delimiter not among `delimiters` → false', () => {
    expect(validator.isDate('2024.01.02', { format: 'YYYY.MM.DD' })).toBe(false);
    expect(validator.isDate('2024.01.02', { format: 'YYYY.MM.DD', delimiters: ['.'] })).toBe(true);
  });
});

describe('anchored alternations — no trailing / leading garbage', () => {
  it('isCreditCard mastercard', () => {
    expect(validator.isCreditCard('510510510510510000')).toBe(false);
    expect(
      validator.isCreditCard(`51051051051051${'0'.repeat(86)}`, { provider: 'mastercard' }),
    ).toBe(false);
    expect(validator.isCreditCard('5105105105105100', { provider: 'mastercard' })).toBe(true);
    expect(validator.isCreditCard('2221000000000009', { provider: 'mastercard' })).toBe(true);
  });

  it('isISO6346', () => {
    expect(validator.isISO6346('garbage!!J1234567')).toBe(false);
    expect(validator.isISO6346('HLXU2008419 lorem ipsum')).toBe(false);
    expect(validator.isISO6346('ABC,1234567')).toBe(false);
    expect(validator.isISO6346('HLXU2008419')).toBe(true);
  });

  it('isLicensePlate pt-BR / fi-FI', () => {
    expect(validator.isLicensePlate('ABC1D23<script>', 'pt-BR')).toBe(false);
    expect(validator.isLicensePlate('<script>ABC1234', 'pt-BR')).toBe(false);
    expect(validator.isLicensePlate('<script>ABC1234', 'any')).toBe(false);
    expect(validator.isLicensePlate('ABC1D23', 'pt-BR')).toBe(true);
    expect(validator.isLicensePlate('ABC-1234', 'pt-BR')).toBe(true);
    expect(validator.isLicensePlate('ABC-12345', 'fi-FI')).toBe(false);
    expect(validator.isLicensePlate('ABC-123', 'fi-FI')).toBe(true);
  });

  it('isPassportNumber MZ / PH', () => {
    expect(validator.isPassportNumber('AB1234567XYZ!!', 'MZ')).toBe(false);
    expect(validator.isPassportNumber('garbage12AB12345', 'MZ')).toBe(false);
    expect(validator.isPassportNumber('AB1234567', 'MZ')).toBe(true);
    expect(validator.isPassportNumber('12AB12345', 'MZ')).toBe(true);
    expect(validator.isPassportNumber('A123456garbage', 'PH')).toBe(false);
    expect(validator.isPassportNumber('A123456', 'PH')).toBe(true);
    expect(validator.isPassportNumber('A1234567B', 'PH')).toBe(true);
    expect(validator.isPassportNumber('AB1234567', 'PH')).toBe(true);
  });
});

describe('isLatLong — exactly two components', () => {
  it('rejects anything after a second comma', () => {
    expect(validator.isLatLong('1,2,<script>')).toBe(false);
    expect(validator.isLatLong('1,2,3', { checkDMS: true })).toBe(false);
    expect(validator.isLatLong('40.7128,-74.0060')).toBe(true);
    expect(validator.isLatLong('(40.7128, -74.0060)')).toBe(true);
  });
});

describe('configuration contract — only ValidationConfigError, null means "no options"', () => {
  const v = validator as unknown as Record<string, (...a: unknown[]) => unknown>;
  const configError = (fn: () => unknown): void => expect(fn).toThrow(ValidationConfigError);

  it('null options behave like undefined', () => {
    expect(v.isAlpha('abc', 'en-US', null)).toBe(true);
    expect(v.isAlphanumeric('abc1', 'en-US', null)).toBe(true);
    expect(v.isCreditCard('4111111111111111', null)).toBe(true);
    expect(v.isByteLength('abc', null)).toBe(true);
    expect(v.isLength('abc', null)).toBe(true);
    expect(v.isIBAN('DE89370400440532013000', null)).toBe(true);
    expect(v.isIP('127.0.0.1', null)).toBe(true);
    expect(v.isISBN('9780306406157', null)).toBe(true);
    expect(v.isISSN('0378-5955', null)).toBe(true);
    expect(v.isISO8601('2024-01-31', null)).toBe(true);
    expect(v.isISO31661Alpha2('ES', null)).toBe(true);
    expect(v.isISO31661Alpha3('ESP', null)).toBe(true);
    expect(v.isRgbColor('rgb(1,2,3)', null)).toBe(true);
    expect(v.isIn('a', null)).toBe(false);
  });

  it('impossible configuration throws ValidationConfigError (never TypeError / SyntaxError)', () => {
    configError(() => v.isAlpha('abc', Symbol('x')));
    configError(() => v.isMobilePhone('123', Symbol('x')));
    configError(() => v.isLicensePlate('123', Symbol('x')));
    configError(() => v.isAlpha('abc', 'en-US', 'not-an-object'));
    configError(() => v.isLength('abc', Symbol('x')));
    configError(() => v.isLength('abc', 1, Symbol('x')));
    configError(() => v.isByteLength('abc', { max: {} }));
    configError(() => v.isIn('a', 5));
    configError(() => v.isWhitelisted('a', null));
    configError(() => v.isWhitelisted('a', 5));
    configError(() => v.matches('a', '('));
    configError(() => v.matches('a', 'a', 'zz'));
    configError(() => v.matches('a', null));
    configError(() => v.isDecimal('1.23', { decimal_digits: '5,2' }));
    configError(() => v.isDecimal('1.23', { decimal_digits: '99999999' }));
    configError(() => v.isIBAN('DE89370400440532013000', { whitelist: 'DE' }));
    configError(() => v.isIBAN('DE89370400440532013000', { blacklist: 'XDEX' }));
    configError(() => v.isIBAN('DE89370400440532013000', { whitelist: [1] }));
    configError(() => v.isMobilePhone('+34612345678', ['es-ES', 'xx-XX']));
  });

  it('error messages never throw while formatting the bad value', () => {
    expect(() => v.isIdentityCard('1', Symbol('x'))).toThrow(/Symbol\(x\)/);
  });

  it('isEmail: host lists must be arrays, blacklisted_chars a string', () => {
    configError(() => v.isEmail('a@evil.com', { host_blacklist: 'evil.com' }));
    configError(() => v.isEmail('a@evil.com', { host_whitelist: 'good.com' }));
    configError(() => v.isEmail('a@b.com', { blacklisted_chars: ['x'] }));
    expect(v.isEmail('a@evil.com', { host_blacklist: [/evil/] })).toBe(false);
    expect(v.isEmail('a@EVIL.com', { host_blacklist: ['evil.com'] })).toBe(false);
    expect(v.isEmail('a@b.com', { host_blacklist: null })).toBe(true);
  });

  it('isURL: protocols must be an array, max_allowed_length a number, host lists arrays', () => {
    configError(() => v.isURL('ht://x.com', { protocols: 'http' }));
    configError(() => v.isURL('http://x.com', { protocols: [1] }));
    configError(() => v.isURL('http://x.com', { max_allowed_length: 'abc' }));
    configError(() => v.isURL('http://x.com', { host_whitelist: [1] }));
    configError(() => v.isURL('http://x.com', { host_blacklist: 'x.com' }));
    expect(v.isURL('http://x.com', { max_allowed_length: 'abc', validate_length: false })).toBe(
      true,
    );
    expect(v.isURL('http://*.example.com', { allow_wildcard: true })).toBe(true);
  });

  it('isIBAN: country lists are case-insensitive; unknown whitelist codes still reject', () => {
    expect(v.isIBAN('DE89370400440532013000', { whitelist: ['de'] })).toBe(true);
    expect(v.isIBAN('DE89370400440532013000', { blacklist: ['de'] })).toBe(false);
    expect(v.isIBAN('DE89370400440532013000', { whitelist: ['XX'] })).toBe(false);
    expect(v.isIBAN('DE89370400440532013000', { whitelist: null })).toBe(true);
  });

  it('matches: a sticky RegExp gives stable results', () => {
    const sticky = /a/y;
    expect([v.matches('a', sticky), v.matches('a', sticky), v.matches('a', sticky)]).toEqual([
      true,
      true,
      true,
    ]);
  });
});

describe('isEmail — length limits and display name', () => {
  it('only a truthy ignore_max_length skips the 64/254-byte limits', () => {
    const longUser = `${'a'.repeat(65)}@example.com`;
    expect(validator.isEmail(longUser)).toBe(false);
    expect(validator.isEmail(longUser, { ignore_max_length: null as unknown as boolean })).toBe(
      false,
    );
    expect(validator.isEmail(longUser, { ignore_max_length: 0 as unknown as boolean })).toBe(false);
    expect(validator.isEmail(longUser, { ignore_max_length: true })).toBe(true);
  });

  it('a display name requires the closing ">"', () => {
    expect(validator.isEmail('Name <a@b.com', { allow_display_name: true })).toBe(false);
    expect(validator.isEmail('Name <a@b.com>', { allow_display_name: true })).toBe(true);
  });
});

describe('isAlpha / isAlphanumeric — ignore', () => {
  it('ignore characters are literal', () => {
    expect(validator.isAlpha('Жs', 'ru-RU', { ignore: 's' })).toBe(true);
    expect(validator.isAlpha('a b', 'en-US', { ignore: 's' })).toBe(false);
    expect(validator.isAlpha('a-b^c]', 'en-US', { ignore: '-^]' })).toBe(true);
    expect(validator.isAlphanumeric('a1 b', 'en-US', { ignore: 's' })).toBe(false);
    expect(validator.isAlphanumeric('a1s', 'ru-RU', { ignore: 's' })).toBe(false);
  });

  it('a sticky ignore RegExp gives stable results', () => {
    const results = [0, 1, 2].map(() => validator.isAlpha('-a', 'en-US', { ignore: /-/y }));
    expect(results).toEqual([true, true, true]);
    const results2 = [0, 1, 2].map(() =>
      validator.isAlphanumeric('-a1', 'en-US', { ignore: /-/y }),
    );
    expect(results2).toEqual([true, true, true]);
  });
});

describe('false positives', () => {
  it('isMongoId rejects 0x / 0h prefixes', () => {
    expect(validator.isMongoId(`0x${'a'.repeat(22)}`)).toBe(false);
    expect(validator.isMongoId(`0h${'a'.repeat(22)}`)).toBe(false);
    expect(validator.isMongoId('507f1f77bcf86cd799439011')).toBe(true);
  });

  it('isVAT: escaped dots, no commas in classes, no empty HN, no underscores in CY', () => {
    expect(validator.isVAT('', 'HN')).toBe(false);
    expect(validator.isVAT('12a345b678/0001-90', 'BR')).toBe(false);
    expect(validator.isVAT('12a345b678c9-012d345', 'ID')).toBe(false);
    expect(validator.isVAT('VE,-123456789', 'VE')).toBe(false);
    expect(validator.isVAT(',-23-45678-9', 'DO')).toBe(false);
    expect(validator.isVAT('_________', 'CY')).toBe(false);
  });

  it('isISO8601 strict accepts years 0000-0099', () => {
    expect(validator.isISO8601('0050-01-31', { strict: true })).toBe(true);
    expect(validator.isISO8601('0001-01-01', { strict: true })).toBe(true);
    expect(validator.isISO8601('0050-02-30', { strict: true })).toBe(false);
  });
});
