import { describe, expect, it } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { Validations } from '@archi-code/validation';
import type { ValidationResult } from '@archi-code/validation';
import { StringType } from './string-type';
import { AbstractType, Required } from './abstract-type';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

class Name extends Required(StringType) {}
class Nick extends StringType {}

const notEmptyError = { validator: 'isNotEmpty', message: 'Value should not be empty' };

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

describe('StringType', () => {
  describe('typing', () => {
    it('is an AbstractType of string', () => {
      expectTypeOf<StringType>().toMatchTypeOf<AbstractType<string>>();
    });

    it('value is string when required and string | null when optional', () => {
      expectTypeOf<Name['value']>().toEqualTypeOf<string>();
      expectTypeOf<Nick['value']>().toEqualTypeOf<string | null>();
      expectTypeOf<StringType['value']>().toEqualTypeOf<string | null>();
    });

    it('validate returns a result of its value type', () => {
      expectTypeOf<Name['validate']>().toEqualTypeOf<() => ValidationResult<string>>();
      expectTypeOf<Nick['validate']>().toEqualTypeOf<() => ValidationResult<string | null>>();
    });

    it('the required constructor asks for a string and the optional one accepts null or nothing', () => {
      expectTypeOf<ConstructorParameters<typeof Name>>().toEqualTypeOf<[value: string]>();
      expectTypeOf<ConstructorParameters<typeof Nick>>().toEqualTypeOf<[value?: string | null]>();
    });
  });

  describe('required or optional construction', () => {
    it('a required string is a type error without a value, with null or with undefined', () => {
      // @ts-expect-error a required string needs a value
      expect(new Name().validate().errors).toEqual([notEmptyError]);
      // @ts-expect-error a required string does not accept null
      expect(new Name(null).validate().errors).toEqual([notEmptyError]);
      // @ts-expect-error a required string does not accept undefined
      expect(new Name(undefined).validate().errors).toEqual([notEmptyError]);
    });

    it('a required string with a value is typed as string', () => {
      const value: string = new Name('Ana').value;
      expect(value).toBe('Ana');
    });

    it('an optional string can be created without a value, with null or with undefined', () => {
      expect(new Nick().value).toBeNull();
      expect(new Nick(null).value).toBeNull();
      expect(new Nick(undefined).value).toBeNull();
    });

    it('an optional string is typed as string | null', () => {
      // @ts-expect-error an optional value may be null, so it is not a plain string
      const value: string = new Nick('Ana').value;
      expect(value).toBe('Ana');
    });
  });

  describe('conversion', () => {
    it.each(convertibleInputs)('%p → %p', (input, expected) => {
      expect(new Nick(input as string).value).toBe(expected);
    });

    it.each(emptyInputs)('%s → null', (_, input) => {
      expect(new Nick(input as string).value).toBeNull();
    });

    it.each(notConvertibleInputs)('%p throws TypePrimitiveException', (input, received) => {
      const create = () => new Nick(input as string);
      expect(create).toThrow(TypePrimitiveException);
      expect(create).toThrow(primitiveError(received));
    });

    it('a required type converts the same way', () => {
      expect(new Name(1 as unknown as string).value).toBe('1');
      expect(new Name('   ').value).toBeNull();
      expect(() => new Name({} as unknown as string)).toThrow(TypePrimitiveException);
    });
  });

  describe('required', () => {
    it.each(convertibleInputs)('%p is valid and converted to %p', (input, expected) => {
      expect(new Name(input as string).validate()).toEqual({
        ok: true,
        value: expected,
        errors: [],
      });
    });

    it.each(emptyInputs)('%s is not valid', (_, input) => {
      expect(new Name(input as string).validate()).toEqual({
        ok: false,
        value: null,
        errors: [notEmptyError],
      });
    });

    it('exposes value, isNull and toString of the converted value', () => {
      const name = new Name('áéíóú');
      expect(name.value).toBe('áéíóú');
      expect(name.isNull).toBe(false);
      expect(name.toString).toBe('áéíóú');
    });
  });

  describe('optional', () => {
    it.each(convertibleInputs)('%p is valid and converted to %p', (input, expected) => {
      expect(new Nick(input as string).validate()).toEqual({
        ok: true,
        value: expected,
        errors: [],
      });
    });

    it.each(emptyInputs)('%s is valid as null', (_, input) => {
      expect(new Nick(input as string).validate()).toEqual({ ok: true, value: null, errors: [] });
    });

    it('defaults to null', () => {
      const empty = new Nick();
      expect(empty.value).toBeNull();
      expect(empty.isNull).toBe(true);
      expect(empty.toString).toBe('');
    });
  });

  describe('with its own validations', () => {
    const lengthError = { validator: 'isLength', message: 'Value does not satisfy isLength' };

    @Validations([{ validator: 'isLength', properties: { min: 2, max: 5 } }])
    class Code extends Required(StringType) {}

    @Validations([{ validator: 'isLength', properties: { min: 2, max: 5 } }])
    class OptionalCode extends StringType {}

    it.each([['ab'], ['abc'], ['áéíóú'], [12], [true]])('%p is valid', (input) => {
      expect(new Code(input as string).validate().ok).toBe(true);
      expect(new OptionalCode(input as string).validate().ok).toBe(true);
    });

    it.each([['1'], ['123456'], [123456]])('%p fails the length', (input) => {
      expect(new Code(input as string).validate().errors).toEqual([lengthError]);
      expect(new OptionalCode(input as string).validate().errors).toEqual([lengthError]);
    });

    it.each(emptyInputs)('%s only reports the missing value when required', (_, input) => {
      expect(new Code(input as string).validate().errors).toEqual([notEmptyError]);
    });

    it.each(emptyInputs)('%s does not run the validations when optional', (_, input) => {
      expect(new OptionalCode(input as string).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
    });
  });
});
