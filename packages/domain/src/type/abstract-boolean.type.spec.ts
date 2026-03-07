import { describe, expect, it } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { universalToString } from '@code-core/common';
import { BooleanTypeOptional, BooleanTypeRequired } from './index';
import { canByType, excludeItems, nullables, PrimitivesKeys, skipByType, skipByTypeRequired } from '@code-core/test';
import { validateType } from '../validator/decorator/type-validator';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

describe('AbstractBooleanType', () => {
  describe('BooleanTypeRequired', () => {
    describe('Valid Values', () => {
      it.each(canByType(PrimitivesKeys.BOOLEAN).map((v) => [v]))('validates new BooleanTypeRequired(%p)', (value) => {
        expect(validateType(new BooleanTypeRequired(value))).toEqual([]);
      });

      it.each(canByType(PrimitivesKeys.BOOLEAN).map((v) => [v]))(
        'typeof new BooleanTypeRequired(%p).value === "boolean"',
        (value) => {
          expect(typeof new BooleanTypeRequired(value).value).toEqual('boolean');
        },
      );
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeBoolean: 'BooleanTypeRequired must be a boolean',
        isNotEmpty: 'BooleanTypeRequired should not be empty',
        typePrimitive: 'Validation Error: Expected a valid Boolean, but received {{$1}}.',
      };

      it.each(excludeItems(skipByTypeRequired(PrimitivesKeys.BOOLEAN), [1, 0]).map((v) => [v]))(
        'typePrimitive error for BooleanTypeRequired(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new BooleanTypeRequired(value);
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

      it.each(nullables().map((v) => [v]))('canBeBoolean + isNotEmpty error for BooleanTypeRequired(%p)', (value) => {
        let errors: any[] = [];
        try {
          const type = new BooleanTypeRequired(value);
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
      });
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
      const validValues = canByType(PrimitivesKeys.BOOLEAN, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED);

      it.each(validValues.map((v) => [v]))('validates new BooleanTypeOptional(%p)', (value) => {
        expect(validateType(new BooleanTypeOptional(value))).toEqual([]);
      });

      it.each(
        validValues
          .filter((v) => v != null && v !== undefined)
          .map((v) => [v]),
      )('typeof new BooleanTypeOptional(%p).value === "boolean"', (value) => {
        expect(typeof new BooleanTypeOptional(value).value).toEqual('boolean');
      });

      it.each(
        validValues
          .filter((v) => v == null)
          .map((v) => [v]),
      )('new BooleanTypeOptional(%p).isNull is true', (value) => {
        expect(new BooleanTypeOptional(value).isNull).toEqual(true);
      });
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeBoolean: 'BooleanTypeOptional must be a boolean',
        typePrimitive: 'Validation Error: Expected a valid Boolean, but received {{$1}}.',
      };

      it.each(
        excludeItems(
          skipByType(PrimitivesKeys.BOOLEAN, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED),
          [0, 1],
        ).map((v) => [v]),
      )('typePrimitive error for BooleanTypeOptional(%p)', (value) => {
        let errors: any[] = [];
        try {
          const type = new BooleanTypeOptional(value);
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
        const type = new BooleanTypeOptional(input);
        expect(type.isNull).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it.each([
        [null, ''],
        [undefined, ''],
        [true, 'true'],
      ])('BooleanTypeOptional(%p).toString toEqual %p', (input, expected) => {
        const type = new BooleanTypeOptional(input);
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
