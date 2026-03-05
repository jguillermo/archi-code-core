import { describe, it } from '@jest/globals';
import { AddValidate, validateType } from '../validator/decorator/type-validator';
import {
  allTypesRequired,
  canByType,
  errorTypeValidValueSpec,
  nullables,
  PrimitivesKeys,
  skipByType,
  typeValidationSpec,
  typeValidValueSpec,
} from '@code-core/test';
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
      typeValidValueSpec(validateType, EnumTypeRequired, [
        StatusString.UP,
        StatusString.DOWN,
        'up',
        'down',
      ]);
    });
    describe('Invalid Values', () => {
      const errorData = {
        isEnum: 'EnumTypeRequired must be one of the following values: up, down',
        isNotEmpty: 'EnumTypeRequired should not be empty',
        typePrimitive: 'Validation Error: Expected one of [up, down], but received {{$1}}.',
      };
      errorTypeValidValueSpec<keyof typeof errorData>(
        validateType,
        TypePrimitiveException,
        EnumTypeRequired,
        errorData,
        [
          {
            constraints: ['typePrimitive'],
            values: allTypesRequired(),
            valuesTxt: { typePrimitive: { '{{$1}}': universalToString } },
          },
          {
            constraints: ['isEnum', 'isNotEmpty'],
            values: nullables(),
          },
        ],
      );
    });
    describe('Compare values', () => {
      typeValidationSpec(validateType, EnumTypeRequired, {
        value: [
          [StatusString.UP, 'up'],
          [StatusString.DOWN, 'down'],
          ['up', 'up'],
          ['down', 'down'],
        ],
        isNull: [
          [StatusString.UP, false],
          ['up', false],
        ],
        toString: [[StatusString.UP, 'up']],
      });
    });
  });
  describe('EnumTypeOptional', () => {
    describe('Valid Values', () => {
      typeValidValueSpec(validateType, EnumTypeOptional, [
        StatusString.UP,
        StatusString.DOWN,
        'up',
        'down',
        ...canByType(PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED),
      ]);
    });
    describe('Invalid Values', () => {
      const errorData = {
        isEnum: 'EnumTypeOptional must be one of the following values: up, down',
        typePrimitive: 'Validation Error: Expected one of [up, down], but received {{$1}}.',
      };
      errorTypeValidValueSpec<keyof typeof errorData>(
        validateType,
        TypePrimitiveException,
        EnumTypeOptional,
        errorData,
        [
          {
            constraints: ['typePrimitive'],
            values: skipByType(PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED),
            valuesTxt: { typePrimitive: { '{{$1}}': universalToString } },
          },
        ],
      );
    });
    describe('compare values', () => {
      typeValidationSpec(validateType, EnumTypeOptional, {
        value: [
          [StatusString.UP, 'up'],
          [StatusString.DOWN, 'down'],
          ['up', 'up'],
          ['down', 'down'],
          [null, null],
          [undefined, null],
        ],
        isNull: [
          [StatusString.UP, false],
          ['up', false],
          [null, true],
          [undefined, true],
        ],
        toString: [
          [StatusString.UP, 'up'],
          [null, ''],
          [undefined, ''],
        ],
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
