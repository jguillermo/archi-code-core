import { describe, expect, it } from '@jest/globals';
import { AddValidate, validateType } from '../validator/decorator/type-validator';
import { expectTypeOf } from 'expect-type';
import { universalToString } from '@archi-code/common';
import { AbstractStringType, StringTypeOptional, StringTypeRequired } from './index';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

// canByType(STRING) = plain strings + numbers-as-string + booleans-as-string
// excludeItems(..., ['']) removes the empty string for Required variant
const VALID_STRINGS_REQUIRED = [
  'random',
  '   ',
  'áéíóú',
  'abc123', // plain strings (empty excluded for required)
  '1',
  '-1',
  '1.1',
  '-1.1',
  '0', // numeric strings
  'true',
  'false', // boolean strings
];

// canByType(STRING, NULL, UNDEFINED) — same strings plus nullable for Optional variant
const VALID_STRINGS_OPTIONAL = [
  'random',
  '',
  '   ',
  'áéíóú',
  'abc123',
  '1',
  '-1',
  '1.1',
  '-1.1',
  '0',
  'true',
  'false',
  null,
  undefined,
];

// skipByType(STRING, NUMBER, BOOLEAN, UUID, NULL, UNDEFINED) — raw exotic types only
// These cannot be coerced to string → trigger TypePrimitive exception
const NON_STRING_COERCIBLE = [
  { a: 123 },
  [],
  [1, 2, 3],
  () => 123,
  new Function('return 123'),
  Symbol(),
  Symbol('123'),
  new Date(),
  new Date('2020-01-01'),
  new RegExp('test'),
  /test/,
  new Error('data error'),
  Promise.resolve('data promise'),
  new Map(),
  new Map([[1, 2]]),
  new Set(),
  new Set([1, 2, 3]),
];

describe('AbstractStringType', () => {
  describe('StringTypeRequired', () => {
    describe('Valid Values', () => {
      it.each(VALID_STRINGS_REQUIRED.map((v) => [v]))(
        'validates new StringTypeRequired(%p)',
        (value) => {
          expect(validateType(new StringTypeRequired(value as any))).toEqual([]);
        },
      );

      it.each(VALID_STRINGS_REQUIRED.map((v) => [v]))(
        'typeof new StringTypeRequired(%p).value === "string"',
        (value) => {
          expect(typeof new StringTypeRequired(value as any).value).toEqual('string');
        },
      );
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeString: 'StringTypeRequired must be a string',
        isNotEmpty: 'StringTypeRequired should not be empty',
        typePrimitive: 'Validation Error: Expected a valid String, but received {{$1}}.',
      };

      it.each(NON_STRING_COERCIBLE.map((v) => [v]))(
        'typePrimitive error for StringTypeRequired(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new StringTypeRequired(value as any);
            errors = validateType(type);
          } catch (e) {
            if (!(e instanceof TypePrimitiveException)) throw e;
            errors = [
              { property: 'value', constraints: { typePrimitive: (e as any)?.message ?? '' } },
            ];
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
        'canBeString + isNotEmpty error for StringTypeRequired(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new StringTypeRequired(value as any);
            errors = validateType(type);
          } catch (e) {
            if (!(e instanceof TypePrimitiveException)) throw e;
            errors = [
              { property: 'value', constraints: { typePrimitive: (e as any)?.message ?? '' } },
            ];
          }
          expect(errors[0]).toBeDefined();
          expect(errors[0].constraints).toBeDefined();
          expect(errors[0].constraints).toEqual({
            canBeString: errorData.canBeString,
            isNotEmpty: errorData.isNotEmpty,
          });
        },
      );

      it('isNotEmpty error for StringTypeRequired("")', () => {
        let errors: any[] = [];
        try {
          const type = new StringTypeRequired('');
          errors = validateType(type);
        } catch (e) {
          if (!(e instanceof TypePrimitiveException)) throw e;
          errors = [
            { property: 'value', constraints: { typePrimitive: (e as any)?.message ?? '' } },
          ];
        }
        expect(errors[0]).toBeDefined();
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].constraints).toEqual({ isNotEmpty: errorData.isNotEmpty });
      });
    });

    describe('Compare values', () => {
      it('StringTypeRequired("áéíóú").value toEqual "áéíóú"', () => {
        const type = new StringTypeRequired('áéíóú');
        expect(type.value).toEqual('áéíóú');
        expect(validateType(type)).toEqual([]);
      });

      it('StringTypeRequired("áéíóú").isNull toEqual false', () => {
        const type = new StringTypeRequired('áéíóú');
        expect(type.isNull).toEqual(false);
        expect(validateType(type)).toEqual([]);
      });

      it('StringTypeRequired("áéíóú").toString toEqual "áéíóú"', () => {
        const type = new StringTypeRequired('áéíóú');
        expect(type.toString).toEqual('áéíóú');
        expect(validateType(type)).toEqual([]);
      });
    });
  });

  describe('StringTypeOptional', () => {
    describe('Valid Values', () => {
      it.each(VALID_STRINGS_OPTIONAL.map((v) => [v]))(
        'validates new StringTypeOptional(%p)',
        (value) => {
          expect(validateType(new StringTypeOptional(value as any))).toEqual([]);
        },
      );

      it.each(VALID_STRINGS_OPTIONAL.filter((v) => v != null && v !== undefined).map((v) => [v]))(
        'typeof new StringTypeOptional(%p).value === "string"',
        (value) => {
          expect(typeof new StringTypeOptional(value as any).value).toEqual('string');
        },
      );

      it.each([[null], [undefined]])('new StringTypeOptional(%p).isNull is true', (value) => {
        expect(new StringTypeOptional(value as any).isNull).toEqual(true);
      });
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeString: 'StringTypeOptional must be a string',
        typePrimitive: 'Validation Error: Expected a valid String, but received {{$1}}.',
      };

      it.each(NON_STRING_COERCIBLE.map((v) => [v]))(
        'typePrimitive error for StringTypeOptional(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new StringTypeOptional(value as any);
            errors = validateType(type);
          } catch (e) {
            if (!(e instanceof TypePrimitiveException)) throw e;
            errors = [
              { property: 'value', constraints: { typePrimitive: (e as any)?.message ?? '' } },
            ];
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

    describe('Compare values', () => {
      it.each([
        ['áéíóú', 'áéíóú'],
        [null, null],
        [undefined, null],
      ])('StringTypeOptional(%p).value toEqual %p', (input, expected) => {
        const type = new StringTypeOptional(input as any);
        expect(type.value).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it.each([
        ['áéíóú', false],
        [null, true],
        [undefined, true],
      ])('StringTypeOptional(%p).isNull toEqual %p', (input, expected) => {
        const type = new StringTypeOptional(input as any);
        expect(type.isNull).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it('StringTypeOptional("áéíóú").toString toEqual "áéíóú"', () => {
        const type = new StringTypeOptional('áéíóú');
        expect(type.toString).toEqual('áéíóú');
        expect(validateType(type)).toEqual([]);
      });
    });
  });

  describe('AddValidate', () => {
    @AddValidate([
      { validator: 'MinLength', value: 2 },
      { validator: 'MaxLength', value: 5 },
    ])
    class ValueObjectString extends AbstractStringType {}

    describe('Valid Values', () => {
      it.each([['abc'], ['áéíóú']])('validates new ValueObjectString(%p)', (value) => {
        expect(validateType(new ValueObjectString(value as any))).toEqual([]);
      });

      it.each([['abc'], ['áéíóú']])(
        'typeof new ValueObjectString(%p).value === "string"',
        (value) => {
          expect(typeof new ValueObjectString(value as any).value).toEqual('string');
        },
      );
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeString: 'ValueObjectString must be a string',
        maxLength: 'ValueObjectString must be shorter than or equal to 5 characters',
        minLength: 'ValueObjectString must be longer than or equal to 2 characters',
        typePrimitive: 'Validation Error: Expected a valid String, but received {{$1}}.',
      };

      it.each(NON_STRING_COERCIBLE.map((v) => [v]))(
        'typePrimitive error for ValueObjectString(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new ValueObjectString(value as any);
            errors = validateType(type);
          } catch (e) {
            if (!(e instanceof TypePrimitiveException)) throw e;
            errors = [
              { property: 'value', constraints: { typePrimitive: (e as any)?.message ?? '' } },
            ];
          }
          expect(errors[0]).toBeDefined();
          expect(errors[0].constraints).toBeDefined();
          const displayValue = typeof value === 'string' ? `"${value}"` : value;
          expect(errors[0].constraints?.typePrimitive).toEqual(
            errorData.typePrimitive.replace('{{$1}}', universalToString(displayValue)),
          );
        },
      );

      it('maxLength error for ValueObjectString("12345678")', () => {
        const type = new ValueObjectString('12345678');
        const errors = validateType(type);
        expect(errors[0]).toBeDefined();
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].constraints).toEqual({ maxLength: errorData.maxLength });
      });

      it('minLength error for ValueObjectString("1")', () => {
        const type = new ValueObjectString('1');
        const errors = validateType(type);
        expect(errors[0]).toBeDefined();
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].constraints).toEqual({ minLength: errorData.minLength });
      });
    });

    describe('Compare values', () => {
      it.each([
        ['abc', 'abc'],
        ['áéíóú', 'áéíóú'],
      ])('ValueObjectString(%p).value toEqual %p', (input, expected) => {
        const type = new ValueObjectString(input);
        expect(type.value).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });
    });
  });

  describe('Expect Type', () => {
    type ExpectType = string;
    it('string and null', () => {
      const instance1 = new StringTypeOptional('abc');
      const instance2 = new StringTypeOptional();
      const instance3 = new StringTypeOptional(null);

      expectTypeOf<StringTypeOptional['value']>().toMatchTypeOf<ExpectType | null>();
      expectTypeOf<ExpectType | null>().toMatchTypeOf<StringTypeOptional['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance2.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance3.value).toMatchTypeOf<ExpectType | null>();
    });

    it('string', () => {
      const instance1 = new StringTypeRequired('abc');

      expectTypeOf<StringTypeRequired['value']>().toMatchTypeOf<ExpectType>();
      expectTypeOf<ExpectType>().toMatchTypeOf<StringTypeRequired['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType>();
    });
  });
});
