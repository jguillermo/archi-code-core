import { describe, expect, it } from '@jest/globals';
import { canByType, nullables, PrimitivesKeys, skipByType, skipByTypeRequired } from '@code-core/test';
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
      it.each(canByType(PrimitivesKeys.OBJECT).map((v) => [v]))('validates new JsonTypeRequired(%p)', (value) => {
        expect(validateType(new JsonTypeRequired(value))).toEqual([]);
      });
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeJson: 'JsonTypeRequired must be a object or a valid JSON string.',
        isNotEmpty: 'JsonTypeRequired should not be empty',
        typePrimitive: 'Validation Error: Expected a valid Json, but received {{$1}}.',
      };

      it.each([...skipByTypeRequired(PrimitivesKeys.OBJECT), {}].map((v) => [v]))(
        'typePrimitive error for JsonTypeRequired(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new JsonTypeRequired(value);
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

      it.each(nullables().map((v) => [v]))('canBeJson + isNotEmpty error for JsonTypeRequired(%p)', (value) => {
        let errors: any[] = [];
        try {
          const type = new JsonTypeRequired(value);
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
      it.each(
        canByType(PrimitivesKeys.OBJECT, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED).map((v) => [v]),
      )('validates new JsonTypeOptional(%p)', (value) => {
        expect(validateType(new JsonTypeOptional(value))).toEqual([]);
      });
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeJson: 'JsonTypeOptional must be a object or a valid JSON string.',
        typePrimitive: 'Validation Error: Expected a valid Json, but received {{$1}}.',
      };

      it.each(
        [...skipByType(PrimitivesKeys.OBJECT, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED), {}].map((v) => [v]),
      )('typePrimitive error for JsonTypeOptional(%p)', (value) => {
        let errors: any[] = [];
        try {
          const type = new JsonTypeOptional(value);
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
      });
    });

    describe('Compare values', () => {
      it.each([
        [{ a: 1 }, { a: 1 }],
        [null, null],
        [undefined, null],
      ])('JsonTypeOptional(%p).value toEqual %p', (input, expected) => {
        const type = new JsonTypeOptional(input);
        expect(type.value).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it.each([
        [{ a: 1 }, false],
        [null, true],
        [undefined, true],
      ])('JsonTypeOptional(%p).isNull toEqual %p', (input, expected) => {
        const type = new JsonTypeOptional(input);
        expect(type.isNull).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it.each([
        [null, ''],
        [undefined, ''],
        [{ a: 1 }, '{"a":1}'],
      ])('JsonTypeOptional(%p).toString toEqual %p', (input, expected) => {
        const type = new JsonTypeOptional(input);
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
