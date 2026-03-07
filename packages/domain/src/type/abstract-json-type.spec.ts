import { describe, expect, it } from '@jest/globals';
import { AbstractJsonType } from './abstract-json-type';
import { AddValidate, validateType } from '../validator/decorator/type-validator';
import { JsonSchemaValidator } from '../validator/decorator/custom/json-schema-validator';
import { expectTypeOf } from 'expect-type';
import { universalToString } from '@archi-code/common';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

interface JsonValuesTest {
  a: number;
}

@AddValidate([{ validator: 'IsOptional' }])
class JsonTypeOptional extends AbstractJsonType<JsonValuesTest, null> {
  constructor(value: JsonValuesTest | null = null) {
    super(value);
  }
}

@AddValidate([{ validator: 'IsNotEmpty' }])
class JsonTypeRequired extends AbstractJsonType<JsonValuesTest> {}

// canByType(OBJECT) = raw object + its JSON string representation
const VALID_OBJECTS = [{ a: 123 }, '{"a":123}'];

// skipByTypeRequired(OBJECT) = all raw non-object/non-null/non-undefined types, minus ''
// Plus empty object {} which also triggers typePrimitive
const NON_OBJECT_TYPES_REQUIRED = [
  // strings excluding empty — not valid objects
  'random', '   ', 'áéíóú', 'abc123',
  // numbers — not objects
  1, -1, 1.1, -1.1, 0,
  // booleans — not objects
  true, false,
  // arrays — not plain objects
  [], [1, 2, 3],
  // uuid — not an object
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
  // empty object (no required properties → invalid for typed schema)
  {},
];

// skipByType(OBJECT, NULL, UNDEFINED) = all raw non-object/non-null/non-undefined (includes '')
// Plus empty object {} which also triggers typePrimitive
const NON_OBJECT_TYPES_OPTIONAL = [
  // strings including empty — not valid objects
  'random', '', '   ', 'áéíóú', 'abc123',
  // numbers — not objects
  1, -1, 1.1, -1.1, 0,
  // booleans — not objects
  true, false,
  // arrays — not plain objects
  [], [1, 2, 3],
  // uuid — not an object
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
  // empty object (no required properties → invalid for typed schema)
  {},
];

describe('AbstractJsonType', () => {
  describe('JsonTypeRequired', () => {
    describe('Valid Values', () => {
      it.each(VALID_OBJECTS.map((v) => [v]))('validates new JsonTypeRequired(%p)', (value) => {
        expect(validateType(new JsonTypeRequired(value as any))).toEqual([]);
      });
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeJson: 'JsonTypeRequired must be a object or a valid JSON string.',
        isNotEmpty: 'JsonTypeRequired should not be empty',
        typePrimitive: 'Validation Error: Expected a valid Json, but received {{$1}}.',
      };

      it.each(NON_OBJECT_TYPES_REQUIRED.map((v) => [v]))(
        'typePrimitive error for JsonTypeRequired(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new JsonTypeRequired(value as any);
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

      it.each([[null], [undefined]])('canBeJson + isNotEmpty error for JsonTypeRequired(%p)', (value) => {
        let errors: any[] = [];
        try {
          const type = new JsonTypeRequired(value as any);
          errors = validateType(type);
        } catch (e) {
          if (!(e instanceof TypePrimitiveException)) throw e;
          errors = [{ property: 'value', constraints: { typePrimitive: (e as any)?.message ?? '' } }];
        }
        expect(errors[0]).toBeDefined();
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].constraints).toEqual({
          canBeJson: errorData.canBeJson,
          isNotEmpty: errorData.isNotEmpty,
        });
      });
    });

    describe('Compare values', () => {
      it('JsonTypeRequired({a:1}).value toEqual {a:1}', () => {
        const type = new JsonTypeRequired({ a: 1 });
        expect(type.value).toEqual({ a: 1 });
        expect(validateType(type)).toEqual([]);
      });

      it('JsonTypeRequired({a:1}).isNull toEqual false', () => {
        const type = new JsonTypeRequired({ a: 1 });
        expect(type.isNull).toEqual(false);
        expect(validateType(type)).toEqual([]);
      });

      it('JsonTypeRequired({a:1}).toString toEqual \'{"a":1}\'', () => {
        const type = new JsonTypeRequired({ a: 1 });
        expect(type.toString).toEqual('{"a":1}');
        expect(validateType(type)).toEqual([]);
      });
    });
  });

  describe('JsonTypeOptional', () => {
    describe('Valid Values', () => {
      it.each([...VALID_OBJECTS, null, undefined].map((v) => [v]))(
        'validates new JsonTypeOptional(%p)',
        (value) => {
          expect(validateType(new JsonTypeOptional(value as any))).toEqual([]);
        },
      );
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeJson: 'JsonTypeOptional must be a object or a valid JSON string.',
        typePrimitive: 'Validation Error: Expected a valid Json, but received {{$1}}.',
      };

      it.each(NON_OBJECT_TYPES_OPTIONAL.map((v) => [v]))(
        'typePrimitive error for JsonTypeOptional(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new JsonTypeOptional(value as any);
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

    describe('Compare values', () => {
      it.each([
        [{ a: 1 }, { a: 1 }],
        [null, null],
        [undefined, null],
      ])('JsonTypeOptional(%p).value toEqual %p', (input, expected) => {
        const type = new JsonTypeOptional(input as any);
        expect(type.value).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it.each([
        [{ a: 1 }, false],
        [null, true],
        [undefined, true],
      ])('JsonTypeOptional(%p).isNull toEqual %p', (input, expected) => {
        const type = new JsonTypeOptional(input as any);
        expect(type.isNull).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it.each([
        [null, ''],
        [undefined, ''],
        [{ a: 1 }, '{"a":1}'],
      ])('JsonTypeOptional(%p).toString toEqual %p', (input, expected) => {
        const type = new JsonTypeOptional(input as any);
        expect(type.toString).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });
    });
  });

  describe('AddValidate', () => {
    interface JsonTypeValidateRequiredType extends JsonValuesTest {
      email: string;
    }

    const jsonSchema = {
      type: 'object',
      properties: {
        a: { type: 'number', minimum: 10 },
        email: { type: 'string', format: 'email' },
      },
      required: ['a', 'email'],
      additionalProperties: false,
    };

    @AddValidate([{ validator: JsonSchemaValidator, value: jsonSchema }])
    class JsonTypeValidateRequired extends AbstractJsonType<JsonTypeValidateRequiredType> {}

    describe('Correct', () => {
      it('JsonTypeValidateRequired({a:11,email:"a@mail.com"}).value toEqual input', () => {
        const type = new JsonTypeValidateRequired({ a: 11, email: 'a@mail.com' });
        expect(type.value).toEqual({ a: 11, email: 'a@mail.com' });
        expect(validateType(type)).toEqual([]);
      });
    });

    describe('Error', () => {
      it('schemaValidator error for JsonTypeValidateRequired({a:20,email:"holi"})', () => {
        let errors: any[] = [];
        try {
          const type = new JsonTypeValidateRequired({ a: 20, email: 'holi' });
          errors = validateType(type);
        } catch (e) {
          if (!(e instanceof TypePrimitiveException)) throw e;
          errors = [{ property: 'value', constraints: { typePrimitive: (e as any)?.message ?? '' } }];
        }
        expect(errors[0]).toBeDefined();
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].constraints).toEqual({
          schemaValidator: 'JsonSchemaValidator:/email must match format "email"',
        });
      });
    });
  });

  describe('Validate objecet', () => {
    it('validate object', async () => {
      interface validateInterface {
        name?: string;
        username_password?: { password: string; userName: string } | undefined;
      }

      const jsonSchema = {
        type: 'object',
        properties: {
          username_password: {
            type: 'object',
            properties: {
              userName: { type: 'string', minLength: 5 },
              password: { type: 'string', minLength: 6 },
            },
            required: ['userName', 'password'],
          },
          name: { type: 'string', minLength: 2 },
        },
        required: ['username_password', 'name'],
      };

      @AddValidate([{ validator: JsonSchemaValidator, value: jsonSchema }])
      class ClassTypeValidator extends AbstractJsonType<validateInterface, null> {
        constructor(value: validateInterface | null = null) {
          super(value);
        }
      }

      const errors = validateType(
        new ClassTypeValidator({
          username_password: { userName: '12asdasdasd', password: '12' },
          name: 'a',
        }),
      );
      expect(errors[0].constraints).toEqual({
        schemaValidator:
          'JsonSchemaValidator:/username_password/password must NOT have fewer than 6 characters, /name must NOT have fewer than 2 characters',
      });
    });
  });

  describe('Expect Type', () => {
    type ExpectType = JsonValuesTest;
    it('number and null', () => {
      const instance1 = new JsonTypeOptional({ a: 1 });
      const instance2 = new JsonTypeOptional();
      const instance3 = new JsonTypeOptional(null);

      expectTypeOf<JsonTypeOptional['value']>().toMatchTypeOf<ExpectType | null>();
      expectTypeOf<ExpectType | null>().toMatchTypeOf<JsonTypeOptional['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance2.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance3.value).toMatchTypeOf<ExpectType | null>();
    });

    it('number', () => {
      const instance1 = new JsonTypeRequired({ a: 1 });

      expectTypeOf<JsonTypeRequired['value']>().toMatchTypeOf<ExpectType>();
      expectTypeOf<ExpectType>().toMatchTypeOf<JsonTypeRequired['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType>();
    });
  });

  describe('Expect Type object', () => {
    interface AuthDet {
      password?: string;
      userName?: string;

      [key: string]: string | undefined;
    }

    class DataAuthDet extends AbstractJsonType<AuthDet> {
      get password(): string | null {
        return this.value?.password ?? null;
      }
    }

    it('json', () => {
      const instance1 = new DataAuthDet({ password: '123' });

      expectTypeOf<DataAuthDet['value']>().toMatchTypeOf<AuthDet>();
      expectTypeOf<AuthDet>().toMatchTypeOf<DataAuthDet['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<AuthDet>();
    });
  });
});
