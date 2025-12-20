import { describe, it } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { universalToString } from '@code-core/common';
import { BooleanTypeOptional, BooleanTypeRequired } from './index';
import {
  canByType,
  errorTypeValidValueSpec,
  excludeItems,
  nullables,
  PrimitivesKeys,
  skipByType,
  skipByTypeRequired,
  typeValidationSpec,
  typeValidValueSpec,
} from '@code-core/test';
import { validateType } from '../validator/decorator/type-validator';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

describe('AbstractBooleanType', () => {
  describe('BooleanTypeRequired', () => {
    describe('Valid Values', () => {
      typeValidValueSpec(validateType, BooleanTypeRequired, canByType(PrimitivesKeys.BOOLEAN), 'boolean');
    });
    describe('Invalid Values', () => {
      const errorData = {
        canBeBoolean: 'BooleanTypeRequired must be a boolean',
        isNotEmpty: 'BooleanTypeRequired should not be empty',
        typePrimitive: 'Validation Error: Expected a valid Boolean, but received {{$1}}.',
      };
      errorTypeValidValueSpec<keyof typeof errorData>(validateType, TypePrimitiveException, BooleanTypeRequired, errorData, [
        {
          constraints: ['typePrimitive'],
          values: excludeItems(skipByTypeRequired(PrimitivesKeys.BOOLEAN), [1, 0]),
          valuesTxt: { typePrimitive: { '{{$1}}': universalToString } },
        },
        {
          constraints: ['canBeBoolean', 'isNotEmpty'],
          values: nullables(),
        },
      ]);
    });
    describe('Compare values', () => {
      typeValidationSpec(validateType, BooleanTypeRequired, {
        value: [
          [true, true],
          ['true', true],
          ['false', false],
          ['1', true],
          [1, true],
          ['0', false],
          [0, false],
        ],
        isNull: [[true, false]],
        toString: [[true, 'true']],
      });
    });
  });
  describe('BooleanTypeOptional', () => {
    describe('Valid Values', () => {
      typeValidValueSpec(validateType, BooleanTypeOptional, canByType(PrimitivesKeys.BOOLEAN, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED), 'boolean');
    });
    describe('Invalid Values', () => {
      const errorData = {
        canBeBoolean: 'BooleanTypeOptional must be a boolean',
        typePrimitive: 'Validation Error: Expected a valid Boolean, but received {{$1}}.',
      };
      errorTypeValidValueSpec<keyof typeof errorData>(validateType, TypePrimitiveException, BooleanTypeOptional, errorData, [
        {
          constraints: ['typePrimitive'],
          values: excludeItems(skipByType(PrimitivesKeys.BOOLEAN, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED), [0, 1]),
          valuesTxt: { typePrimitive: { '{{$1}}': universalToString } },
        },
      ]);
    });
    describe('compare values', () => {
      typeValidationSpec(validateType, BooleanTypeOptional, {
        value: [
          [true, true],
          [null, null],
          [undefined, null],
          [true, true],
          ['true', true],
          ['false', false],
          ['1', true],
          [1, true],
          ['0', false],
          [0, false],
        ],
        isNull: [
          [null, true],
          [undefined, true],
          [true, false],
        ],
        toString: [
          [null, ''],
          [undefined, ''],
          [true, 'true'],
        ],
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
