import { describe, expect, it } from '@jest/globals';
import {
  canByType,
  errorTypeValidValueSpec,
  nullables,
  PrimitivesKeys,
  skipByType,
  skipByTypeRequired,
  typeValidationSpec,
  typeValidValueSpec,
} from '@code-core/test';
import { AbstractJsonType } from './abstract-json-type';
import { AddValidate, validateType } from '../validator/decorator/type-validator';
import { JsonSchemaValidator } from '../validator/decorator/custom/json-schema-validator';
import { expectTypeOf } from 'expect-type';
import { universalToString } from '@code-core/common';
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

describe('AbstractJsonType', () => {
  describe('JsonTypeRequired', () => {
    describe('Valid Values', () => {
      typeValidValueSpec(validateType, JsonTypeRequired, canByType(PrimitivesKeys.OBJECT));
    });
    describe('Invalid Values', () => {
      const errorData = {
        canBeJson: 'JsonTypeRequired must be a object or a valid JSON string.',
        isNotEmpty: 'JsonTypeRequired should not be empty',
        typePrimitive: 'Validation Error: Expected a valid Json, but received {{$1}}.',
      };
      errorTypeValidValueSpec<keyof typeof errorData>(
        validateType,
        TypePrimitiveException,
        JsonTypeRequired,
        errorData,
        [
          {
            constraints: ['typePrimitive'],
            values: [...skipByTypeRequired(PrimitivesKeys.OBJECT), {}],
            valuesTxt: { typePrimitive: { '{{$1}}': universalToString } },
          },
          {
            constraints: ['canBeJson', 'isNotEmpty'],
            values: nullables(),
          },
        ],
      );
    });
    describe('Compare values', () => {
      typeValidationSpec(validateType, JsonTypeRequired, {
        value: [[{ a: 1 }, { a: 1 }]],
        isNull: [[{ a: 1 }, false]],
        toString: [[{ a: 1 }, '{"a":1}']],
      });
    });
  });
  describe('JsonTypeOptional', () => {
    describe('Valid Values', () => {
      typeValidValueSpec(
        validateType,
        JsonTypeOptional,
        canByType(PrimitivesKeys.OBJECT, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED),
      );
    });
    describe('Invalid Values', () => {
      const errorData = {
        canBeJson: 'JsonTypeOptional must be a object or a valid JSON string.',
        typePrimitive: 'Validation Error: Expected a valid Json, but received {{$1}}.',
      };
      errorTypeValidValueSpec<keyof typeof errorData>(
        validateType,
        TypePrimitiveException,
        JsonTypeOptional,
        errorData,
        [
          {
            constraints: ['typePrimitive'],
            values: [
              ...skipByType(PrimitivesKeys.OBJECT, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED),
              {},
            ],
            valuesTxt: { typePrimitive: { '{{$1}}': universalToString } },
          },
        ],
      );
    });
    describe('Compare values', () => {
      typeValidationSpec(validateType, JsonTypeOptional, {
        value: [
          [{ a: 1 }, { a: 1 }],
          [null, null],
          [undefined, null],
        ],
        isNull: [
          [{ a: 1 }, false],
          [null, true],
          [undefined, true],
        ],
        toString: [
          [null, ''],
          [undefined, ''],
          [{ a: 1 }, '{"a":1}'],
        ],
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
      typeValidationSpec(validateType, JsonTypeValidateRequired, {
        value: [
          [
            { a: 11, email: 'a@mail.com' },
            { a: 11, email: 'a@mail.com' },
          ],
        ],
      });
    });
    describe('Error', () => {
      const errorData = {
        schemaValidator: 'JsonSchemaValidator:/email must match format "email"',
      };
      errorTypeValidValueSpec<keyof typeof errorData>(
        validateType,
        TypePrimitiveException,
        JsonTypeValidateRequired,
        errorData,
        [
          {
            constraints: ['schemaValidator'],
            values: [{ a: 20, email: 'holi' }],
          },
        ],
      );
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
