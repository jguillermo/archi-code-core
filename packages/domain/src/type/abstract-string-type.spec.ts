import { describe, it } from '@jest/globals';
import { canByType, errorTypeValidValueSpec, excludeItems, PrimitivesKeys, skipByType, skipByTypeRequired, typeValidationSpec, typeValidValueSpec } from '@code-core/test';
import { AddValidate, validateType } from '../validator/decorator/type-validator';
import { expectTypeOf } from 'expect-type';
import { universalToString } from '@code-core/common';
import { AbstractStringType, StringTypeOptional, StringTypeRequired } from './index';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

describe('AbstractStringType', () => {
  describe('StringTypeRequired', () => {
    describe('Valid Values', () => {
      typeValidValueSpec(validateType, StringTypeRequired, excludeItems(canByType(PrimitivesKeys.STRING), ['']), 'string');
    });
    describe('Invalid Values', () => {
      const errorData = {
        canBeString: 'StringTypeRequired must be a string',
        isNotEmpty: 'StringTypeRequired should not be empty',
        typePrimitive: 'Validation Error: Expected a valid String, but received {{$1}}.',
      };
      errorTypeValidValueSpec<keyof typeof errorData>(validateType, TypePrimitiveException, StringTypeRequired, errorData, [
        {
          constraints: ['typePrimitive'],
          values: skipByTypeRequired(PrimitivesKeys.STRING, PrimitivesKeys.UUID, PrimitivesKeys.NUMBER, PrimitivesKeys.BOOLEAN),
          valuesTxt: { typePrimitive: { '{{$1}}': universalToString } },
        },
        {
          constraints: ['canBeString', 'isNotEmpty'],
          values: [...canByType(PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED)],
        },
        {
          constraints: ['isNotEmpty'],
          values: [''],
        },
      ]);
    });
    describe('Compare values', () => {
      typeValidationSpec(validateType, StringTypeRequired, {
        value: [['áéíóú', 'áéíóú']],
        isNull: [['áéíóú', false]],
        toString: [['áéíóú', 'áéíóú']],
      });
    });
  });
  describe('StringTypeOptional', () => {
    describe('Valid Values', () => {
      typeValidValueSpec(validateType, StringTypeOptional, canByType(PrimitivesKeys.STRING, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED), 'string');
    });
    describe('Invalid Values', () => {
      const errorData = {
        canBeString: 'StringTypeOptional must be a string',
        typePrimitive: 'Validation Error: Expected a valid String, but received {{$1}}.',
      };
      errorTypeValidValueSpec<keyof typeof errorData>(validateType, TypePrimitiveException, StringTypeOptional, errorData, [
        {
          constraints: ['typePrimitive'],
          values: skipByType(PrimitivesKeys.STRING, PrimitivesKeys.NUMBER, PrimitivesKeys.BOOLEAN, PrimitivesKeys.UUID, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED),
          valuesTxt: { typePrimitive: { '{{$1}}': universalToString } },
        },
      ]);
    });
    describe('Compare values', () => {
      typeValidationSpec(validateType, StringTypeOptional, {
        value: [
          ['áéíóú', 'áéíóú'],
          [null, null],
          [undefined, null],
        ],
        isNull: [
          ['áéíóú', false],
          [null, true],
          [undefined, true],
        ],
        toString: [['áéíóú', 'áéíóú']],
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
      typeValidValueSpec(validateType, ValueObjectString, ['abc', 'áéíóú'], 'string');
    });
    describe('Invalid Values', () => {
      const errorData = {
        canBeString: 'ValueObjectString must be a string',
        maxLength: 'ValueObjectString must be shorter than or equal to 5 characters',
        minLength: 'ValueObjectString must be longer than or equal to 2 characters',
        typePrimitive: 'Validation Error: Expected a valid String, but received {{$1}}.',
      };
      errorTypeValidValueSpec<keyof typeof errorData>(validateType, TypePrimitiveException, ValueObjectString, errorData, [
        {
          constraints: ['typePrimitive'],
          values: skipByType(PrimitivesKeys.STRING, PrimitivesKeys.NUMBER, PrimitivesKeys.BOOLEAN, PrimitivesKeys.UUID, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED),
          valuesTxt: { typePrimitive: { '{{$1}}': universalToString } },
        },
        {
          constraints: ['maxLength'],
          values: ['12345678'],
        },
        {
          constraints: ['minLength'],
          values: ['1'],
        },
      ]);
    });

    describe('Compare values', () => {
      typeValidationSpec(validateType, ValueObjectString, {
        value: [
          ['abc', 'abc'],
          ['áéíóú', 'áéíóú'],
        ],
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
