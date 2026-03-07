import { describe, expect, it } from '@jest/globals';
import { AddValidate, validateType } from '../validator/decorator/type-validator';
import { expectTypeOf } from 'expect-type';
import { universalToString } from '@code-core/common';
import { AbstractNumberType, NumberTypeOptional, NumberTypeRequired } from './index';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';
import { getLevel, Level } from '../level/level.decorator';

// canByType(NUMBER) = numeric values + numeric strings
const VALID_NUMBERS = [
  // native numbers
  1, -1, 1.1, -1.1, 0,
  // numeric strings
  '1', '-1', '1.1', '-1.1', '0',
];

// canByType(NUMBER, NULL, UNDEFINED)
const VALID_NUMBERS_OPTIONAL = [...VALID_NUMBERS, null, undefined];

// skipByTypeRequired(NUMBER) = raw non-number types minus null/undefined minus ''
// These values should trigger TypePrimitive exception for Required variant
const NON_NUMBER_TYPES_REQUIRED = [
  // strings (empty string excluded for required)
  'random', '   ', 'áéíóú', 'abc123',
  // booleans — not numbers
  true, false,
  // objects and arrays
  { a: 123 }, [], [1, 2, 3],
  // uuid string
  'df9ef000-21fc-4e06-b8f7-103c3a133d10',
  // functions
  () => 123, new Function('return 123'),
  // exotic types
  Symbol(), Symbol('123'),
  new Date(), new Date('2020-01-01'),
  new RegExp('test'), /test/,
  new Error('data error'),
  Promise.resolve('data promise'),
  new Map(), new Map([[1, 2]]),
  new Set(), new Set([1, 2, 3]),
];

// skipByType(NUMBER, NULL, UNDEFINED) = same but includes ''
// Used for Optional variant (null/undefined are valid, so tested separately)
const NON_NUMBER_TYPES_OPTIONAL = [
  // strings including empty
  'random', '', '   ', 'áéíóú', 'abc123',
  // booleans — not numbers
  true, false,
  // objects and arrays
  { a: 123 }, [], [1, 2, 3],
  // uuid string
  'df9ef000-21fc-4e06-b8f7-103c3a133d10',
  // functions
  () => 123, new Function('return 123'),
  // exotic types
  Symbol(), Symbol('123'),
  new Date(), new Date('2020-01-01'),
  new RegExp('test'), /test/,
  new Error('data error'),
  Promise.resolve('data promise'),
  new Map(), new Map([[1, 2]]),
  new Set(), new Set([1, 2, 3]),
];

describe('AbstractNumberType', () => {
  describe('NumberTypeRequired', () => {
    describe('Valid Values', () => {
      it.each(VALID_NUMBERS.map((v) => [v]))('validates new NumberTypeRequired(%p)', (value) => {
        expect(validateType(new NumberTypeRequired(value as any))).toEqual([]);
      });

      it.each(VALID_NUMBERS.map((v) => [v]))(
        'typeof new NumberTypeRequired(%p).value === "number"',
        (value) => {
          expect(typeof new NumberTypeRequired(value as any).value).toEqual('number');
        },
      );
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeNumber: 'NumberTypeRequired must be a number',
        isNotEmpty: 'NumberTypeRequired should not be empty',
        typePrimitive: 'Validation Error: Expected a valid Number, but received {{$1}}.',
      };

      it.each(NON_NUMBER_TYPES_REQUIRED.map((v) => [v]))(
        'typePrimitive error for NumberTypeRequired(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new NumberTypeRequired(value as any);
            errors = validateType(type);
          } catch (e) {
            if (!(e instanceof TypePrimitiveException)) throw e;
            errors = [{ property: 'value', constraints: { typePrimitive: (e as any)?.message ?? '' } }];
          }
          expect(errors[0]).toBeDefined();
          expect(errors[0].constraints).toBeDefined();
          const displayValue = typeof value === 'string' ? `"${value}"` : value;
          expect(errors[0].constraints?.typePrimitive).toEqual(
            errorData.typePrimitive.replace('{{$1}}', universalToString(displayValue)),
          );
        },
      );

      it.each([[null], [undefined]])(
        'canBeNumber + isNotEmpty error for NumberTypeRequired(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new NumberTypeRequired(value as any);
            errors = validateType(type);
          } catch (e) {
            if (!(e instanceof TypePrimitiveException)) throw e;
            errors = [{ property: 'value', constraints: { typePrimitive: (e as any)?.message ?? '' } }];
          }
          expect(errors[0]).toBeDefined();
          expect(errors[0].constraints).toBeDefined();
          expect(errors[0].constraints).toEqual({
            canBeNumber: errorData.canBeNumber,
            isNotEmpty: errorData.isNotEmpty,
          });
        },
      );
    });

    describe('Compare values', () => {
      it('NumberTypeRequired(1).value toEqual 1', () => {
        const type = new NumberTypeRequired(1);
        expect(type.value).toEqual(1);
        expect(validateType(type)).toEqual([]);
      });

      it('NumberTypeRequired(1).isNull toEqual false', () => {
        const type = new NumberTypeRequired(1);
        expect(type.isNull).toEqual(false);
        expect(validateType(type)).toEqual([]);
      });

      it('NumberTypeRequired(1).toString toEqual "1"', () => {
        const type = new NumberTypeRequired(1);
        expect(type.toString).toEqual('1');
        expect(validateType(type)).toEqual([]);
      });
    });
  });

  describe('NumberTypeOptional', () => {
    describe('Valid Values', () => {
      it.each(VALID_NUMBERS_OPTIONAL.map((v) => [v]))('validates new NumberTypeOptional(%p)', (value) => {
        expect(validateType(new NumberTypeOptional(value as any))).toEqual([]);
      });

      it.each(VALID_NUMBERS.map((v) => [v]))(
        'typeof new NumberTypeOptional(%p).value === "number"',
        (value) => {
          expect(typeof new NumberTypeOptional(value as any).value).toEqual('number');
        },
      );

      it.each([[null], [undefined]])('new NumberTypeOptional(%p).isNull is true', (value) => {
        expect(new NumberTypeOptional(value as any).isNull).toEqual(true);
      });
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeNumber: 'NumberTypeOptional must be a number',
        typePrimitive: 'Validation Error: Expected a valid Number, but received {{$1}}.',
      };

      it.each(NON_NUMBER_TYPES_OPTIONAL.map((v) => [v]))(
        'typePrimitive error for NumberTypeOptional(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new NumberTypeOptional(value as any);
            errors = validateType(type);
          } catch (e) {
            if (!(e instanceof TypePrimitiveException)) throw e;
            errors = [{ property: 'value', constraints: { typePrimitive: (e as any)?.message ?? '' } }];
          }
          expect(errors[0]).toBeDefined();
          expect(errors[0].constraints).toBeDefined();
          const displayValue = typeof value === 'string' ? `"${value}"` : value;
          expect(errors[0].constraints?.typePrimitive).toEqual(
            errorData.typePrimitive.replace('{{$1}}', universalToString(displayValue)),
          );
        },
      );
    });

    describe('compare values', () => {
      it.each([
        [1, 1],
        [null, null],
        [undefined, null],
        ['1', 1],
      ])('NumberTypeOptional(%p).value toEqual %p', (input, expected) => {
        const type = new NumberTypeOptional(input as any);
        expect(type.value).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it.each([
        [null, true],
        [undefined, true],
        [0, false],
      ])('NumberTypeOptional(%p).isNull toEqual %p', (input, expected) => {
        const type = new NumberTypeOptional(input as any);
        expect(type.isNull).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it.each([
        [null, ''],
        [undefined, ''],
        [1, '1'],
      ])('NumberTypeOptional(%p).toString toEqual %p', (input, expected) => {
        const type = new NumberTypeOptional(input as any);
        expect(type.toString).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });
    });
  });

  describe('AddValidate', () => {
    @AddValidate([
      { validator: 'IsInt' },
      { validator: 'Min', value: 10 },
      { validator: 'Max', value: 20 },
    ])
    class ValueObjectNumber extends AbstractNumberType {}

    describe('Valid Values', () => {
      it.each([[10], [15], [20]])('validates new ValueObjectNumber(%p)', (value) => {
        expect(validateType(new ValueObjectNumber(value as any))).toEqual([]);
      });

      it.each([[10], [15], [20]])('typeof new ValueObjectNumber(%p).value === "number"', (value) => {
        expect(typeof new ValueObjectNumber(value as any).value).toEqual('number');
      });
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeNumber: 'ValueObjectNumber must be a number',
        isInt: 'ValueObjectNumber must be an integer number',
        max: 'ValueObjectNumber must not be greater than 20',
        min: 'ValueObjectNumber must not be less than 10',
        typePrimitive: 'Validation Error: Expected a valid Number, but received {{$1}}.',
      };

      it.each(NON_NUMBER_TYPES_OPTIONAL.map((v) => [v]))(
        'typePrimitive error for ValueObjectNumber(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new ValueObjectNumber(value as any);
            errors = validateType(type);
          } catch (e) {
            if (!(e instanceof TypePrimitiveException)) throw e;
            errors = [{ property: 'value', constraints: { typePrimitive: (e as any)?.message ?? '' } }];
          }
          expect(errors[0]).toBeDefined();
          expect(errors[0].constraints).toBeDefined();
          const displayValue = typeof value === 'string' ? `"${value}"` : value;
          expect(errors[0].constraints?.typePrimitive).toEqual(
            errorData.typePrimitive.replace('{{$1}}', universalToString(displayValue)),
          );
        },
      );

      it('isInt error for ValueObjectNumber(10.1)', () => {
        const type = new ValueObjectNumber(10.1);
        const errors = validateType(type);
        expect(errors[0]).toBeDefined();
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].constraints).toEqual({ isInt: errorData.isInt });
      });

      it.each([[21], [22]])('max error for ValueObjectNumber(%p)', (value) => {
        const type = new ValueObjectNumber(value as any);
        const errors = validateType(type);
        expect(errors[0]).toBeDefined();
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].constraints).toEqual({ max: errorData.max });
      });

      it.each([[1], [2]])('min error for ValueObjectNumber(%p)', (value) => {
        const type = new ValueObjectNumber(value as any);
        const errors = validateType(type);
        expect(errors[0]).toBeDefined();
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].constraints).toEqual({ min: errorData.min });
      });

      it.each([['1.1'], [2.1]])('min + isInt error for ValueObjectNumber(%p)', (value) => {
        const type = new ValueObjectNumber(value as any);
        const errors = validateType(type);
        expect(errors[0]).toBeDefined();
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].constraints).toEqual({ min: errorData.min, isInt: errorData.isInt });
      });

      it.each([['21.1'], [22.1]])('max + isInt error for ValueObjectNumber(%p)', (value) => {
        const type = new ValueObjectNumber(value as any);
        const errors = validateType(type);
        expect(errors[0]).toBeDefined();
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].constraints).toEqual({ max: errorData.max, isInt: errorData.isInt });
      });
    });

    describe('Compare values', () => {
      it.each([
        [10, 10],
        [15, 15],
        [20, 20],
      ])('ValueObjectNumber(%p).value toEqual %p', (input, expected) => {
        const type = new ValueObjectNumber(input);
        expect(type.value).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });
    });
  });

  describe('Expect Type', () => {
    type ExpectType = number;
    it('number and null', () => {
      const instance1 = new NumberTypeOptional(42);
      const instance2 = new NumberTypeOptional();
      const instance3 = new NumberTypeOptional(null);

      expectTypeOf<NumberTypeOptional['value']>().toMatchTypeOf<ExpectType | null>();
      expectTypeOf<ExpectType | null>().toMatchTypeOf<NumberTypeOptional['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance2.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance3.value).toMatchTypeOf<ExpectType | null>();
    });

    it('number', () => {
      const instance1 = new NumberTypeRequired(42);

      expectTypeOf<NumberTypeRequired['value']>().toMatchTypeOf<ExpectType>();
      expectTypeOf<ExpectType>().toMatchTypeOf<NumberTypeRequired['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType>();
    });
  });

  describe('Type Validation', () => {
    it('enum validation', () => {
      @AddValidate([
        { validator: 'IsNotEmpty' },
        { validator: 'Min', value: 100 },
        { validator: 'Max', value: 200 },
        { validator: 'IsPositive' },
      ])
      class TestNumberTypeRequired extends AbstractNumberType {}

      const instance = new TestNumberTypeRequired(-4200);
      expect(instance.isValid()).toEqual(false);
      expect(instance.validatorMessageStr()).toEqual(
        'must not be less than 100, must be a positive number',
      );
      expect(instance.validatorMessageStr('|')).toEqual(
        'must not be less than 100| must be a positive number',
      );
    });
  });

  describe('level validator', () => {
    it('get correct level', () => {
      @Level(2)
      @AddValidate([
        { validator: 'IsNotEmpty' },
        { validator: 'Min', value: 100 },
        { validator: 'Max', value: 200 },
        { validator: 'IsPositive' },
      ])
      class TestNumberTypeRequired extends AbstractNumberType {
        static empty(): TestNumberTypeRequired {
          return new TestNumberTypeRequired(0);
        }
      }

      const level = getLevel(TestNumberTypeRequired);
      expect(level).toBe(2);
    });
  });
});
