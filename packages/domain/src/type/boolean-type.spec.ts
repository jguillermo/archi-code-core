import { describe, expect, it, jest } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { Validations } from '@archi-code/validation';
import type { ValidationResult } from '@archi-code/validation';
import { BooleanType } from './boolean-type';
import { AbstractType, Required } from './abstract-type';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';
import { RequiredValueException } from '../exceptions/domain/required-value.exception';

class RequiredBoolean extends Required(BooleanType) {}

const convertibleInputs: [unknown, boolean][] = [
  [true, true],
  [false, false],
  [1, true],
  [0, false],
  ['true', true],
  ['false', false],
  ['TRUE', true],
  [' False ', false],
  ['1', true],
  ['0', false],
];

const emptyInputs: [string, unknown][] = [
  ['null', null],
  ['undefined', undefined],
  ['an empty string', ''],
  ['only spaces', '   '],
];

const notConvertibleInputs: [unknown, string][] = [
  ['yes', '"yes"'],
  ['no', '"no"'],
  ['abc', '"abc"'],
  [2, '2'],
  [-1, '-1'],
  [NaN, 'NaN'],
  [{ a: 1 }, '{"a":1}'],
  [[], '[]'],
];

function primitiveError(received: string): string {
  return `Validation Error: Expected a valid Boolean, but received ${received}.`;
}

function requiredError(received: string): string {
  return `Validation Error: RequiredBoolean is required, but received ${received}.`;
}

function acceptedFlags() {
  const isTrue = jest.fn((value: unknown) => value === true);

  @Validations([{ custom: 'isTrue', fn: isTrue }])
  class OptionalAccepted extends BooleanType {}

  @Validations([{ custom: 'isTrue', fn: isTrue }])
  class RequiredAccepted extends Required(BooleanType) {}

  return { OptionalAccepted, RequiredAccepted, isTrue };
}

const isTrueError = { custom: 'isTrue', message: 'Value does not satisfy isTrue' };

describe('BooleanType (optional)', () => {
  describe('typing', () => {
    it('is an AbstractType of boolean that takes a boolean, null or nothing and holds boolean | null', () => {
      expectTypeOf<BooleanType>().toMatchTypeOf<AbstractType<boolean>>();
      expectTypeOf<ConstructorParameters<typeof BooleanType>>().toEqualTypeOf<
        [value?: boolean | null]
      >();
      expectTypeOf<BooleanType['value']>().toEqualTypeOf<boolean | null>();
      expectTypeOf<BooleanType['validate']>().toEqualTypeOf<
        () => ValidationResult<boolean | null>
      >();
    });

    it('its value cannot be used as a plain boolean', () => {
      // @ts-expect-error an optional value may be null
      const flag: boolean = new BooleanType(true).value;
      expect(flag).toBe(true);
    });
  });

  describe('conversion', () => {
    it.each(convertibleInputs)('%p → %p', (input, expected) => {
      expect(new BooleanType(input as boolean).value).toBe(expected);
    });

    it.each(emptyInputs)('%s → null', (_, input) => {
      expect(new BooleanType(input as boolean).value).toBeNull();
    });

    it('no value → null', () => {
      expect(new BooleanType().value).toBeNull();
    });

    it.each(notConvertibleInputs)('%p throws TypePrimitiveException', (input, received) => {
      const create = () => new BooleanType(input as boolean);
      expect(create).toThrow(TypePrimitiveException);
      expect(create).toThrow(primitiveError(received));
    });
  });

  describe('validate', () => {
    it.each(convertibleInputs)('%p is valid as %p', (input, expected) => {
      expect(new BooleanType(input as boolean).validate()).toEqual({
        ok: true,
        value: expected,
        errors: [],
      });
    });

    it.each(emptyInputs)('%s is valid as null', (_, input) => {
      expect(new BooleanType(input as boolean).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
    });

    it('runs its validations on a value', () => {
      const { OptionalAccepted } = acceptedFlags();
      expect(new OptionalAccepted(true).validate()).toEqual({ ok: true, value: true, errors: [] });
      expect(new OptionalAccepted(false).validate().errors).toEqual([isTrueError]);
    });

    it.each(emptyInputs)('%s is valid without running its validations', (_, input) => {
      const { OptionalAccepted, isTrue } = acceptedFlags();
      expect(new OptionalAccepted(input as boolean).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
      expect(isTrue).not.toHaveBeenCalled();
    });
  });

  describe('isNull / toString', () => {
    it.each([
      ['true', new BooleanType(true), false, 'true'],
      ['false', new BooleanType(false), false, 'false'],
      ['an empty value', new BooleanType(null), true, ''],
    ])('%s → isNull %s, toString %p', (_, instance, isNull, text) => {
      expect(instance.isNull).toBe(isNull);
      expect(instance.toString).toBe(text);
    });
  });
});

describe('Required(BooleanType)', () => {
  describe('typing', () => {
    it('takes only a boolean and holds a boolean', () => {
      expectTypeOf<ConstructorParameters<typeof RequiredBoolean>>().toEqualTypeOf<
        [value: boolean]
      >();
      expectTypeOf<RequiredBoolean['value']>().toEqualTypeOf<boolean>();
      expectTypeOf<RequiredBoolean['validate']>().toEqualTypeOf<() => ValidationResult<boolean>>();
    });

    it('does not accept a missing value or a value of another type', () => {
      // @ts-expect-error a required boolean needs a value
      expect(() => new RequiredBoolean()).toThrow(RequiredValueException);
      // @ts-expect-error a required boolean does not accept null
      expect(() => new RequiredBoolean(null)).toThrow(RequiredValueException);
      // @ts-expect-error a required boolean does not accept undefined
      expect(() => new RequiredBoolean(undefined)).toThrow(RequiredValueException);
      // @ts-expect-error a required boolean does not accept a string
      expect(new RequiredBoolean('true').value).toBe(true);
    });
  });

  describe('construction', () => {
    it.each(convertibleInputs)('%p → %p', (input, expected) => {
      expect(new RequiredBoolean(input as boolean).value).toBe(expected);
    });

    it.each(emptyInputs)('%s throws RequiredValueException', (_, input) => {
      const received = typeof input === 'string' ? `"${input}"` : 'null';
      const create = () => new RequiredBoolean(input as boolean);
      expect(create).toThrow(RequiredValueException);
      expect(create).toThrow(requiredError(received));
    });

    it('throws TypePrimitiveException for a value that cannot be converted', () => {
      expect(() => new RequiredBoolean('yes' as unknown as boolean)).toThrow(
        primitiveError('"yes"'),
      );
    });
  });

  describe('validate', () => {
    it.each(convertibleInputs)('%p is valid as %p, false included', (input, expected) => {
      expect(new RequiredBoolean(input as boolean).validate()).toEqual({
        ok: true,
        value: expected,
        errors: [],
      });
    });

    it('runs its validations on a value', () => {
      const { RequiredAccepted } = acceptedFlags();
      expect(new RequiredAccepted(true).validate()).toEqual({ ok: true, value: true, errors: [] });
      expect(new RequiredAccepted(false).validate().errors).toEqual([isTrueError]);
    });

    it('does not make BooleanType required', () => {
      expect(new BooleanType(null).validate()).toEqual({ ok: true, value: null, errors: [] });
    });
  });
});
