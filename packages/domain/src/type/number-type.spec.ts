import { describe, expect, it, jest } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { Validations } from '@archi-code/validation';
import type { ValidationResult } from '@archi-code/validation';
import { NumberType } from './number-type';
import { AbstractType, Required } from './abstract-type';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';
import { RequiredValueException } from '../exceptions/domain/required-value.exception';

class RequiredNumber extends Required(NumberType) {}

const convertibleInputs: [unknown, number][] = [
  [0, 0],
  [1, 1],
  [-1, -1],
  [1.5, 1.5],
  [-1.5, -1.5],
  ['0', 0],
  ['1', 1],
  ['-1.5', -1.5],
  [' 2 ', 2],
  ['.5', 0.5],
  ['1e3', 1000],
];

const emptyInputs: [string, unknown][] = [
  ['null', null],
  ['undefined', undefined],
  ['an empty string', ''],
  ['only spaces', '   '],
];

const notConvertibleInputs: [unknown, string][] = [
  ['abc', '"abc"'],
  ['1,5', '"1,5"'],
  ['0x10', '"0x10"'],
  ['1e400', '"1e400"'],
  [NaN, 'NaN'],
  [Infinity, 'Infinity'],
  [-Infinity, '-Infinity'],
  [true, 'true'],
  [{ a: 1 }, '{"a":1}'],
  [[], '[]'],
  [new Date('2020-01-01T00:00:00.000Z'), 'Date(2020-01-01T00:00:00.000Z)'],
  [BigInt(10), '10'],
];

function primitiveError(received: string): string {
  return `Validation Error: Expected a valid Number, but received ${received}.`;
}

function requiredError(received: string): string {
  return `Validation Error: RequiredNumber is required, but received ${received}.`;
}

function positiveNumbers() {
  const isPositive = jest.fn((value: unknown) => typeof value === 'number' && value > 0);

  @Validations([{ custom: 'isPositive', fn: isPositive }])
  class OptionalPositive extends NumberType {}

  @Validations([{ custom: 'isPositive', fn: isPositive }])
  class RequiredPositive extends Required(NumberType) {}

  return { OptionalPositive, RequiredPositive, isPositive };
}

const positiveError = { custom: 'isPositive', message: 'Value does not satisfy isPositive' };

describe('NumberType (optional)', () => {
  describe('typing', () => {
    it('is an AbstractType of number that takes a number, null or nothing and holds number | null', () => {
      expectTypeOf<NumberType>().toMatchTypeOf<AbstractType<number>>();
      expectTypeOf<ConstructorParameters<typeof NumberType>>().toEqualTypeOf<
        [value?: number | null]
      >();
      expectTypeOf<NumberType['value']>().toEqualTypeOf<number | null>();
      expectTypeOf<NumberType['validate']>().toEqualTypeOf<() => ValidationResult<number | null>>();
    });

    it('its value cannot be used as a plain number', () => {
      // @ts-expect-error an optional value may be null
      const amount: number = new NumberType(1).value;
      expect(amount).toBe(1);
    });
  });

  describe('conversion', () => {
    it.each(convertibleInputs)('%p → %p', (input, expected) => {
      expect(new NumberType(input as number).value).toBe(expected);
    });

    it.each(emptyInputs)('%s → null', (_, input) => {
      expect(new NumberType(input as number).value).toBeNull();
    });

    it('no value → null', () => {
      expect(new NumberType().value).toBeNull();
    });

    it.each(notConvertibleInputs)('%p throws TypePrimitiveException', (input, received) => {
      const create = () => new NumberType(input as number);
      expect(create).toThrow(TypePrimitiveException);
      expect(create).toThrow(primitiveError(received));
    });
  });

  describe('validate', () => {
    it.each(convertibleInputs)('%p is valid as %p', (input, expected) => {
      expect(new NumberType(input as number).validate()).toEqual({
        ok: true,
        value: expected,
        errors: [],
      });
    });

    it.each(emptyInputs)('%s is valid as null', (_, input) => {
      expect(new NumberType(input as number).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
    });

    it('runs its validations on a value', () => {
      const { OptionalPositive } = positiveNumbers();
      expect(new OptionalPositive(1).validate()).toEqual({ ok: true, value: 1, errors: [] });
      expect(new OptionalPositive(-1).validate().errors).toEqual([positiveError]);
    });

    it.each(emptyInputs)('%s is valid without running its validations', (_, input) => {
      const { OptionalPositive, isPositive } = positiveNumbers();
      expect(new OptionalPositive(input as number).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
      expect(isPositive).not.toHaveBeenCalled();
    });
  });

  describe('isNull / toString', () => {
    it.each([
      ['a value', new NumberType(-1.5), false, '-1.5'],
      ['zero', new NumberType(0), false, '0'],
      ['an empty value', new NumberType(null), true, ''],
    ])('%s → isNull %s, toString %p', (_, instance, isNull, text) => {
      expect(instance.isNull).toBe(isNull);
      expect(instance.toString).toBe(text);
    });
  });
});

describe('Required(NumberType)', () => {
  describe('typing', () => {
    it('takes only a number and holds a number', () => {
      expectTypeOf<ConstructorParameters<typeof RequiredNumber>>().toEqualTypeOf<[value: number]>();
      expectTypeOf<RequiredNumber['value']>().toEqualTypeOf<number>();
      expectTypeOf<RequiredNumber['validate']>().toEqualTypeOf<() => ValidationResult<number>>();
    });

    it('does not accept a missing value or a value of another type', () => {
      // @ts-expect-error a required number needs a value
      expect(() => new RequiredNumber()).toThrow(RequiredValueException);
      // @ts-expect-error a required number does not accept null
      expect(() => new RequiredNumber(null)).toThrow(RequiredValueException);
      // @ts-expect-error a required number does not accept undefined
      expect(() => new RequiredNumber(undefined)).toThrow(RequiredValueException);
      // @ts-expect-error a required number does not accept a string
      expect(new RequiredNumber('1').value).toBe(1);
    });
  });

  describe('construction', () => {
    it.each(convertibleInputs)('%p → %p', (input, expected) => {
      expect(new RequiredNumber(input as number).value).toBe(expected);
    });

    it.each(emptyInputs)('%s throws RequiredValueException', (_, input) => {
      const received = typeof input === 'string' ? `"${input}"` : 'null';
      const create = () => new RequiredNumber(input as number);
      expect(create).toThrow(RequiredValueException);
      expect(create).toThrow(requiredError(received));
    });

    it('throws TypePrimitiveException for a value that cannot be converted', () => {
      expect(() => new RequiredNumber('abc' as unknown as number)).toThrow(primitiveError('"abc"'));
    });
  });

  describe('validate', () => {
    it.each(convertibleInputs)('%p is valid as %p', (input, expected) => {
      expect(new RequiredNumber(input as number).validate()).toEqual({
        ok: true,
        value: expected,
        errors: [],
      });
    });

    it('runs its validations on a value, zero included', () => {
      const { RequiredPositive } = positiveNumbers();
      expect(new RequiredPositive(1).validate()).toEqual({ ok: true, value: 1, errors: [] });
      expect(new RequiredPositive(0).validate().errors).toEqual([positiveError]);
    });

    it('does not make NumberType required', () => {
      expect(new NumberType(null).validate()).toEqual({ ok: true, value: null, errors: [] });
    });
  });
});
