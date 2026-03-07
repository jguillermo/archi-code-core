import { describe, expect, it } from '@jest/globals';
import { canByType, excludeItems, PrimitivesKeys, skipByType, skipByTypeRequired } from '@code-core/test';
import { AddValidate, validateType } from '../validator/decorator/type-validator';
import { expectTypeOf } from 'expect-type';
import { universalToString } from '@code-core/common';
import { AbstractStringType, StringTypeOptional, StringTypeRequired } from './index';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

describe('AbstractStringType', () => {
  describe('StringTypeRequired', () => {
    describe('Valid Values', () => {
      const validValues = excludeItems(canByType(PrimitivesKeys.STRING), ['']);

      it.each(validValues.map((v) => [v]))('validates new StringTypeRequired(%p)', (value) => {
        expect(validateType(new StringTypeRequired(value))).toEqual([]);
      });

      it.each(
        validValues
          .filter((v) => v != null && v !== undefined)
          .map((v) => [v]),
      )('typeof new StringTypeRequired(%p).value === "string"', (value) => {
        expect(typeof new StringTypeRequired(value).value).toEqual('string');
      });
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeString: 'StringTypeRequired must be a string',
        isNotEmpty: 'StringTypeRequired should not be empty',
        typePrimitive: 'Validation Error: Expected a valid String, but received {{$1}}.',
      };

      it.each(
        skipByTypeRequired(PrimitivesKeys.STRING, PrimitivesKeys.UUID, PrimitivesKeys.NUMBER, PrimitivesKeys.BOOLEAN).map((v) => [v]),
      )('typePrimitive error for StringTypeRequired(%p)', (value) => {
        let errors: any[] = [];
        try {
          const type = new StringTypeRequired(value);
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

      it.each([...canByType(PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED)].map((v) => [v]))(
        'canBeString + isNotEmpty error for StringTypeRequired(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new StringTypeRequired(value);
            errors = validateType(type);
          } catch (e) {
            if (!(e instanceof TypePrimitiveException)) throw e;
            errors = [{ property: 'value', constraints: { typePrimitive: (e as any)?.message ?? '' } }];
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
          errors = [{ property: 'value', constraints: { typePrimitive: (e as any)?.message ?? '' } }];
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
      const validValues = canByType(PrimitivesKeys.STRING, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED);

      it.each(validValues.map((v) => [v]))('validates new StringTypeOptional(%p)', (value) => {
        expect(validateType(new StringTypeOptional(value))).toEqual([]);
      });

      it.each(
        validValues
          .filter((v) => v != null && v !== undefined)
          .map((v) => [v]),
      )('typeof new StringTypeOptional(%p).value === "string"', (value) => {
        expect(typeof new StringTypeOptional(value).value).toEqual('string');
      });

      it.each(
        validValues
          .filter((v) => v == null)
          .map((v) => [v]),
      )('new StringTypeOptional(%p).isNull is true', (value) => {
        expect(new StringTypeOptional(value).isNull).toEqual(true);
      });
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeString: 'StringTypeOptional must be a string',
        typePrimitive: 'Validation Error: Expected a valid String, but received {{$1}}.',
      };

      it.each(
        skipByType(
          PrimitivesKeys.STRING,
          PrimitivesKeys.NUMBER,
          PrimitivesKeys.BOOLEAN,
          PrimitivesKeys.UUID,
          PrimitivesKeys.NULL,
          PrimitivesKeys.UNDEFINED,
        ).map((v) => [v]),
      )('typePrimitive error for StringTypeOptional(%p)', (value) => {
        let errors: any[] = [];
        try {
          const type = new StringTypeOptional(value);
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
        ['áéíóú', 'áéíóú'],
        [null, null],
        [undefined, null],
      ])('StringTypeOptional(%p).value toEqual %p', (input, expected) => {
        const type = new StringTypeOptional(input);
        expect(type.value).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it.each([
        ['áéíóú', false],
        [null, true],
        [undefined, true],
      ])('StringTypeOptional(%p).isNull toEqual %p', (input, expected) => {
        const type = new StringTypeOptional(input);
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
        expect(validateType(new ValueObjectString(value))).toEqual([]);
      });

      it.each([['abc'], ['áéíóú']])('typeof new ValueObjectString(%p).value === "string"', (value) => {
        expect(typeof new ValueObjectString(value).value).toEqual('string');
      });
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeString: 'ValueObjectString must be a string',
        maxLength: 'ValueObjectString must be shorter than or equal to 5 characters',
        minLength: 'ValueObjectString must be longer than or equal to 2 characters',
        typePrimitive: 'Validation Error: Expected a valid String, but received {{$1}}.',
      };

      it.each(
        skipByType(
          PrimitivesKeys.STRING,
          PrimitivesKeys.NUMBER,
          PrimitivesKeys.BOOLEAN,
          PrimitivesKeys.UUID,
          PrimitivesKeys.NULL,
          PrimitivesKeys.UNDEFINED,
        ).map((v) => [v]),
      )('typePrimitive error for ValueObjectString(%p)', (value) => {
        let errors: any[] = [];
        try {
          const type = new ValueObjectString(value);
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
    it('number and null', () => {
      const instance1 = new StringTypeOptional('abc');
      const instance2 = new StringTypeOptional();
      const instance3 = new StringTypeOptional(null);

      expectTypeOf<StringTypeOptional['value']>().toMatchTypeOf<ExpectType | null>();
      expectTypeOf<ExpectType | null>().toMatchTypeOf<StringTypeOptional['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance2.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance3.value).toMatchTypeOf<ExpectType | null>();
    });

    it('number', () => {
      const instance1 = new StringTypeRequired('abc');

      expectTypeOf<StringTypeRequired['value']>().toMatchTypeOf<ExpectType>();
      expectTypeOf<ExpectType>().toMatchTypeOf<StringTypeRequired['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType>();
    });
  });
});
