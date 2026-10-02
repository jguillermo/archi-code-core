import { describe, expect, it, jest } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { Validations } from '@archi-code/validation';
import type { ValidationResult } from '@archi-code/validation';
import { StringType } from './string-type';
import { AbstractType, Required } from './abstract-type';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';
import { RequiredValueException } from '../exceptions/domain/required-value.exception';

class RequiredString extends Required(StringType) {}

const convertibleInputs: [unknown, string][] = [
  ['random', 'random'],
  ['áéíóú', 'áéíóú'],
  ['abc123', 'abc123'],
  [' padded ', ' padded '],
  ['0', '0'],
  ['-1.1', '-1.1'],
  ['true', 'true'],
  [0, '0'],
  [1, '1'],
  [-1, '-1'],
  [1.5, '1.5'],
  [-1.5, '-1.5'],
  [true, 'true'],
  [false, 'false'],
];

const emptyInputs: [string, unknown][] = [
  ['null', null],
  ['undefined', undefined],
  ['an empty string', ''],
  ['only spaces', '   '],
  ['only tabs and line breaks', '\t\n\r\n'],
];

const notConvertibleInputs: [unknown, string][] = [
  [{ a: 123 }, '{"a":123}'],
  [[], '[]'],
  [[1, 2, 3], '[1,2,3]'],
  [NaN, 'NaN'],
  [Infinity, 'Infinity'],
  [-Infinity, '-Infinity'],
  [Symbol('123'), 'Symbol(123)'],
  [new Date('2020-01-01T00:00:00.000Z'), 'Date(2020-01-01T00:00:00.000Z)'],
  [/test/, 'RegExp(/test/)'],
  [new Error('data error'), 'new Error(data error)'],
  [Promise.resolve('data'), 'Promise'],
  [new Map([[1, 2]]), 'Map({1: 2})'],
  [new Set([1, 2]), 'Set(1, 2)'],
  [function named() {}, 'Function(named)'],
  [BigInt(10), '10'],
];

function primitiveError(received: string): string {
  return `Validation Error: Expected a valid String, but received ${received}.`;
}

function requiredError(received: string): string {
  return `Validation Error: RequiredString is required, but received ${received}.`;
}

function lengthCodes() {
  const isShortCode = jest.fn(
    (value: unknown) => typeof value === 'string' && value.length >= 2 && value.length <= 5,
  );

  @Validations([{ custom: 'isShortCode', fn: isShortCode }])
  class OptionalCode extends StringType {}

  @Validations([{ custom: 'isShortCode', fn: isShortCode }])
  class RequiredCode extends Required(StringType) {}

  return { OptionalCode, RequiredCode, isShortCode };
}

const shortCodeError = { custom: 'isShortCode', message: 'Value does not satisfy isShortCode' };

describe('StringType (optional)', () => {
  describe('typing', () => {
    it('is an AbstractType of string that takes a string, null or nothing and holds string | null', () => {
      expectTypeOf<StringType>().toMatchTypeOf<AbstractType<string>>();
      expectTypeOf<ConstructorParameters<typeof StringType>>().toEqualTypeOf<
        [value?: string | null]
      >();
      expectTypeOf<StringType['value']>().toEqualTypeOf<string | null>();
      expectTypeOf<StringType['validate']>().toEqualTypeOf<() => ValidationResult<string | null>>();
    });

    it('its value cannot be used as a plain string', () => {
      // @ts-expect-error an optional value may be null
      const text: string = new StringType('Ana').value;
      expect(text).toBe('Ana');
    });
  });

  describe('conversion', () => {
    it.each(convertibleInputs)('%p → %p', (input, expected) => {
      expect(new StringType(input as string).value).toBe(expected);
    });

    it.each(emptyInputs)('%s → null', (_, input) => {
      expect(new StringType(input as string).value).toBeNull();
    });

    it('no value → null', () => {
      expect(new StringType().value).toBeNull();
    });

    it.each(notConvertibleInputs)('%p throws TypePrimitiveException', (input, received) => {
      const create = () => new StringType(input as string);
      expect(create).toThrow(TypePrimitiveException);
      expect(create).toThrow(primitiveError(received));
    });
  });

  describe('validate', () => {
    it.each(convertibleInputs)('%p is valid as %p', (input, expected) => {
      expect(new StringType(input as string).validate()).toEqual({
        ok: true,
        value: expected,
        errors: [],
      });
    });

    it.each(emptyInputs)('%s is valid as null', (_, input) => {
      expect(new StringType(input as string).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
    });

    it('runs its validations on a value', () => {
      const { OptionalCode } = lengthCodes();
      expect(new OptionalCode('abc').validate()).toEqual({ ok: true, value: 'abc', errors: [] });
      expect(new OptionalCode('123456').validate().errors).toEqual([shortCodeError]);
    });

    it.each(emptyInputs)('%s is valid without running its validations', (_, input) => {
      const { OptionalCode, isShortCode } = lengthCodes();
      expect(new OptionalCode(input as string).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
      expect(isShortCode).not.toHaveBeenCalled();
    });
  });

  describe('isNull / toString', () => {
    it.each([
      ['a value', new StringType('Ana'), false, 'Ana'],
      ['an empty value', new StringType('  '), true, ''],
    ])('%s → isNull %s, toString %p', (_, instance, isNull, text) => {
      expect(instance.isNull).toBe(isNull);
      expect(instance.toString).toBe(text);
    });
  });
});

describe('Required(StringType)', () => {
  describe('typing', () => {
    it('takes only a string and holds a string', () => {
      expectTypeOf<ConstructorParameters<typeof RequiredString>>().toEqualTypeOf<[value: string]>();
      expectTypeOf<RequiredString['value']>().toEqualTypeOf<string>();
      expectTypeOf<RequiredString['validate']>().toEqualTypeOf<() => ValidationResult<string>>();
    });

    it('does not accept a missing value or a value of another type', () => {
      // @ts-expect-error a required string needs a value
      expect(() => new RequiredString()).toThrow(RequiredValueException);
      // @ts-expect-error a required string does not accept null
      expect(() => new RequiredString(null)).toThrow(RequiredValueException);
      // @ts-expect-error a required string does not accept undefined
      expect(() => new RequiredString(undefined)).toThrow(RequiredValueException);
      // @ts-expect-error a required string does not accept a number
      expect(new RequiredString(1).value).toBe('1');
    });
  });

  describe('construction', () => {
    it.each(convertibleInputs)('%p → %p', (input, expected) => {
      expect(new RequiredString(input as string).value).toBe(expected);
    });

    it.each(emptyInputs)('%s throws RequiredValueException', (_, input) => {
      const received = typeof input === 'string' ? `"${input}"` : 'null';
      const create = () => new RequiredString(input as string);
      expect(create).toThrow(RequiredValueException);
      expect(create).toThrow(requiredError(received));
    });

    it('throws TypePrimitiveException for a value that cannot be converted', () => {
      expect(() => new RequiredString({} as unknown as string)).toThrow(primitiveError('{}'));
    });
  });

  describe('validate', () => {
    it.each(convertibleInputs)('%p is valid as %p', (input, expected) => {
      expect(new RequiredString(input as string).validate()).toEqual({
        ok: true,
        value: expected,
        errors: [],
      });
    });

    it('runs its validations on a value', () => {
      const { RequiredCode } = lengthCodes();
      expect(new RequiredCode('abc').validate()).toEqual({ ok: true, value: 'abc', errors: [] });
      expect(new RequiredCode('123456').validate().errors).toEqual([shortCodeError]);
    });

    it('does not make StringType required', () => {
      expect(new StringType(null).validate()).toEqual({ ok: true, value: null, errors: [] });
    });
  });
});
