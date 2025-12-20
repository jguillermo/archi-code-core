import { describe, it } from '@jest/globals';
import { canByType, errorTypeValidValueSpec, nullables, PrimitivesKeys, skipByType, skipByTypeRequired, typeValidationSpec, typeValidValueSpec } from '@code-core/test';
import { expectTypeOf } from 'expect-type';
import { universalToString } from '@code-core/common';
import { DateTypeOptional, DateTypeRequired } from './index';
import { validateType } from '../validator/decorator/type-validator';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

describe('AbstractDateType', () => {
  describe('DateTypeRequired', () => {
    describe('Valid Values', () => {
      typeValidValueSpec(validateType, DateTypeRequired, canByType(PrimitivesKeys.DATE));
    });
    describe('Invalid Values', () => {
      const errorData = {
        canBeDate: 'DateTypeRequired must be a Date or a valid ISO 8601 date string',
        isNotEmpty: 'DateTypeRequired should not be empty',
        typePrimitive: 'Validation Error: Expected a valid Date, but received {{$1}}.',
      };
      errorTypeValidValueSpec<keyof typeof errorData>(validateType, TypePrimitiveException, DateTypeRequired, errorData, [
        {
          constraints: ['typePrimitive'],
          values: skipByTypeRequired(PrimitivesKeys.DATE),
          valuesTxt: { typePrimitive: { '{{$1}}': universalToString } },
        },
        {
          constraints: ['canBeDate', 'isNotEmpty'],
          values: nullables(),
        },
      ]);
    });
    describe('Compare values', () => {
      typeValidationSpec(validateType, DateTypeRequired, {
        value: [
          ['2018-03-23T16:02:15.000Z', new Date('2018-03-23T16:02:15.000Z')],
          ['2018-03-23', new Date('2018-03-23T00:00:00.000Z')],
        ],
        isNull: [['2018-03-23T16:02:15.000Z', false]],
        toString: [['2018-03-23T16:02:15.000Z', '2018-03-23T16:02:15.000Z']],
      });
    });
  });
  describe('DateTypeOptional', () => {
    describe('Valid Values', () => {
      typeValidValueSpec(validateType, DateTypeOptional, canByType(PrimitivesKeys.DATE, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED));
    });
    describe('Invalid Values', () => {
      const errorData = {
        canBeDate: 'DateTypeOptional must be a Date or a valid ISO 8601 date string',
        typePrimitive: 'Validation Error: Expected a valid Date, but received {{$1}}.',
      };
      errorTypeValidValueSpec<keyof typeof errorData>(validateType, TypePrimitiveException, DateTypeOptional, errorData, [
        {
          constraints: ['typePrimitive'],
          values: skipByType(PrimitivesKeys.DATE, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED),
          valuesTxt: { typePrimitive: { '{{$1}}': universalToString } },
        },
      ]);
    });
    describe('Compare values', () => {
      typeValidationSpec(validateType, DateTypeOptional, {
        value: [
          ['2018-03-23T16:02:15.000Z', new Date('2018-03-23T16:02:15.000Z')],
          ['2018-03-23', new Date('2018-03-23T00:00:00.000Z')],
          [null, null],
          [undefined, null],
        ],
        isNull: [
          ['2018-03-23T16:02:15.000Z', false],
          [null, true],
          [undefined, true],
        ],
        toString: [
          ['2018-03-23T16:02:15.000Z', '2018-03-23T16:02:15.000Z'],
          [null, ''],
          [undefined, ''],
        ],
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
