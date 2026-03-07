import { describe, expect, it } from '@jest/globals';
import { canByType, nullables, PrimitivesKeys, skipByType, skipByTypeRequired } from '@code-core/test';
import { expectTypeOf } from 'expect-type';
import { universalToString } from '@code-core/common';
import { DateTypeOptional, DateTypeRequired } from './index';
import { validateType } from '../validator/decorator/type-validator';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

describe('AbstractDateType', () => {
  describe('DateTypeRequired', () => {
    describe('Valid Values', () => {
      it.each(canByType(PrimitivesKeys.DATE).map((v) => [v]))('validates new DateTypeRequired(%p)', (value) => {
        expect(validateType(new DateTypeRequired(value))).toEqual([]);
      });
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeDate: 'DateTypeRequired must be a Date or a valid ISO 8601 date string',
        isNotEmpty: 'DateTypeRequired should not be empty',
        typePrimitive: 'Validation Error: Expected a valid Date, but received {{$1}}.',
      };

      it.each(skipByTypeRequired(PrimitivesKeys.DATE).map((v) => [v]))(
        'typePrimitive error for DateTypeRequired(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new DateTypeRequired(value);
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

      it.each(nullables().map((v) => [v]))('canBeDate + isNotEmpty error for DateTypeRequired(%p)', (value) => {
        let errors: any[] = [];
        try {
          const type = new DateTypeRequired(value);
          errors = validateType(type);
        } catch (e) {
          if (!(e instanceof TypePrimitiveException)) throw e;
          errors = [{ property: 'value', constraints: { typePrimitive: (e as any)?.message ?? '' } }];
        }
        expect(errors[0]).toBeDefined();
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].constraints).toEqual({
          canBeDate: errorData.canBeDate,
          isNotEmpty: errorData.isNotEmpty,
        });
      });
    });

    describe('Compare values', () => {
      it.each([
        ['2018-03-23T16:02:15.000Z', new Date('2018-03-23T16:02:15.000Z')],
        ['2018-03-23', new Date('2018-03-23T00:00:00.000Z')],
      ])('DateTypeRequired(%p).value toEqual %p', (input, expected) => {
        const type = new DateTypeRequired(input as any);
        expect(type.value).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it('DateTypeRequired("2018-03-23T16:02:15.000Z").isNull toEqual false', () => {
        const type = new DateTypeRequired('2018-03-23T16:02:15.000Z' as any);
        expect(type.isNull).toEqual(false);
        expect(validateType(type)).toEqual([]);
      });

      it('DateTypeRequired("2018-03-23T16:02:15.000Z").toString toEqual "2018-03-23T16:02:15.000Z"', () => {
        const type = new DateTypeRequired('2018-03-23T16:02:15.000Z' as any);
        expect(type.toString).toEqual('2018-03-23T16:02:15.000Z');
        expect(validateType(type)).toEqual([]);
      });
    });
  });

  describe('DateTypeOptional', () => {
    describe('Valid Values', () => {
      it.each(
        canByType(PrimitivesKeys.DATE, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED).map((v) => [v]),
      )('validates new DateTypeOptional(%p)', (value) => {
        expect(validateType(new DateTypeOptional(value))).toEqual([]);
      });
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeDate: 'DateTypeOptional must be a Date or a valid ISO 8601 date string',
        typePrimitive: 'Validation Error: Expected a valid Date, but received {{$1}}.',
      };

      it.each(
        skipByType(PrimitivesKeys.DATE, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED).map((v) => [v]),
      )('typePrimitive error for DateTypeOptional(%p)', (value) => {
        let errors: any[] = [];
        try {
          const type = new DateTypeOptional(value);
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
        ['2018-03-23T16:02:15.000Z', new Date('2018-03-23T16:02:15.000Z')],
        ['2018-03-23', new Date('2018-03-23T00:00:00.000Z')],
        [null, null],
        [undefined, null],
      ])('DateTypeOptional(%p).value toEqual %p', (input, expected) => {
        const type = new DateTypeOptional(input as any);
        expect(type.value).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it.each([
        ['2018-03-23T16:02:15.000Z', false],
        [null, true],
        [undefined, true],
      ])('DateTypeOptional(%p).isNull toEqual %p', (input, expected) => {
        const type = new DateTypeOptional(input as any);
        expect(type.isNull).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it.each([
        ['2018-03-23T16:02:15.000Z', '2018-03-23T16:02:15.000Z'],
        [null, ''],
        [undefined, ''],
      ])('DateTypeOptional(%p).toString toEqual %p', (input, expected) => {
        const type = new DateTypeOptional(input as any);
        expect(type.toString).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });
    });
  });

  describe('Expect Type', () => {
    type ExpectType = Date;
    it('boolean and null', () => {
      const instance1 = new DateTypeOptional(new Date());
      const instance2 = new DateTypeOptional();
      const instance3 = new DateTypeOptional(null);

      expectTypeOf<DateTypeOptional['value']>().toMatchTypeOf<ExpectType | null>();
      expectTypeOf<ExpectType | null>().toMatchTypeOf<DateTypeOptional['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance2.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance3.value).toMatchTypeOf<ExpectType | null>();
    });

    it('boolean', () => {
      const instance1 = new DateTypeRequired(new Date());

      expectTypeOf<DateTypeRequired['value']>().toMatchTypeOf<ExpectType>();
      expectTypeOf<ExpectType>().toMatchTypeOf<DateTypeRequired['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType>();
    });
  });
});
