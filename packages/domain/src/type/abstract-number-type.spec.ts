import { describe, expect, it } from '@jest/globals';
import { canByType, nullables, PrimitivesKeys, skipByType, skipByTypeRequired } from '@code-core/test';
import { AddValidate, validateType } from '../validator/decorator/type-validator';
import { expectTypeOf } from 'expect-type';
import { universalToString } from '@code-core/common';
import { AbstractNumberType, NumberTypeOptional, NumberTypeRequired } from './index';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';
import { getLevel, Level } from '../level/level.decorator';

describe('AbstractNumberType', () => {
  describe('NumberTypeRequired', () => {
    describe('Valid Values', () => {
      it.each(canByType(PrimitivesKeys.NUMBER).map((v) => [v]))('validates new NumberTypeRequired(%p)', (value) => {
        expect(validateType(new NumberTypeRequired(value))).toEqual([]);
      });

      it.each(canByType(PrimitivesKeys.NUMBER).map((v) => [v]))(
        'typeof new NumberTypeRequired(%p).value === "number"',
        (value) => {
          expect(typeof new NumberTypeRequired(value).value).toEqual('number');
        },
      );
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeNumber: 'NumberTypeRequired must be a number',
        isNotEmpty: 'NumberTypeRequired should not be empty',
        typePrimitive: 'Validation Error: Expected a valid Number, but received {{$1}}.',
      };

      it.each(skipByTypeRequired(PrimitivesKeys.NUMBER).map((v) => [v]))(
        'typePrimitive error for NumberTypeRequired(%p)',
        (value) => {
          let errors: any[] = [];
          try {
            const type = new NumberTypeRequired(value);
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

      it.each(nullables().map((v) => [v]))('canBeNumber + isNotEmpty error for NumberTypeRequired(%p)', (value) => {
        let errors: any[] = [];
        try {
          const type = new NumberTypeRequired(value);
          errors = validateType(type);
        } catch (e) {
          if (!(e instanceof TypePrimitiveException)) throw e;
          errors = [{ property: 'value', constraints: { typePrimitive: (e as any)?.message ?? '' } }];
        }
        expect(errors[0]).toBeDefined();
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].constraints).toEqual({
          canBeNumber: errorData.canBeNumber,
          isNotEmpty: errorData.isNotEmpty,
        });
      });
    });

    describe('Compare values', () => {
      it('NumberTypeRequired(1).value toEqual 1', () => {
        const type = new NumberTypeRequired(1);
        expect(type.value).toEqual(1);
        expect(validateType(type)).toEqual([]);
      });

      it('NumberTypeRequired(1).isNull toEqual false', () => {
        const type = new NumberTypeRequired(1);
        expect(type.isNull).toEqual(false);
        expect(validateType(type)).toEqual([]);
      });

      it('NumberTypeRequired(1).toString toEqual "1"', () => {
        const type = new NumberTypeRequired(1);
        expect(type.toString).toEqual('1');
        expect(validateType(type)).toEqual([]);
      });
    });
  });

  describe('NumberTypeOptional', () => {
    describe('Valid Values', () => {
      const validValues = canByType(PrimitivesKeys.NUMBER, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED);

      it.each(validValues.map((v) => [v]))('validates new NumberTypeOptional(%p)', (value) => {
        expect(validateType(new NumberTypeOptional(value))).toEqual([]);
      });

      it.each(
        validValues
          .filter((v) => v != null && v !== undefined)
          .map((v) => [v]),
      )('typeof new NumberTypeOptional(%p).value === "number"', (value) => {
        expect(typeof new NumberTypeOptional(value).value).toEqual('number');
      });

      it.each(
        validValues
          .filter((v) => v == null)
          .map((v) => [v]),
      )('new NumberTypeOptional(%p).isNull is true', (value) => {
        expect(new NumberTypeOptional(value).isNull).toEqual(true);
      });
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeNumber: 'NumberTypeOptional must be a number',
        typePrimitive: 'Validation Error: Expected a valid Number, but received {{$1}}.',
      };

      it.each(
        skipByType(PrimitivesKeys.NUMBER, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED).map((v) => [v]),
      )('typePrimitive error for NumberTypeOptional(%p)', (value) => {
        let errors: any[] = [];
        try {
          const type = new NumberTypeOptional(value);
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
        [1, 1],
        [null, null],
        [undefined, null],
        ['1', 1],
      ])('NumberTypeOptional(%p).value toEqual %p', (input, expected) => {
        const type = new NumberTypeOptional(input as any);
        expect(type.value).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it.each([
        [null, true],
        [undefined, true],
        [0, false],
      ])('NumberTypeOptional(%p).isNull toEqual %p', (input, expected) => {
        const type = new NumberTypeOptional(input);
        expect(type.isNull).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });

      it.each([
        [null, ''],
        [undefined, ''],
        [1, '1'],
      ])('NumberTypeOptional(%p).toString toEqual %p', (input, expected) => {
        const type = new NumberTypeOptional(input);
        expect(type.toString).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });
    });
  });

  describe('AddValidate', () => {
    @AddValidate([
      { validator: 'IsInt' },
      { validator: 'Min', value: 10 },
      { validator: 'Max', value: 20 },
    ])
    class ValueObjectNumber extends AbstractNumberType {}

    describe('Valid Values', () => {
      it.each([[10], [15], [20]])('validates new ValueObjectNumber(%p)', (value) => {
        expect(validateType(new ValueObjectNumber(value))).toEqual([]);
      });

      it.each([[10], [15], [20]])('typeof new ValueObjectNumber(%p).value === "number"', (value) => {
        expect(typeof new ValueObjectNumber(value).value).toEqual('number');
      });
    });

    describe('Invalid Values', () => {
      const errorData = {
        canBeNumber: 'ValueObjectNumber must be a number',
        isInt: 'ValueObjectNumber must be an integer number',
        max: 'ValueObjectNumber must not be greater than 20',
        min: 'ValueObjectNumber must not be less than 10',
        typePrimitive: 'Validation Error: Expected a valid Number, but received {{$1}}.',
      };

      it.each(
        skipByType(PrimitivesKeys.NUMBER, PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED).map((v) => [v]),
      )('typePrimitive error for ValueObjectNumber(%p)', (value) => {
        let errors: any[] = [];
        try {
          const type = new ValueObjectNumber(value);
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

      it('isInt error for ValueObjectNumber(10.1)', () => {
        const type = new ValueObjectNumber(10.1);
        const errors = validateType(type);
        expect(errors[0]).toBeDefined();
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].constraints).toEqual({ isInt: errorData.isInt });
      });

      it.each([[21], [22]])('max error for ValueObjectNumber(%p)', (value) => {
        const type = new ValueObjectNumber(value);
        const errors = validateType(type);
        expect(errors[0]).toBeDefined();
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].constraints).toEqual({ max: errorData.max });
      });

      it.each([[1], [2]])('min error for ValueObjectNumber(%p)', (value) => {
        const type = new ValueObjectNumber(value);
        const errors = validateType(type);
        expect(errors[0]).toBeDefined();
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].constraints).toEqual({ min: errorData.min });
      });

      it.each([['1.1'], [2.1]])('min + isInt error for ValueObjectNumber(%p)', (value) => {
        const type = new ValueObjectNumber(value as any);
        const errors = validateType(type);
        expect(errors[0]).toBeDefined();
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].constraints).toEqual({ min: errorData.min, isInt: errorData.isInt });
      });

      it.each([['21.1'], [22.1]])('max + isInt error for ValueObjectNumber(%p)', (value) => {
        const type = new ValueObjectNumber(value as any);
        const errors = validateType(type);
        expect(errors[0]).toBeDefined();
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].constraints).toEqual({ max: errorData.max, isInt: errorData.isInt });
      });
    });

    describe('Compare values', () => {
      it.each([
        [10, 10],
        [15, 15],
        [20, 20],
      ])('ValueObjectNumber(%p).value toEqual %p', (input, expected) => {
        const type = new ValueObjectNumber(input);
        expect(type.value).toEqual(expected);
        expect(validateType(type)).toEqual([]);
      });
    });
  });

  describe('Expect Type', () => {
    type ExpectType = number;
    it('number and null', () => {
      const instance1 = new NumberTypeOptional(42);
      const instance2 = new NumberTypeOptional();
      const instance3 = new NumberTypeOptional(null);

      expectTypeOf<NumberTypeOptional['value']>().toMatchTypeOf<ExpectType | null>();
      expectTypeOf<ExpectType | null>().toMatchTypeOf<NumberTypeOptional['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance2.value).toMatchTypeOf<ExpectType | null>();
      expectTypeOf(instance3.value).toMatchTypeOf<ExpectType | null>();
    });

    it('number', () => {
      const instance1 = new NumberTypeRequired(42);

      expectTypeOf<NumberTypeRequired['value']>().toMatchTypeOf<ExpectType>();
      expectTypeOf<ExpectType>().toMatchTypeOf<NumberTypeRequired['value']>();
      expectTypeOf(instance1.value).toMatchTypeOf<ExpectType>();
    });
  });

  describe('Type Validation', () => {
    it('enum validation', () => {
      @AddValidate([
        { validator: 'IsNotEmpty' },
        { validator: 'Min', value: 100 },
        { validator: 'Max', value: 200 },
        { validator: 'IsPositive' },
      ])
      class TestNumberTypeRequired extends AbstractNumberType {}

      const instance = new TestNumberTypeRequired(-4200);
      expect(instance.isValid()).toEqual(false);
      expect(instance.validatorMessageStr()).toEqual(
        'must not be less than 100, must be a positive number',
      );
      expect(instance.validatorMessageStr('|')).toEqual(
        'must not be less than 100| must be a positive number',
      );
    });
  });

  describe('level validator', () => {
    it('get correct level', () => {
      @Level(2)
      @AddValidate([
        { validator: 'IsNotEmpty' },
        { validator: 'Min', value: 100 },
        { validator: 'Max', value: 200 },
        { validator: 'IsPositive' },
      ])
      class TestNumberTypeRequired extends AbstractNumberType {
        static empty(): TestNumberTypeRequired {
          return new TestNumberTypeRequired(0);
        }
      }

      const level = getLevel(TestNumberTypeRequired);
      expect(level).toBe(2);
    });
  });
});
