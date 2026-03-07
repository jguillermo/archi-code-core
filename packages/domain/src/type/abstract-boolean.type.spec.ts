import { describe, expect, it } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { universalToString } from '@archi-code/common';
import { BooleanTypeOptional, BooleanTypeRequired } from './index';
import { validateType } from '../validator/decorator/type-validator';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

// canByType(BOOLEAN) = native booleans + string variants + 0/1 variants
const VALID_BOOLEANS = [
  // native booleans
  true, false,
  // case-insensitive string booleans
  'True', 'False', 'TRUE', 'FALSE', 'true', 'false',
  '  True  ', ' False ', ' TRUE ', '  FALSE ', ' true ', ' false ',
  // numeric string/number representations accepted as boolean
  '1', ' 1', '0', ' 0', 0, 1,
];

// canByType(BOOLEAN, NULL, UNDEFINED)
const VALID_BOOLEANS_OPTIONAL = [...VALID_BOOLEANS, null, undefined];

// excludeItems(skipByTypeRequired(BOOLEAN), [1, 0])
// = raw non-boolean types minus null/undefined/'' minus 1 minus 0
// These trigger TypePrimitive exception (not coercible to boolean)
const NON_BOOLEAN_TYPES_REQUIRED = [
  // strings ('' excluded, 1/0 numeric excluded)
  'random', '   ', 'áéíóú', 'abc123',
  // numbers that are NOT 0 or 1
  -1, 1.1, -1.1,
  // objects and arrays
  { a: 123 }, [], [1, 2, 3],
  // uuid
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

// excludeItems(skipByType(BOOLEAN, NULL, UNDEFINED), [0, 1])
// = raw non-boolean/non-null/non-undefined types minus 0 and 1
// Includes '' (unlike the Required variant above)
const NON_BOOLEAN_TYPES_OPTIONAL = [
  // strings including empty
  'random', '', '   ', 'áéíóú', 'abc123',
  // numbers that are NOT 0 or 1
  -1, 1.1, -1.1,
  // objects and arrays
  { a: 123 }, [], [1, 2, 3],
  // uuid
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

describe('AbstractBooleanType', () => {
  describe('BooleanTypeRequired', () => {
    describe('Valid Values', () => {
      it.each(VALID_BOOLEANS.map((v) => [v]))('validates new BooleanTypeRequired(%p)', (value) => {
        expect(validateType(new BooleanTypeRequired(value as any))).toEqual([]);
      });

      it.each(VALID_BOOLEANS.map((v) => [v]))(
        'typeof new BooleanTypeRequired(%p).value === "boolean"',
        (value) => {
          expect(typeof new BooleanTypeRequired(value as any).value).toEqual('boolean');
        },
      );
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeBoolean: 'BooleanTypeRequired must be a boolean',
        isNotEmpty: 'BooleanTypeRequired should not be empty',
        typePrimitive: 'Validation Error: Expected a valid Boolean, but received {{$1}}.',
      };

      it.each(NON_BOOLEAN_TYPES_REQUIRED.map((v) => [v]))(
        'typePrimitive error for BooleanTypeRequired(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new BooleanTypeRequired(value as any);
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
        'canBeBoolean + isNotEmpty error for BooleanTypeRequired(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new BooleanTypeRequired(value as any);
            errors = validateType(type);
          } catch (e) {
            if (!(e instanceof TypePrimitiveException)) throw e;
            errors = [{ property: 'value', constraints: { typePrimitive: (e as any)?.message ?? '' } }];
          }
          expect(errors[0]).toBeDefined();
          expect(errors[0].constraints).toBeDefined();
          expect(errors[0].constraints).toEqual({
            canBeBoolean: errorData.canBeBoolean,
            isNotEmpty: errorData.isNotEmpty,
          });
        },
      );
    });

    describe('Compare values', () => {
      it.each([
        [true, true],
        ['true', true],
        ['false', false],
        ['1', true],
        [1, true],
        ['0', false],
        [0, false],
      ])('BooleanTypeRequired(%p).value toEqual %p', (input, expected) => {
        const type = new BooleanTypeRequired(input as any);
        expect(type.value).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it('BooleanTypeRequired(true).isNull toEqual false', () => {
        const type = new BooleanTypeRequired(true);
        expect(type.isNull).toEqual(false);
        expect(validateType(type)).toEqual([]);
      });

      it('BooleanTypeRequired(true).toString toEqual "true"', () => {
        const type = new BooleanTypeRequired(true);
        expect(type.toString).toEqual('true');
        expect(validateType(type)).toEqual([]);
      });
    });
  });

  describe('BooleanTypeOptional', () => {
    describe('Valid Values', () => {
      it.each(VALID_BOOLEANS_OPTIONAL.map((v) => [v]))(
        'validates new BooleanTypeOptional(%p)',
        (value) => {
          expect(validateType(new BooleanTypeOptional(value as any))).toEqual([]);
        },
      );

      it.each(VALID_BOOLEANS.map((v) => [v]))(
        'typeof new BooleanTypeOptional(%p).value === "boolean"',
        (value) => {
          expect(typeof new BooleanTypeOptional(value as any).value).toEqual('boolean');
        },
      );

      it.each([[null], [undefined]])('new BooleanTypeOptional(%p).isNull is true', (value) => {
        expect(new BooleanTypeOptional(value as any).isNull).toEqual(true);
      });
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeBoolean: 'BooleanTypeOptional must be a boolean',
        typePrimitive: 'Validation Error: Expected a valid Boolean, but received {{$1}}.',
      };

      it.each(NON_BOOLEAN_TYPES_OPTIONAL.map((v) => [v]))(
        'typePrimitive error for BooleanTypeOptional(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new BooleanTypeOptional(value as any);
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
        [true, true],
        [null, null],
        [undefined, null],
        ['true', true],
        ['false', false],
        ['1', true],
        [1, true],
        ['0', false],
        [0, false],
      ])('BooleanTypeOptional(%p).value toEqual %p', (input, expected) => {
        const type = new BooleanTypeOptional(input as any);
        expect(type.value).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it.each([
        [null, true],
        [undefined, true],
        [true, false],
      ])('BooleanTypeOptional(%p).isNull toEqual %p', (input, expected) => {
        const type = new BooleanTypeOptional(input as any);
        expect(type.isNull).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it.each([
        [null, ''],
        [undefined, ''],
        [true, 'true'],
      ])('BooleanTypeOptional(%p).toString toEqual %p', (input, expected) => {
        const type = new BooleanTypeOptional(input as any);
        expect(type.toString).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });
    });
  });

  describe('Expect Type', () => {
    type ExpectType = boolean;
    it('boolean and null', () => {
      const instance1 = new BooleanTypeOptional(true);
      const instance2 = new BooleanTypeOptional();
      const instance3 = new BooleanTypeOptional(null);

      expectTypeOf<BooleanTypeOptional['value']>().toMatchTypeOf<ExpectType | null>();
      expectTypeOf<ExpectType | null>().toMatchTypeOf<BooleanTypeOptional['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance2.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance3.value).toMatchTypeOf<ExpectType | null>();
    });

    it('boolean', () => {
      const instance1 = new BooleanTypeRequired(true);

      expectTypeOf<BooleanTypeRequired['value']>().toMatchTypeOf<ExpectType>();
      expectTypeOf<ExpectType>().toMatchTypeOf<BooleanTypeRequired['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType>();
    });
  });
});
