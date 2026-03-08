import { describe, expect, it } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { universalToString } from '@archi-code/common';
import { AbstractUuidType, IdType, UuidTypeOptional, UuidTypeRequired } from './index';
import { validateType } from '../validator/decorator/type-validator';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

const UUID_4_VALUE = 'df9ef000-21fc-4e06-b8f7-103c3a133d10';

// canByType(UUID) = just the UUID value
const VALID_UUID = [UUID_4_VALUE];

// skipByTypeRequired(UUID) = all raw non-uuid/non-null/non-undefined types, minus ''
// These trigger TypePrimitive exception for Required variants
const NON_UUID_TYPES_REQUIRED = [
  // strings excluding empty
  'random',
  '   ',
  'áéíóú',
  'abc123',
  // numbers — not uuids
  1,
  -1,
  1.1,
  -1.1,
  0,
  // booleans — not uuids
  true,
  false,
  // objects and arrays
  { a: 123 },
  [],
  [1, 2, 3],
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

// excludeItems(skipByType(UUID, NULL, UNDEFINED), [0, 1])
// = all raw non-uuid/non-null/non-undefined types (includes ''), minus 0 and 1
const NON_UUID_TYPES_OPTIONAL = [
  // strings including empty
  'random',
  '',
  '   ',
  'áéíóú',
  'abc123',
  // numbers excluding 0 and 1 (coercible to boolean)
  -1,
  1.1,
  -1.1,
  // booleans — not uuids
  true,
  false,
  // objects and arrays
  { a: 123 },
  [],
  [1, 2, 3],
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

describe('AbstractUuidType', () => {
  describe('IdType', () => {
    describe('Valid Values', () => {
      it.each(VALID_UUID.map((v) => [v]))('validates new IdType(%p)', (value) => {
        expect(validateType(new IdType(value as any))).toEqual([]);
      });

      it.each(VALID_UUID.map((v) => [v]))('typeof new IdType(%p).value === "string"', (value) => {
        expect(typeof new IdType(value as any).value).toEqual('string');
      });
    });

    describe('Invalid Values', () => {
      const errorData = {
        isUuid: 'IdType must be a UUID',
        isNotEmpty: 'IdType should not be empty',
        typePrimitive: 'Validation Error: Expected a valid UUID, but received {{$1}}.',
      };

      it.each(NON_UUID_TYPES_REQUIRED.map((v) => [v]))(
        'typePrimitive error for IdType(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new IdType(value as any);
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

      it.each([[null], [undefined]])('isUuid + isNotEmpty error for IdType(%p)', (value) => {
        let errors: any[] = [];
        try {
          const type = new IdType(value as any);
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
          isUuid: errorData.isUuid,
          isNotEmpty: errorData.isNotEmpty,
        });
      });
    });

    describe('Compare values', () => {
      it(`IdType(${UUID_4_VALUE}).value toEqual ${UUID_4_VALUE}`, () => {
        const type = new IdType(UUID_4_VALUE);
        expect(type.value).toEqual(UUID_4_VALUE);
        expect(validateType(type)).toEqual([]);
      });

      it(`IdType(${UUID_4_VALUE}).isNull toEqual false`, () => {
        const type = new IdType(UUID_4_VALUE);
        expect(type.isNull).toEqual(false);
        expect(validateType(type)).toEqual([]);
      });

      it(`IdType(${UUID_4_VALUE}).toString toEqual "df9ef000-21fc-4e06-b8f7-103c3a133d10"`, () => {
        const type = new IdType(UUID_4_VALUE);
        expect(type.toString).toEqual('df9ef000-21fc-4e06-b8f7-103c3a133d10');
        expect(validateType(type)).toEqual([]);
      });
    });
  });

  describe('UuidTypeRequired', () => {
    describe('Valid Values', () => {
      it.each(VALID_UUID.map((v) => [v]))('validates new UuidTypeRequired(%p)', (value) => {
        expect(validateType(new UuidTypeRequired(value as any))).toEqual([]);
      });

      it.each(VALID_UUID.map((v) => [v]))(
        'typeof new UuidTypeRequired(%p).value === "string"',
        (value) => {
          expect(typeof new UuidTypeRequired(value as any).value).toEqual('string');
        },
      );

      it('validates AbstractUuidType.random()', () => {
        expect(validateType(new UuidTypeRequired(AbstractUuidType.random()))).toEqual([]);
      });

      it('validates AbstractUuidType.fromValue("123")', () => {
        expect(validateType(new UuidTypeRequired(AbstractUuidType.fromValue('123')))).toEqual([]);
      });

      it('validates UuidTypeRequired.random()', () => {
        expect(validateType(new UuidTypeRequired(UuidTypeRequired.random()))).toEqual([]);
      });

      it('validates UuidTypeRequired.fromValue("123")', () => {
        expect(validateType(new UuidTypeRequired(UuidTypeRequired.fromValue('123')))).toEqual([]);
      });
    });

    describe('Invalid Values', () => {
      const errorData = {
        isUuid: 'UuidTypeRequired must be a UUID',
        isNotEmpty: 'UuidTypeRequired should not be empty',
        typePrimitive: 'Validation Error: Expected a valid UUID, but received {{$1}}.',
      };

      it.each(NON_UUID_TYPES_REQUIRED.map((v) => [v]))(
        'typePrimitive error for UuidTypeRequired(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new UuidTypeRequired(value as any);
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
        'isUuid + isNotEmpty error for UuidTypeRequired(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new UuidTypeRequired(value as any);
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
            isUuid: errorData.isUuid,
            isNotEmpty: errorData.isNotEmpty,
          });
        },
      );
    });

    describe('Compare values', () => {
      it.each([
        [UUID_4_VALUE, UUID_4_VALUE],
        [AbstractUuidType.fromValue('123'), '37813542-0dca-5a8a-b2a2-b69c2d45583f'],
        [UuidTypeRequired.fromValue('123'), '37813542-0dca-5a8a-b2a2-b69c2d45583f'],
      ])('UuidTypeRequired(%p).value toEqual %p', (input, expected) => {
        const type = new UuidTypeRequired(input);
        expect(type.value).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it(`UuidTypeRequired(${UUID_4_VALUE}).isNull toEqual false`, () => {
        const type = new UuidTypeRequired(UUID_4_VALUE);
        expect(type.isNull).toEqual(false);
        expect(validateType(type)).toEqual([]);
      });

      it(`UuidTypeRequired(${UUID_4_VALUE}).toString toEqual "df9ef000-21fc-4e06-b8f7-103c3a133d10"`, () => {
        const type = new UuidTypeRequired(UUID_4_VALUE);
        expect(type.toString).toEqual('df9ef000-21fc-4e06-b8f7-103c3a133d10');
        expect(validateType(type)).toEqual([]);
      });
    });
  });

  describe('UuidTypeOptional', () => {
    describe('Valid Values', () => {
      it.each([...VALID_UUID, null, undefined].map((v) => [v]))(
        'validates new UuidTypeOptional(%p)',
        (value) => {
          expect(validateType(new UuidTypeOptional(value as any))).toEqual([]);
        },
      );

      it.each(VALID_UUID.map((v) => [v]))(
        'typeof new UuidTypeOptional(%p).value === "string"',
        (value) => {
          expect(typeof new UuidTypeOptional(value as any).value).toEqual('string');
        },
      );

      it.each([[null], [undefined]])('new UuidTypeOptional(%p).isNull is true', (value) => {
        expect(new UuidTypeOptional(value as any).isNull).toEqual(true);
      });

      it('validates AbstractUuidType.random()', () => {
        expect(validateType(new UuidTypeOptional(AbstractUuidType.random()))).toEqual([]);
      });

      it('validates AbstractUuidType.fromValue("123")', () => {
        expect(validateType(new UuidTypeOptional(AbstractUuidType.fromValue('123')))).toEqual([]);
      });

      it('validates UuidTypeOptional.random()', () => {
        expect(validateType(new UuidTypeOptional(UuidTypeOptional.random()))).toEqual([]);
      });

      it('validates UuidTypeOptional.fromValue("123")', () => {
        expect(validateType(new UuidTypeOptional(UuidTypeOptional.fromValue('123')))).toEqual([]);
      });
    });

    describe('Invalid Values', () => {
      const errorData = {
        isUuid: 'UuidTypeOptional must be a UUID',
        typePrimitive: 'Validation Error: Expected a valid UUID, but received {{$1}}.',
      };

      it.each(NON_UUID_TYPES_OPTIONAL.map((v) => [v]))(
        'typePrimitive error for UuidTypeOptional(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new UuidTypeOptional(value as any);
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
        [UUID_4_VALUE, 'df9ef000-21fc-4e06-b8f7-103c3a133d10'],
        [AbstractUuidType.fromValue('123'), '37813542-0dca-5a8a-b2a2-b69c2d45583f'],
        [UuidTypeRequired.fromValue('123'), '37813542-0dca-5a8a-b2a2-b69c2d45583f'],
        [null, null],
        [undefined, null],
      ])('UuidTypeOptional(%p).value toEqual %p', (input, expected) => {
        const type = new UuidTypeOptional(input as any);
        expect(type.value).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it.each([
        [null, true],
        [undefined, true],
        [UUID_4_VALUE, false],
      ])('UuidTypeOptional(%p).isNull toEqual %p', (input, expected) => {
        const type = new UuidTypeOptional(input as any);
        expect(type.isNull).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it.each([
        [null, ''],
        [undefined, ''],
        [UUID_4_VALUE, 'df9ef000-21fc-4e06-b8f7-103c3a133d10'],
      ])('UuidTypeOptional(%p).toString toEqual %p', (input, expected) => {
        const type = new UuidTypeOptional(input as any);
        expect(type.toString).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });
    });
  });

  describe('Expect Type', () => {
    type ExpectType = string;
    it('string and null', () => {
      const instance1 = new UuidTypeOptional(UUID_4_VALUE);
      const instance2 = new UuidTypeOptional();
      const instance3 = new UuidTypeOptional(null);

      expectTypeOf<UuidTypeOptional['value']>().toMatchTypeOf<ExpectType | null>();
      expectTypeOf<ExpectType | null>().toMatchTypeOf<UuidTypeOptional['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance2.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance3.value).toMatchTypeOf<ExpectType | null>();
    });

    it('string', () => {
      const instance1 = new UuidTypeRequired(UUID_4_VALUE);

      expectTypeOf<UuidTypeRequired['value']>().toMatchTypeOf<ExpectType>();
      expectTypeOf<ExpectType>().toMatchTypeOf<UuidTypeRequired['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType>();
    });

    it('id', () => {
      const instance1 = new IdType(UUID_4_VALUE);

      expectTypeOf<IdType['value']>().toMatchTypeOf<ExpectType>();
      expectTypeOf<ExpectType>().toMatchTypeOf<IdType['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType>();
    });
  });
});
