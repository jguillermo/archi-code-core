import { describe, expect, it } from '@jest/globals';
import { AddValidate, validateType } from '../validator/decorator/type-validator';
import { allTypesRequired, canByType, nullables, PrimitivesKeys, skipByType } from '@code-core/test';
import { expectTypeOf } from 'expect-type';
import { universalToString } from '@code-core/common';
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

      it.each(allTypesRequired().map((v) => [v]))('typePrimitive error for EnumTypeRequired(%p)', (value) => {
        let errors: any[] = [];
        try {
          const type = new EnumTypeRequired(value);
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

      it.each(nullables().map((v) => [v]))('isEnum + isNotEmpty error for EnumTypeRequired(%p)', (value) => {
        let errors: any[] = [];
        try {
          const type = new EnumTypeRequired(value);
          errors = validateType(type);
        } catch (e) {
          if (!(e instanceof TypePrimitiveException)) throw e;
          errors = [{ property: 'value', constraints: { typePrimitive: (e as any)?.message ?? '' } }];
        }
        expect(errors[0]).toBeDefined();
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].constraints).toEqual({
          isEnum: errorData.isEnum,
          isNotEmpty: errorData.isNotEmpty,
        });
      });
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
      it.each(
        [StatusString.UP, StatusString.DOWN, 'up', 'down', ...canByType(PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED)].map(
          (v) => [v],
        ),
      )('validates new EnumTypeOptional(%p)', (value) => {
        expect(validateType(new EnumTypeOptional(value))).toEqual([]);
      });
    });

    describe('Invalid Values', () => {
      const errorData = {
        isEnum: 'EnumTypeOptional must be one of the following values: up, down',
        typePrimitive: 'Validation Error: Expected one of [up, down], but received {{$1}}.',
      };

      it.each(skipByType(PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED).map((v) => [v]))(
        'typePrimitive error for EnumTypeOptional(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new EnumTypeOptional(value);
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
