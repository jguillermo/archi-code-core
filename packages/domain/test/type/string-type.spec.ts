import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Validations } from '@archi-code/validation';
import type { ValidationResult } from '@archi-code/validation';
import { StringType } from '../../src/type/string-type';
import { AbstractType, Required } from '../../src/type/abstract-type';
import { TypePrimitiveException } from '../../src/exceptions/domain/type-primitive.exception';
import { RequiredValueException } from '../../src/exceptions/domain/required-value.exception';
import { ValidationException } from '../../src/exceptions/domain/validation.exception';

class CustomerName extends Required(StringType) {}
class Nickname extends StringType {}
class MiddleName extends StringType {}

@Validations([{ validator: 'isEmail' }])
class Email extends Required(StringType) {}

const formInputs: [string, unknown, string][] = [
  ['a plain name', 'random', 'random'],
  ['a name with accents', 'áéíóú', 'áéíóú'],
  ['a name with digits', 'abc123', 'abc123'],
  ['a name with surrounding spaces, kept as typed', ' padded ', ' padded '],
  ['a zero typed as text', '0', '0'],
  ['a negative decimal typed as text', '-1.1', '-1.1'],
  ['the word true', 'true', 'true'],
  ['the number 0 from a JSON body', 0, '0'],
  ['the number 1 from a JSON body', 1, '1'],
  ['a negative number from a JSON body', -1, '-1'],
  ['a decimal from a JSON body', 1.5, '1.5'],
  ['a negative decimal from a JSON body', -1.5, '-1.5'],
  ['a true checkbox value', true, 'true'],
  ['a false checkbox value', false, 'false'],
];

const blankFormFields: [string, unknown][] = [
  ['a field sent as null', null],
  ['a field left out of the request', undefined],
  ['an empty text box', ''],
  ['a text box with only spaces', '   '],
  ['a text area with only tabs and line breaks', '\t\n\r\n'],
];

const brokenClientInputs: [string, unknown, string][] = [
  ['an object', { a: 123 }, '{"a":123}'],
  ['an empty list', [], '[]'],
  ['a list of numbers', [1, 2, 3], '[1,2,3]'],
  ['NaN', NaN, 'NaN'],
  ['Infinity', Infinity, 'Infinity'],
  ['-Infinity', -Infinity, '-Infinity'],
  ['a symbol', Symbol('123'), 'Symbol(123)'],
  ['a Date', new Date('2020-01-01T00:00:00.000Z'), 'Date(2020-01-01T00:00:00.000Z)'],
  ['a regular expression', /test/, 'RegExp(/test/)'],
  ['an Error', new Error('data error'), 'new Error(data error)'],
  ['a pending promise', Promise.resolve('data'), 'Promise'],
  ['a Map', new Map([[1, 2]]), 'Map({1: 2})'],
  ['a Set', new Set([1, 2]), 'Set(1, 2)'],
  ['a function', function named() {}, 'Function(named)'],
  ['a BigInt', BigInt(10), '10'],
];

function primitiveError(received: string): string {
  return `Validation Error: Expected a valid String, but received ${received}.`;
}

function requiredError(typeName: string, received: string): string {
  return `Validation Error: ${typeName} is required, but received ${received}.`;
}

function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}

function couponCodes() {
  const isShortCode = vi.fn(
    (value: unknown) => typeof value === 'string' && value.length >= 2 && value.length <= 5,
  );

  @Validations([{ custom: 'isShortCode', fn: isShortCode }])
  class CouponCode extends StringType {}

  @Validations([{ custom: 'isShortCode', fn: isShortCode }])
  class ReferralCode extends Required(StringType) {}

  return { CouponCode, ReferralCode, isShortCode };
}

const shortCodeError = { custom: 'isShortCode', message: 'Value does not satisfy isShortCode' };

describe('StringType', () => {
  describe('an optional nickname', () => {
    it('is typed as string | null, built from a string, null or nothing', () => {
      expectTypeOf<Nickname>().toMatchTypeOf<AbstractType<string>>();
      expectTypeOf<ConstructorParameters<typeof Nickname>>().toEqualTypeOf<
        [value?: string | null]
      >();
      expectTypeOf<Nickname['value']>().toEqualTypeOf<string | null>();
      expectTypeOf<Nickname['validate']>().toEqualTypeOf<() => ValidationResult<string | null>>();
    });

    it('cannot be used as a plain string without checking for null', () => {
      // @ts-expect-error an optional value may be null
      const text: string = new Nickname('Ana').value;
      expect(text).toBe('Ana');
    });

    it.each(formInputs)('keeps %s as text', (_, input, expected) => {
      expect(new Nickname(input as string).value).toBe(expected);
    });

    it.each(blankFormFields)('stores %s as null', (_, input) => {
      expect(new Nickname(input as string).value).toBeNull();
      expect(new Nickname(input as string).isNull).toBe(true);
    });

    it('is null when the form does not send it at all', () => {
      expect(new Nickname().value).toBeNull();
    });

    it.each(brokenClientInputs)(
      'rejects %s sent by a broken client with TypePrimitiveException',
      (_, input, received) => {
        const create = () => new Nickname(input as string);
        expect(create).toThrow(TypePrimitiveException);
        expect(create).toThrow(primitiveError(received));
      },
    );

    it.each(formInputs)('is valid when it holds %s', (_, input, expected) => {
      expect(new Nickname(input as string).validate()).toEqual({
        ok: true,
        value: expected,
        errors: [],
      });
    });

    it.each(blankFormFields)('is valid as null when it comes from %s', (_, input) => {
      expect(new Nickname(input as string).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
    });
  });

  describe('a required customer name', () => {
    it('is typed as string and built only from a string', () => {
      expectTypeOf<ConstructorParameters<typeof CustomerName>>().toEqualTypeOf<[value: string]>();
      expectTypeOf<CustomerName['value']>().toEqualTypeOf<string>();
      expectTypeOf<CustomerName['validate']>().toEqualTypeOf<() => ValidationResult<string>>();
    });

    it('does not compile without a name, but still throws if one sneaks in at runtime', () => {
      // @ts-expect-error a required string needs a value
      expect(() => new CustomerName()).toThrow(RequiredValueException);
      // @ts-expect-error a required string does not accept null
      expect(() => new CustomerName(null)).toThrow(RequiredValueException);
      // @ts-expect-error a required string does not accept undefined
      expect(() => new CustomerName(undefined)).toThrow(RequiredValueException);
      // @ts-expect-error a required string does not accept a number
      expect(new CustomerName(1).value).toBe('1');
    });

    it.each(formInputs)('keeps %s typed in a sign-up form', (_, input, expected) => {
      expect(new CustomerName(input as string).value).toBe(expected);
      expect(new CustomerName(input as string).validate()).toEqual({
        ok: true,
        value: expected,
        errors: [],
      });
    });

    it.each(blankFormFields)(
      'rejects %s with a RequiredValueException naming the type',
      (_, input) => {
        const received = typeof input === 'string' ? `"${input}"` : 'null';
        const create = () => new CustomerName(input as string);
        expect(create).toThrow(RequiredValueException);
        expect(create).toThrow(requiredError('CustomerName', received));
      },
    );

    it('rejects an object sent instead of a name with TypePrimitiveException', () => {
      expect(() => new CustomerName({} as unknown as string)).toThrow(primitiveError('{}'));
    });

    it('does not make the plain StringType required', () => {
      expect(new StringType(null).validate()).toEqual({ ok: true, value: null, errors: [] });
    });
  });

  describe('a coupon code with its own rule', () => {
    it('accepts a short code and reports a long one', () => {
      const { CouponCode } = couponCodes();
      expect(new CouponCode('abc').validate()).toEqual({ ok: true, value: 'abc', errors: [] });
      expect(new CouponCode('123456').validate().errors).toEqual([shortCodeError]);
    });

    it.each(blankFormFields)(
      'is valid without running the rule when the shopper leaves %s',
      (_, input) => {
        const { CouponCode, isShortCode } = couponCodes();
        expect(new CouponCode(input as string).validate()).toEqual({
          ok: true,
          value: null,
          errors: [],
        });
        expect(isShortCode).not.toHaveBeenCalled();
      },
    );

    it('a required referral code runs the same rule', () => {
      const { ReferralCode } = couponCodes();
      expect(new ReferralCode('abc').validate()).toEqual({ ok: true, value: 'abc', errors: [] });
      expect(new ReferralCode('123456').validate().errors).toEqual([shortCodeError]);
    });
  });

  describe('an email checked before saving a customer', () => {
    it('returns the same instance when the email is valid', () => {
      const email = new Email('ana@example.com');
      expect(email.assertValid()).toBe(email);
    });

    it('throws ValidationException naming the type and listing the errors', () => {
      const assertValid = () => new Email('not-an-email').assertValid();
      expect(assertValid).toThrow(ValidationException);
      expect(assertValid).toThrow('Validation failed, Email: Value does not satisfy isEmail');
      expect(thrownBy(assertValid)).toMatchObject({
        errors: ['Email: Value does not satisfy isEmail'],
      });
    });
  });

  describe('comparing names', () => {
    it('two customer names with the same text are equal', () => {
      expect(new CustomerName('Ana').equals(new CustomerName('Ana'))).toBe(true);
    });

    it('two customer names with different text are not equal', () => {
      expect(new CustomerName('Ana').equals(new CustomerName('ana'))).toBe(false);
    });

    it('a nickname and a middle name with the same text are not equal', () => {
      expect(new Nickname('Ana').equals(new MiddleName('Ana'))).toBe(false);
    });

    it('two empty nicknames are equal', () => {
      expect(new Nickname(null).equals(new Nickname(''))).toBe(true);
    });

    it('a nickname is not equal to its plain text, null or undefined', () => {
      expect(new Nickname('Ana').equals('Ana')).toBe(false);
      expect(new Nickname('Ana').equals(null)).toBe(false);
      expect(new Nickname('Ana').equals(undefined)).toBe(false);
    });
  });

  describe('showing and serializing a name', () => {
    it.each([
      ['a name', new Nickname('Ana'), 'Ana'],
      ['an empty nickname', new Nickname('  '), ''],
    ])('toString() of %s gives %o', (_, nickname, text) => {
      expect(nickname.toString()).toBe(text);
    });

    it('can be used in a template literal for a greeting', () => {
      expect(`Hello, ${new CustomerName('Ana')}!`).toBe('Hello, Ana!');
      expect(`Nickname: ${new Nickname()}.`).toBe('Nickname: .');
    });

    it('serializes to its plain value inside an API response', () => {
      expect(JSON.stringify({ name: new CustomerName('Ana'), nickname: new Nickname() })).toBe(
        '{"name":"Ana","nickname":null}',
      );
    });
  });
});
