import { describe, expect, it } from '@jest/globals';
import { AddValidate, validateType } from '../validator/decorator/type-validator';
import { expectTypeOf } from 'expect-type';
import { universalToString } from '@archi-code/common';
import { AbstractEnumType } from './abstract-enum-type';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

enum StatusString {
  UP = 'up',
  DOWN = 'down',
}

@AddValidate([{ validator: 'IsEnum', value: StatusString }, { validator: 'IsNotEmpty' }])
export class EnumTypeRequired extends AbstractEnumType<StatusString> {
  protected getEnum(): Record<string, StatusString> {
    return StatusString;
  }
}

@AddValidate([{ validator: 'IsEnum', value: StatusString }, { validator: 'IsOptional' }])
export class EnumTypeOptional extends AbstractEnumType<StatusString, null> {
  protected getEnum(): Record<string, StatusString> {
    return StatusString;
  }
}

// allTypesRequired() = canByType of all non-null/undefined types, minus ''
// All of these are NOT valid enum values ('up' or 'down') → trigger TypePrimitive exception
const ALL_NON_ENUM_VALUES_REQUIRED = [
  // strings (empty excluded) — none match 'up' or 'down'
  'random',
  '   ',
  'áéíóú',
  'abc123',
  // numeric strings
  '1',
  '-1',
  '1.1',
  '-1.1',
  '0',
  // boolean strings
  'true',
  'false',
  // raw numbers
  1,
  -1,
  1.1,
  -1.1,
  0,
  // numeric strings (from NUMBER canByType)
  // (duplicates with STRING canByType are expected from allTypesRequired)
  // raw booleans
  true,
  false,
  // boolean string variants
  'True',
  'False',
  'TRUE',
  'FALSE',
  '  True  ',
  ' False ',
  ' TRUE ',
  '  FALSE ',
  ' true ',
  ' false ',
  // boolean numeric variants
  '1',
  ' 1',
  '0',
  ' 0',
  // uuid
  'df9ef000-21fc-4e06-b8f7-103c3a133d10',
  // object and its JSON string
  { a: 123 },
  '{"a":123}',
  // arrays
  [],
  [1, 2, 3],
  // functions
  () => 123,
  new Function('return 123'),
  // exotic types
  Symbol(),
  Symbol('123'),
  // valid date strings
  '2018-03-23T16:02:15.000Z',
  '2018-03-23',
  '2018-03-23 16:02:15.000Z',
  '2018-03-23T16:02:15',
  '2018-03-23 16:02:15',
  '2018-03-23 00:00:00',
  // date strings as Date objects
  new Date('2018-03-23T16:02:15.000Z'),
  new Date('2018-03-23'),
  new Date('2018-03-23 16:02:15.000Z'),
  new Date('2018-03-23T16:02:15'),
  new Date('2018-03-23 16:02:15'),
  new Date('2018-03-23 00:00:00'),
  // raw Date instances
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

// skipByType(NULL, UNDEFINED) = all raw primitive values except null and undefined
// All of these are NOT valid enum values → trigger TypePrimitive exception
const ALL_NON_ENUM_VALUES_OPTIONAL = [
  // strings including empty
  'random',
  '',
  '   ',
  'áéíóú',
  'abc123',
  // numbers
  1,
  -1,
  1.1,
  -1.1,
  0,
  // booleans
  true,
  false,
  // objects and arrays
  { a: 123 },
  [],
  [1, 2, 3],
  // uuid
  'df9ef000-21fc-4e06-b8f7-103c3a133d10',
  // functions
  () => 123,
  new Function('return 123'),
  // exotic types
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

describe('AbstractEnumType', () => {
  describe('EnumTypeRequired', () => {
    describe('Valid Values', () => {
      it.each([[StatusString.UP], [StatusString.DOWN], ['up'], ['down']])(
        'validates new EnumTypeRequired(%p)',
        (value) => {
          expect(validateType(new EnumTypeRequired(value as any))).toEqual([]);
        },
      );
    });

    describe('Invalid Values', () => {
      const errorData = {
        isEnum: 'EnumTypeRequired must be one of the following values: up, down',
        isNotEmpty: 'EnumTypeRequired should not be empty',
        typePrimitive: 'Validation Error: Expected one of [up, down], but received {{$1}}.',
      };

      it.each(ALL_NON_ENUM_VALUES_REQUIRED.map((v) => [v]))(
        'typePrimitive error for EnumTypeRequired(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new EnumTypeRequired(value as any);
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
        'isEnum + isNotEmpty error for EnumTypeRequired(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new EnumTypeRequired(value as any);
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
            isEnum: errorData.isEnum,
            isNotEmpty: errorData.isNotEmpty,
          });
        },
      );
    });

    describe('Compare values', () => {
      it.each([
        [StatusString.UP, 'up'],
        [StatusString.DOWN, 'down'],
        ['up', 'up'],
        ['down', 'down'],
      ])('EnumTypeRequired(%p).value toEqual %p', (input, expected) => {
        const type = new EnumTypeRequired(input as any);
        expect(type.value).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it.each([
        [StatusString.UP, false],
        ['up', false],
      ])('EnumTypeRequired(%p).isNull toEqual %p', (input, expected) => {
        const type = new EnumTypeRequired(input as any);
        expect(type.isNull).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it('EnumTypeRequired(StatusString.UP).toString toEqual "up"', () => {
        const type = new EnumTypeRequired(StatusString.UP);
        expect(type.toString).toEqual('up');
        expect(validateType(type)).toEqual([]);
      });
    });
  });

  describe('EnumTypeOptional', () => {
    describe('Valid Values', () => {
      it.each([[StatusString.UP], [StatusString.DOWN], ['up'], ['down'], [null], [undefined]])(
        'validates new EnumTypeOptional(%p)',
        (value) => {
          expect(validateType(new EnumTypeOptional(value as any))).toEqual([]);
        },
      );
    });

    describe('Invalid Values', () => {
      const errorData = {
        isEnum: 'EnumTypeOptional must be one of the following values: up, down',
        typePrimitive: 'Validation Error: Expected one of [up, down], but received {{$1}}.',
      };

      it.each(ALL_NON_ENUM_VALUES_OPTIONAL.map((v) => [v]))(
        'typePrimitive error for EnumTypeOptional(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new EnumTypeOptional(value as any);
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

    describe('compare values', () => {
      it.each([
        [StatusString.UP, 'up'],
        [StatusString.DOWN, 'down'],
        ['up', 'up'],
        ['down', 'down'],
        [null, null],
        [undefined, null],
      ])('EnumTypeOptional(%p).value toEqual %p', (input, expected) => {
        const type = new EnumTypeOptional(input as any);
        expect(type.value).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it.each([
        [StatusString.UP, false],
        ['up', false],
        [null, true],
        [undefined, true],
      ])('EnumTypeOptional(%p).isNull toEqual %p', (input, expected) => {
        const type = new EnumTypeOptional(input as any);
        expect(type.isNull).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it.each([
        [StatusString.UP, 'up'],
        [null, ''],
        [undefined, ''],
      ])('EnumTypeOptional(%p).toString toEqual %p', (input, expected) => {
        const type = new EnumTypeOptional(input as any);
        expect(type.toString).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });
    });
  });

  describe('Expect Type', () => {
    type ExpectType = StatusString;
    it('Enum and null', () => {
      const instance1 = new EnumTypeOptional(StatusString.UP);
      const instance2 = new EnumTypeOptional(null);

      expectTypeOf<EnumTypeOptional['value']>().toMatchTypeOf<ExpectType | null>();
      expectTypeOf<ExpectType | null>().toMatchTypeOf<EnumTypeOptional['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance2.value).toMatchTypeOf<ExpectType | null>();
    });

    it('Enum', () => {
      const instance1 = new EnumTypeRequired(StatusString.UP);

      expectTypeOf<EnumTypeRequired['value']>().toMatchTypeOf<ExpectType>();
      expectTypeOf<ExpectType>().toMatchTypeOf<EnumTypeRequired['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType>();
    });
  });
});
