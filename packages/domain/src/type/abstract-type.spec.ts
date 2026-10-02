import { describe, expect, it, jest } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { Validations } from '@archi-code/validation';
import type { Validatable, ValidationResult } from '@archi-code/validation';
import { AbstractType, Required } from './abstract-type';
import { RequiredValueException } from '../exceptions/domain/required-value.exception';

class NullableString extends AbstractType<string> {
  protected filter(value: string | null): string | null {
    return value;
  }
}

class PlainNumber extends AbstractType<number> {
  static zero(): PlainNumber {
    return new PlainNumber(0);
  }

  protected filter(value: number | null): number | null {
    return value;
  }
}

class RequiredNumber extends Required(PlainNumber) {}

class TrimmedString extends AbstractType<string> {
  protected filter(value: string | null): string | null {
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
}

function typeWithSpiedFilter() {
  const filterSpy = jest.fn((value: unknown) => value);
  class SpiedType extends AbstractType<string> {
    protected filter(value: unknown): unknown {
      return filterSpy(value);
    }
  }
  return { SpiedType, filterSpy };
}

const valid = <T>(value: T) => ({ ok: true, value, errors: [] });

function requiredError(typeName: string, received: string): string {
  return `Validation Error: ${typeName} is required, but received ${received}.`;
}

describe('AbstractType', () => {
  describe('typing', () => {
    it('an optional type takes T, null or nothing and its value is T | null', () => {
      expectTypeOf<ConstructorParameters<typeof PlainNumber>>().toEqualTypeOf<
        [value?: number | null]
      >();
      expectTypeOf<PlainNumber['value']>().toEqualTypeOf<number | null>();
      expectTypeOf<PlainNumber['validate']>().toEqualTypeOf<
        () => ValidationResult<number | null>
      >();
      expectTypeOf<PlainNumber>().toMatchTypeOf<Validatable<number | null>>();
    });

    it('a required type takes only T and its value is T', () => {
      expectTypeOf<ConstructorParameters<typeof RequiredNumber>>().toEqualTypeOf<[value: number]>();
      expectTypeOf<RequiredNumber['value']>().toEqualTypeOf<number>();
      expectTypeOf<RequiredNumber['validate']>().toEqualTypeOf<() => ValidationResult<number>>();
      expectTypeOf<RequiredNumber>().toMatchTypeOf<Validatable<number>>();
    });

    it('a required type does not accept a missing value or a value of another type', () => {
      // @ts-expect-error a required type needs a value
      expect(() => new RequiredNumber()).toThrow(RequiredValueException);
      // @ts-expect-error a required type does not accept null
      expect(() => new RequiredNumber(null)).toThrow(RequiredValueException);
      // @ts-expect-error a required type does not accept undefined
      expect(() => new RequiredNumber(undefined)).toThrow(RequiredValueException);
      // @ts-expect-error a required number does not accept a string
      expect(() => new RequiredNumber('1')).not.toThrow();
    });

    it('the value of an optional type cannot be used as a plain T', () => {
      // @ts-expect-error an optional value may be null
      const text: string = new NullableString('abc').value;
      expect(text).toBe('abc');
    });

    it('isNull, isNotNull and toString are typed', () => {
      expectTypeOf<PlainNumber['isNull']>().toEqualTypeOf<boolean>();
      expectTypeOf<PlainNumber['isNotNull']>().toEqualTypeOf<boolean>();
      expectTypeOf<PlainNumber['toString']>().toEqualTypeOf<string>();
    });
  });

  describe('construction', () => {
    it('passes the given value to filter exactly once', () => {
      const { SpiedType, filterSpy } = typeWithSpiedFilter();
      new SpiedType('abc');
      expect(filterSpy).toHaveBeenCalledTimes(1);
      expect(filterSpy).toHaveBeenCalledWith('abc');
    });

    it.each([
      ['no value', []],
      ['null', [null]],
      ['undefined', [undefined]],
    ])('passes %s to filter as null', (_, args) => {
      const { SpiedType, filterSpy } = typeWithSpiedFilter();
      const instance = new SpiedType(...(args as [string | null]));
      expect(filterSpy).toHaveBeenCalledWith(null);
      expect(instance.value).toBeNull();
    });

    it.each([
      ['0', 0],
      ['empty string', ''],
      ['false', false],
      ['NaN', NaN],
    ])('keeps the falsy value %s', (_, input) => {
      const { SpiedType } = typeWithSpiedFilter();
      expect(new SpiedType(input as unknown as string).value).toBe(input);
    });

    it('stores what filter returns, not the raw input', () => {
      expect(new TrimmedString('  abc  ').value).toBe('abc');
      expect(new TrimmedString('   ').value).toBeNull();
    });

    it('propagates an error thrown by filter', () => {
      class Rejecting extends AbstractType<string> {
        protected filter(): string {
          throw new Error('invalid input');
        }
      }
      expect(() => new Rejecting('abc')).toThrow('invalid input');
    });
  });

  describe('isNull / isNotNull', () => {
    it.each([
      ['null', new NullableString(null), true],
      ['a value', new NullableString('abc'), false],
      ['a falsy value', new PlainNumber(0), false],
      ['a value filtered to null', new TrimmedString('   '), true],
    ])('%s → isNull %s', (_, instance, expected) => {
      expect(instance.isNull).toBe(expected);
      expect(instance.isNotNull).toBe(!expected);
    });
  });

  describe('toString', () => {
    it.each([
      ['null', new NullableString(null), ''],
      ['a string', new NullableString('abc'), 'abc'],
      ['a number', new PlainNumber(-1.5), '-1.5'],
      ['the filtered value', new TrimmedString('  abc  '), 'abc'],
    ])('%s → %p', (_, instance, expected) => {
      expect(instance.toString).toBe(expected);
    });
  });

  describe('validate', () => {
    @Validations([{ validator: 'isEmail' }])
    class Email extends NullableString {}

    it('is ok with the value when it satisfies the validations', () => {
      expect(new Email('user@example.com').validate()).toEqual(valid('user@example.com'));
    });

    it('is not ok with the value and the errors when it does not', () => {
      expect(new Email('x').validate()).toEqual({
        ok: false,
        value: 'x',
        errors: [{ validator: 'isEmail', message: 'Value does not satisfy isEmail' }],
      });
    });

    it('is ok when the type declares no validations', () => {
      expect(new NullableString('anything').validate()).toEqual(valid('anything'));
    });

    it('validates the filtered value, not the raw input', () => {
      const isHello = jest.fn((value: unknown) => value === 'hello');

      @Validations([{ custom: 'isHello', fn: isHello }])
      class Greeting extends TrimmedString {}

      expect(new Greeting('  hello  ').validate()).toEqual(valid('hello'));
      expect(isHello).toHaveBeenCalledWith('hello');
    });

    it('runs the validations of the concrete class, inherited ones included', () => {
      @Validations([{ validator: 'isAlpha' }])
      class Letters extends Email {}

      expect(new Letters('x').validate().errors).toEqual([
        { validator: 'isEmail', message: 'Value does not satisfy isEmail' },
      ]);
      expect(new Letters('user1@example.com').validate().errors).toEqual([
        { validator: 'isAlpha', message: 'Value does not satisfy isAlpha' },
      ]);
    });

    it.each([
      ['with a value', () => new Email('x').validate()],
      ['of an optional null', () => new NullableString(null).validate()],
    ])('the result %s is frozen', (_, run) => {
      const result = run();
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.errors)).toBe(true);
    });

    describe('null value', () => {
      it('an optional type is ok without running its validations', () => {
        const rule = jest.fn(() => false);

        @Validations([{ custom: 'rule', fn: rule }])
        class Optional extends NullableString {}

        expect(new Optional(null).validate()).toEqual(valid(null));
        expect(rule).not.toHaveBeenCalled();
      });
    });

    describe('reuse of the last result', () => {
      function counterWithSpiedRule() {
        const isNonNegative = jest.fn((value: unknown) => typeof value === 'number' && value >= 0);

        @Validations([{ custom: 'nonNegative', fn: isNonNegative }])
        class Counter extends AbstractType<number | number[]> {
          protected filter(value: number | number[] | null): number | number[] | null {
            return value;
          }

          change(value: number | number[] | null): void {
            this._value = value;
          }
        }

        return { Counter, isNonNegative };
      }

      it('does not run the validations on construction', () => {
        const { Counter, isNonNegative } = counterWithSpiedRule();
        new Counter(1);
        expect(isNonNegative).not.toHaveBeenCalled();
      });

      it('returns the same result while the value does not change', () => {
        const { Counter, isNonNegative } = counterWithSpiedRule();
        const counter = new Counter(1);
        const result = counter.validate();
        expect(counter.validate()).toBe(result);
        counter.change(1);
        expect(counter.validate()).toBe(result);
        expect(isNonNegative).toHaveBeenCalledTimes(1);
      });

      it('validates again when the value changes, even back to a previous one', () => {
        const { Counter, isNonNegative } = counterWithSpiedRule();
        const counter = new Counter(1);
        const withOne = counter.validate();
        counter.change(-1);
        expect(counter.validate()).toEqual({
          ok: false,
          value: -1,
          errors: [{ custom: 'nonNegative', message: 'Value does not satisfy nonNegative' }],
        });
        counter.change(1);
        const withOneAgain = counter.validate();
        expect(withOneAgain).not.toBe(withOne);
        expect(withOneAgain).toEqual(withOne);
        expect(isNonNegative).toHaveBeenCalledTimes(3);
      });

      it('validates again when the value changes to null and back', () => {
        const { Counter, isNonNegative } = counterWithSpiedRule();
        const counter = new Counter(-1);
        expect(counter.validate().ok).toBe(false);
        counter.change(null);
        expect(counter.validate()).toEqual(valid(null));
        counter.change(-1);
        expect(counter.validate().ok).toBe(false);
        expect(isNonNegative).toHaveBeenCalledTimes(2);
      });

      it('compares by identity: NaN is the same value, -0 and 0 are not, nor two equal arrays', () => {
        const { Counter, isNonNegative } = counterWithSpiedRule();
        const counter = new Counter(NaN);
        const withNaN = counter.validate();
        counter.change(NaN);
        expect(counter.validate()).toBe(withNaN);
        counter.change(0);
        const withZero = counter.validate();
        counter.change(-0);
        expect(counter.validate()).not.toBe(withZero);
        counter.change([1]);
        const withArray = counter.validate();
        counter.change([1]);
        expect(counter.validate()).not.toBe(withArray);
        expect(isNonNegative).toHaveBeenCalledTimes(5);
      });

      it('keeps one result per instance', () => {
        const { Counter, isNonNegative } = counterWithSpiedRule();
        expect(new Counter(1).validate()).not.toBe(new Counter(1).validate());
        expect(isNonNegative).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Required', () => {
    it('throws RequiredValueException with the type name on construction, before any validation runs', () => {
      const rule = jest.fn(() => false);

      @Validations([{ custom: 'rule', fn: rule }])
      class Mandatory extends RequiredNumber {}

      expect(() => new Mandatory(null as unknown as number)).toThrow(
        requiredError('Mandatory', 'null'),
      );
      expect(rule).not.toHaveBeenCalled();
    });

    it('a value is valid, falsy ones included', () => {
      expect(new RequiredNumber(1).validate()).toEqual(valid(1));
      expect(new RequiredNumber(0).validate()).toEqual(valid(0));
    });

    it('a value runs the validations', () => {
      @Validations([{ custom: 'positive', fn: (value) => typeof value === 'number' && value > 0 }])
      class Positive extends RequiredNumber {}

      expect(new Positive(1).validate()).toEqual(valid(1));
      expect(new Positive(-1).validate().errors).toEqual([
        { custom: 'positive', message: 'Value does not satisfy positive' },
      ]);
    });

    it('throws when filter turns the value into null, reporting the raw input', () => {
      class RequiredTrimmed extends Required(TrimmedString) {}

      expect(() => new RequiredTrimmed('   ')).toThrow(requiredError('RequiredTrimmed', '"   "'));
    });

    it('a subclass is required too', () => {
      class Child extends RequiredNumber {}

      expectTypeOf<ConstructorParameters<typeof Child>>().toEqualTypeOf<[value: number]>();
      expectTypeOf<Child['value']>().toEqualTypeOf<number>();
      expect(() => new Child(null as unknown as number)).toThrow(requiredError('Child', 'null'));
    });

    it('asks for a value even when the wrapped type has a default', () => {
      class DefaultedNumber extends PlainNumber {
        constructor(value: number | null = 0) {
          super(value);
        }
      }
      class RequiredDefaulted extends Required(DefaultedNumber) {}

      expectTypeOf<ConstructorParameters<typeof RequiredDefaulted>>().toEqualTypeOf<
        [value: number]
      >();
      expect(new RequiredDefaulted(5).validate()).toEqual(valid(5));
    });

    it('does not make the wrapped type required', () => {
      expect(new PlainNumber(null).validate()).toEqual(valid(null));
    });

    it('keeps the wrapped type: instanceof, static members and validations', () => {
      @Validations([{ validator: 'isEmail' }])
      class Email extends NullableString {}
      class RequiredEmail extends Required(Email) {}

      expect(new RequiredNumber(1)).toBeInstanceOf(PlainNumber);
      expect(RequiredNumber.zero().value).toBe(0);
      expect(new RequiredEmail('x').validate().errors).toEqual([
        { validator: 'isEmail', message: 'Value does not satisfy isEmail' },
      ]);
    });
  });
});
