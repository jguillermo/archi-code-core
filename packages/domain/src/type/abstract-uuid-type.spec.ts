import { describe, it } from '@jest/globals';

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
import { expectTypeOf } from 'expect-type';
import { universalToString } from '@code-core/common';
import { AbstractUuidType, IdType, UuidTypeOptional, UuidTypeRequired } from './index';
import { validateType } from '../validator/decorator/type-validator';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

const UUID_4_VALUE = 'df9ef000-21fc-4e06-b8f7-103c3a133d10';

describe('AbstractUuidType', () => {
  describe('IdType', () => {
    describe('Valid Values', () => {
      typeValidValueSpec(validateType, IdType, canByType(PrimitivesKeys.UUID), 'string');
    });
    describe('Invalid Values', () => {
      const errorData = {
        isUuid: 'IdType must be a UUID',
        isNotEmpty: 'IdType should not be empty',
        typePrimitive: 'Validation Error: Expected a valid UUID, but received {{$1}}.',
      };
      errorTypeValidValueSpec<keyof typeof errorData>(
        validateType,
        TypePrimitiveException,
        IdType,
        errorData,
        [
          {
            constraints: ['typePrimitive'],
            values: skipByTypeRequired(PrimitivesKeys.UUID),
            valuesTxt: { typePrimitive: { '{{$1}}': universalToString } },
          },
          {
            constraints: ['isUuid', 'isNotEmpty'],
            values: nullables(),
          },
        ],
      );
    });
    describe('Compare values', () => {
      typeValidationSpec(validateType, IdType, {
        value: [[UUID_4_VALUE, UUID_4_VALUE]],
        isNull: [[UUID_4_VALUE, false]],
        toString: [[UUID_4_VALUE, 'df9ef000-21fc-4e06-b8f7-103c3a133d10']],
      });
    });
  });
  describe('UuidTypeRequired', () => {
    describe('Valid Values', () => {
      typeValidValueSpec(validateType, UuidTypeRequired, canByType(PrimitivesKeys.UUID), 'string');
      typeValidValueSpec(validateType, UuidTypeRequired, [
        AbstractUuidType.random(),
        AbstractUuidType.fromValue('123'),
        UuidTypeRequired.random(),
        UuidTypeRequired.fromValue('123'),
      ]);
    });
    describe('Invalid Values', () => {
      const errorData = {
        isUuid: 'UuidTypeRequired must be a UUID',
        isNotEmpty: 'UuidTypeRequired should not be empty',
        typePrimitive: 'Validation Error: Expected a valid UUID, but received {{$1}}.',
      };
      errorTypeValidValueSpec<keyof typeof errorData>(
        validateType,
        TypePrimitiveException,
        UuidTypeRequired,
        errorData,
        [
          {
            constraints: ['typePrimitive'],
            values: excludeItems(
              skipByType(PrimitivesKeys.UUID, PrimitivesKeys.UNDEFINED, PrimitivesKeys.NULL),
              [''],
            ),
            valuesTxt: { typePrimitive: { '{{$1}}': universalToString } },
          },
          {
            constraints: ['isUuid', 'isNotEmpty'],
            values: nullables(),
          },
        ],
      );
    });
    describe('Compare values', () => {
      typeValidationSpec(validateType, UuidTypeRequired, {
        value: [
          [UUID_4_VALUE, UUID_4_VALUE],
          [AbstractUuidType.fromValue('123'), '37813542-0dca-5a8a-b2a2-b69c2d45583f'],
          [UuidTypeRequired.fromValue('123'), '37813542-0dca-5a8a-b2a2-b69c2d45583f'],
        ],
        isNull: [[UUID_4_VALUE, false]],
        toString: [[UUID_4_VALUE, 'df9ef000-21fc-4e06-b8f7-103c3a133d10']],
      });
    });
  });
  describe('UuidTypeOptional', () => {
    describe('Valid Values', () => {
      typeValidValueSpec(
        validateType,
        UuidTypeOptional,
        canByType(PrimitivesKeys.UUID, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED),
        'string',
      );
      typeValidValueSpec(validateType, UuidTypeOptional, [
        AbstractUuidType.random(),
        AbstractUuidType.fromValue('123'),
        UuidTypeOptional.random(),
        UuidTypeOptional.fromValue('123'),
      ]);
    });
    describe('Invalid Values', () => {
      const errorData = {
        isUuid: 'UuidTypeOptional must be a UUID',
        typePrimitive: 'Validation Error: Expected a valid UUID, but received {{$1}}.',
      };
      errorTypeValidValueSpec<keyof typeof errorData>(
        validateType,
        TypePrimitiveException,
        UuidTypeOptional,
        errorData,
        [
          {
            constraints: ['typePrimitive'],
            values: excludeItems(
              skipByType(PrimitivesKeys.UUID, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED),
              [0, 1],
            ),
            valuesTxt: { typePrimitive: { '{{$1}}': universalToString } },
          },
        ],
      );
    });
    describe('compare values', () => {
      typeValidationSpec(validateType, UuidTypeOptional, {
        value: [
          [UUID_4_VALUE, 'df9ef000-21fc-4e06-b8f7-103c3a133d10'],
          [AbstractUuidType.fromValue('123'), '37813542-0dca-5a8a-b2a2-b69c2d45583f'],
          [UuidTypeRequired.fromValue('123'), '37813542-0dca-5a8a-b2a2-b69c2d45583f'],
          [null, null],
          [undefined, null],
        ],
        isNull: [
          [null, true],
          [undefined, true],
          [UUID_4_VALUE, false],
        ],
        toString: [
          [null, ''],
          [undefined, ''],
          [UUID_4_VALUE, 'df9ef000-21fc-4e06-b8f7-103c3a133d10'],
        ],
      });
    });
  });

  describe('Expect Type', () => {
    type ExpectType = string;
    it('string and null', () => {
      const instance1 = new UuidTypeOptional(UUID_4_VALUE);
      const instance2 = new UuidTypeOptional();
      const instance3 = new UuidTypeOptional(null);

      expectTypeOf<UuidTypeOptional['value']>().toMatchTypeOf<ExpectType | null>();
      expectTypeOf<ExpectType | null>().toMatchTypeOf<UuidTypeOptional['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance2.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance3.value).toMatchTypeOf<ExpectType | null>();
    });

    it('string', () => {
      const instance1 = new UuidTypeRequired(UUID_4_VALUE);

      expectTypeOf<UuidTypeRequired['value']>().toMatchTypeOf<ExpectType>();
      expectTypeOf<ExpectType>().toMatchTypeOf<UuidTypeRequired['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType>();
    });

    it('id', () => {
      const instance1 = new IdType(UUID_4_VALUE);

      expectTypeOf<IdType['value']>().toMatchTypeOf<ExpectType>();
      expectTypeOf<ExpectType>().toMatchTypeOf<IdType['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType>();
    });
  });
});
