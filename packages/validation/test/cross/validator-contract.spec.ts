/**
 * Cross-cutting contract of the validator tool:
 *
 *  1. It NEVER throws because of the value: any input yields a boolean.
 *  2. It throws ONLY for invalid configuration, always as `ValidationConfigError`.
 *  3. Prototype keys (`'toString'`, `'__proto__'`…) used as locale/option never crash it.
 */
import { describe, expect, it } from '@jest/globals';
import { validator } from '../../src/validators';
import { ValidationConfigError } from '../../src/helpers/errors';

const HOSTILE_VALUES: unknown[] = [
  null,
  undefined,
  true,
  false,
  0,
  -0,
  1,
  NaN,
  Infinity,
  -Infinity,
  '',
  ' ',
  'a',
  '\u0000',
  '𝒳',
  {},
  [],
  ['a'],
  { toString: () => 'x' },
  Symbol('s'),
  BigInt(10),
  new String('a'),
  new Date(),
  new Date('invalid'),
  () => 'a',
  /a/,
  new Map(),
  'x'.repeat(10_000),
];

/** Extra (valid) configuration arguments required by some validators. */
const CONFIG_ARGS: Record<string, unknown[]> = {
  equals: ['a'],
  contains: ['a'],
  matches: [/a/],
  isHash: ['md5'],
  isIn: [['a']],
  isWhitelisted: ['abc'],
  isDivisibleBy: [2],
  isPostalCode: ['any'],
  isLicensePlate: ['any'],
  isVAT: ['GB'],
  isPassportNumber: ['US'],
};

const validatorFns = Object.entries(validator).filter(([, fn]) => typeof fn === 'function') as [
  string,
  (...a: unknown[]) => unknown,
][];

describe('validator contract', () => {
  it('covers every validator in the registry', () => {
    expect(validatorFns.length).toBeGreaterThan(80);
  });

  describe('1. never throws because of the value — always returns a boolean', () => {
    it.each(validatorFns.map(([name, fn]) => [name, fn] as const))('%s', (name, fn) => {
      for (const v of HOSTILE_VALUES) {
        let result: unknown;
        expect(() => {
          result = fn(v, ...(CONFIG_ARGS[name] ?? []));
        }).not.toThrow();
        expect({
          name,
          input: String(typeof v === 'symbol' ? v.toString() : typeof v),
          type: typeof result,
        }).toEqual({
          name,
          input: String(typeof v === 'symbol' ? v.toString() : typeof v),
          type: 'boolean',
        });
      }
    });
  });

  describe('2. invalid configuration → ValidationConfigError', () => {
    const cases: [string, () => unknown][] = [
      ['isAlpha unknown locale', () => validator.isAlpha('a', 'xx-XX')],
      ['isAlpha bad ignore', () => validator.isAlpha('a', 'en-US', { ignore: 5 as never })],
      ['isAlphanumeric unknown locale', () => validator.isAlphanumeric('a', 'xx-XX')],
      [
        'isAlphanumeric bad ignore',
        () => validator.isAlphanumeric('a', 'en-US', { ignore: 5 as never }),
      ],
      ['isDecimal unknown locale', () => validator.isDecimal('1', { locale: 'xx-XX' })],
      ['isFloat unknown locale', () => validator.isFloat('1', { locale: 'xx-XX' })],
      ['isNumeric unknown locale', () => validator.isNumeric('1', { locale: 'xx-XX' })],
      ['isMobilePhone unknown locale', () => validator.isMobilePhone('1', 'xx-XX')],
      ['isPostalCode unknown locale', () => validator.isPostalCode('1', 'xx-XX')],
      ['isIdentityCard unknown locale', () => validator.isIdentityCard('1', 'xx-XX')],
      ['isLicensePlate unknown locale', () => validator.isLicensePlate('1', 'xx-XX')],
      ['isVAT unknown country', () => validator.isVAT('1', 'XX')],
      ['isVAT non-string country', () => validator.isVAT('1', 5 as never)],
      ['isCreditCard unknown provider', () => validator.isCreditCard('1', { provider: 'foo' })],
      [
        'isCreditCard non-string provider',
        () => validator.isCreditCard('1', { provider: 5 as never }),
      ],
      ['isHash unknown algorithm', () => validator.isHash('a', 'sha999')],
      ['isTime unknown hourFormat', () => validator.isTime('1:00', { hourFormat: 'x' as never })],
      ['isTime unknown mode', () => validator.isTime('1:00', { mode: 'x' as never })],
      ['isPassportNumber non-string country', () => validator.isPassportNumber('1', 5 as never)],
    ];
    it.each(cases)('%s', (_label, call) => {
      expect(call).toThrow(ValidationConfigError);
    });

    it('config errors are thrown even for values that would be rejected anyway', () => {
      expect(() => validator.isHash(null, 'nope')).toThrow(ValidationConfigError);
      expect(() => validator.isNumeric(null, { locale: 'nope' })).toThrow(ValidationConfigError);
    });

    it('ValidationConfigError is a named Error', () => {
      const e = new ValidationConfigError('m');
      expect(e).toBeInstanceOf(Error);
      expect(e.name).toBe('ValidationConfigError');
    });
  });

  describe('3. prototype keys as locale/option never crash', () => {
    const PROTO_KEYS = ['toString', 'constructor', '__proto__', 'hasOwnProperty', 'valueOf'];

    it.each(PROTO_KEYS)('%s', (key) => {
      const configFns: (() => unknown)[] = [
        () => validator.isAlpha('a', key),
        () => validator.isAlphanumeric('a', key),
        () => validator.isDecimal('1', { locale: key }),
        () => validator.isFloat('1', { locale: key }),
        () => validator.isNumeric('1', { locale: key }),
        () => validator.isMobilePhone('1', key),
        () => validator.isPostalCode('1', key),
        () => validator.isIdentityCard('1', key),
        () => validator.isLicensePlate('1', key),
        () => validator.isVAT('1', key),
        () => validator.isCreditCard('4111111111111111', { provider: key }),
        () => validator.isHash('a', key),
      ];
      for (const call of configFns) {
        try {
          call();
        } catch (e) {
          expect(e).toBeInstanceOf(ValidationConfigError);
        }
      }
      // These return false for unknown keys by design.
      expect(validator.isUUID('a', key as never)).toBe(false);
      expect(validator.isPassportNumber('790369937', key)).toBe(false);
      expect(validator.isIBAN('GB82WEST12345698765432', { whitelist: [key] })).toBe(false);
    });
  });

  describe('regressions', () => {
    it('isPassportNumber country code is case-insensitive (used to crash with lowercase)', () => {
      expect(validator.isPassportNumber('790369937', 'us')).toBe(true);
      expect(validator.isPassportNumber('790369937', 'US')).toBe(true);
    });

    it('isBoolean / isTime tolerate null options', () => {
      expect(validator.isBoolean('true', null as never)).toBe(true);
      expect(validator.isTime('10:30', null as never)).toBe(true);
    });

    it('isMACAddress does not mutate the caller options', () => {
      const opts = { eui: 48 as const };
      validator.isMACAddress('01:02:03:04:05:ab', opts);
      expect(opts.eui).toBe(48);
    });

    it('isTime coerces like the rest of the validators (numbers never match a time)', () => {
      expect(validator.isTime(1030)).toBe(false);
    });
  });
});
