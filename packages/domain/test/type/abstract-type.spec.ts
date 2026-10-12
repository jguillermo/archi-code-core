import { describe, expect, it, jest } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { Validations } from '@archi-code/validation';
import type { Validatable, ValidationResult } from '@archi-code/validation';
import { AbstractType, Required } from '../../src/type/abstract-type';
import { RequiredValueException } from '../../src/exceptions/domain/required-value.exception';

class NullableString extends AbstractType<string> {
  protected filter(value: string): string {
    return value;
  }
}

class PlainNumber extends AbstractType<number> {
  static zero(): PlainNumber {
    return new PlainNumber(0);
  }

  protected filter(value: number): number {
    return value;
  }
}

class RequiredNumber extends Required(PlainNumber) {}

class TrimmedString extends AbstractType<string> {
  protected filter(value: string): string {
    return value.trim();
  }
}

class NoneAsNull extends AbstractType<string> {
  protected filter(value: string): string | null {
    return value === 'none' ? null : value;
  }
}

function typeWithSpiedFilter() {
  const filterSpy = jest.fn((value: unknown) => value);
  class SpiedType extends AbstractType<string> {
    protected filter(value: unknown): string {
      return filterSpy(value) as string;
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

    it('isNull and toString are typed', () => {
      expectTypeOf<PlainNumber['isNull']>().toEqualTypeOf<boolean>();
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
      ['an empty string', ['']],
      ['a blank string', [' \t\n ']],
    ])('does not call filter for %s and stores null', (_, args) => {
      const { SpiedType, filterSpy } = typeWithSpiedFilter();
      const instance = new SpiedType(...(args as [string | null]));
      expect(filterSpy).not.toHaveBeenCalled();
      expect(instance.value).toBeNull();
    });

    it.each([
      ['0', 0],
      ['false', false],
      ['NaN', NaN],
    ])('keeps the falsy value %s', (_, input) => {
      const { SpiedType } = typeWithSpiedFilter();
      expect(new SpiedType(input as unknown as string).value).toBe(input);
    });

    it('passes a string with content to filter as it is', () => {
      const { SpiedType, filterSpy } = typeWithSpiedFilter();
      new SpiedType(' a ');
      expect(filterSpy).toHaveBeenCalledWith(' a ');
    });

    it('stores what filter returns, not the raw input', () => {
      expect(new TrimmedString('  abc  ').value).toBe('abc');
      expect(new NoneAsNull('none').value).toBeNull();
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

  describe('isNull', () => {
    it.each([
      ['null', new NullableString(null), true],
      ['a value', new NullableString('abc'), false],
      ['a falsy value', new PlainNumber(0), false],
      ['a value filtered to null', new NoneAsNull('none'), true],
    ])('%s → isNull %s', (_, instance, expected) => {
      expect(instance.isNull).toBe(expected);
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

    describe('keeps nothing between calls', () => {
      function counterWithSpiedRule() {
        const isNonNegative = jest.fn((value: unknown) => typeof value === 'number' && value >= 0);

        @Validations([{ custom: 'nonNegative', fn: isNonNegative }])
        class Counter extends AbstractType<number> {
          protected filter(value: number): number {
            return value;
          }

          change(value: number | null): void {
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

      it('runs the validations on every call and returns a new result', () => {
        const { Counter, isNonNegative } = counterWithSpiedRule();
        const counter = new Counter(1);
        const first = counter.validate();
        const second = counter.validate();
        expect(second).not.toBe(first);
        expect(second).toEqual(first);
        expect(isNonNegative).toHaveBeenCalledTimes(2);
      });

      it('validates the current value after it changes', () => {
        const { Counter } = counterWithSpiedRule();
        const counter = new Counter(1);
        expect(counter.validate().ok).toBe(true);
        counter.change(-1);
        expect(counter.validate()).toEqual({
          ok: false,
          value: -1,
          errors: [{ custom: 'nonNegative', message: 'Value does not satisfy nonNegative' }],
        });
        counter.change(null);
        expect(counter.validate()).toEqual(valid(null));
      });

      it('stores no validation state in the instance', () => {
        const { Counter } = counterWithSpiedRule();
        const counter = new Counter(1);
        counter.validate();
        counter.change(null);
        counter.validate();
        expect(Object.keys(counter)).toEqual(['_value']);
      });
    });

    describe('optional and required', () => {
      const positiveError = { custom: 'positive', message: 'Value does not satisfy positive' };
      const evenError = { custom: 'even', message: 'Must be even' };
      const isRequiredError = {
        validator: 'isRequired',
        message: 'Value does not satisfy isRequired',
      };

      function ratingTypes() {
        const isPositive = jest.fn((value: unknown) => typeof value === 'number' && value > 0);
        const isEven = jest.fn((value: unknown) => typeof value === 'number' && value % 2 === 0);

        @Validations([
          { custom: 'positive', fn: isPositive },
          { custom: 'even', fn: isEven, message: 'Must be even' },
        ])
        class Rating extends AbstractType<number> {
          protected filter(value: number): number | null {
            return value === -999 ? null : value;
          }

          change(value: number | null): void {
            this._value = value;
          }
        }

        class RequiredRating extends Required(Rating) {}

        return { Rating, RequiredRating, isPositive, isEven };
      }

      describe('optional type', () => {
        it.each([
          ['no value', []],
          ['null', [null]],
          ['undefined', [undefined]],
          ['an empty string', ['']],
          ['a blank string', ['   ']],
        ])('is ok with %s, without running its validations', (_, args) => {
          const { Rating, isPositive, isEven } = ratingTypes();
          const rating = new Rating(...(args as unknown as [number]));
          expect(rating.validate()).toEqual(valid(null));
          expect(isPositive).not.toHaveBeenCalled();
          expect(isEven).not.toHaveBeenCalled();
        });

        it('is ok without running its validations when filter turns the value into null', () => {
          const { Rating, isPositive } = ratingTypes();
          expect(new Rating(-999).validate()).toEqual(valid(null));
          expect(isPositive).not.toHaveBeenCalled();
        });

        it('is ok without running its validations when the value becomes null', () => {
          const { Rating, isPositive } = ratingTypes();
          const rating = new Rating(-1);
          rating.change(null);
          expect(rating.validate()).toEqual(valid(null));
          expect(isPositive).not.toHaveBeenCalled();
        });

        it('is ok with a value that satisfies every validation', () => {
          const { Rating, isPositive, isEven } = ratingTypes();
          expect(new Rating(4).validate()).toEqual(valid(4));
          expect(isPositive).toHaveBeenCalledWith(4);
          expect(isEven).toHaveBeenCalledWith(4);
        });

        it('runs every validation on a value and reports each failure in order', () => {
          const { Rating } = ratingTypes();
          expect(new Rating(-3).validate()).toEqual({
            ok: false,
            value: -3,
            errors: [positiveError, evenError],
          });
          expect(new Rating(3).validate().errors).toEqual([evenError]);
        });

        it('runs its validations on a falsy value', () => {
          const { Rating, isPositive } = ratingTypes();
          expect(new Rating(0).validate().errors).toEqual([positiveError]);
          expect(isPositive).toHaveBeenCalledWith(0);
        });
      });

      describe('required type', () => {
        it('is ok with a value that satisfies every validation, without reporting isRequired', () => {
          const { RequiredRating } = ratingTypes();
          expect(new RequiredRating(4).validate()).toEqual(valid(4));
        });

        it('runs every validation of the wrapped type on a value and reports each failure', () => {
          const { RequiredRating, isPositive, isEven } = ratingTypes();
          expect(new RequiredRating(-3).validate()).toEqual({
            ok: false,
            value: -3,
            errors: [positiveError, evenError],
          });
          expect(isPositive).toHaveBeenCalledWith(-3);
          expect(isEven).toHaveBeenCalledWith(-3);
        });

        it('a falsy value is present: it passes isRequired and runs the other validations', () => {
          const { RequiredRating } = ratingTypes();
          expect(new RequiredRating(0).validate().errors).toEqual([positiveError]);
        });

        it('fails only isRequired when the value becomes null, running no other validation', () => {
          const { RequiredRating, isPositive, isEven } = ratingTypes();
          const rating = new RequiredRating(4);
          rating.change(null);
          expect(rating.validate()).toEqual({ ok: false, value: null, errors: [isRequiredError] });
          expect(isPositive).not.toHaveBeenCalled();
          expect(isEven).not.toHaveBeenCalled();
        });

        it('is valid again once the value is set back', () => {
          const { RequiredRating } = ratingTypes();
          const rating = new RequiredRating(4);
          rating.change(null);
          expect(rating.validate().ok).toBe(false);
          rating.change(6);
          expect(rating.validate()).toEqual(valid(6));
        });

        it('returns a frozen result when it fails isRequired', () => {
          const { RequiredRating } = ratingTypes();
          const rating = new RequiredRating(4);
          rating.change(null);
          const result = rating.validate();
          expect(Object.isFrozen(result)).toBe(true);
          expect(Object.isFrozen(result.errors)).toBe(true);
          expect(Object.isFrozen(result.errors[0])).toBe(true);
        });

        it('runs the validations of the wrapped type first, then its own', () => {
          const { RequiredRating } = ratingTypes();

          @Validations([
            { custom: 'small', fn: (value) => typeof value === 'number' && value < 10 },
          ])
          class SmallRating extends RequiredRating {}

          expect(new SmallRating(11).validate().errors).toEqual([
            evenError,
            { custom: 'small', message: 'Value does not satisfy small' },
          ]);
        });

        it('reports the isRequired message redeclared by a subclass', () => {
          const { RequiredRating } = ratingTypes();

          @Validations([{ validator: 'isRequired', message: 'Rating is required' }])
          class NamedRating extends RequiredRating {}

          const rating = new NamedRating(4);
          rating.change(null);
          expect(rating.validate().errors).toEqual([
            { validator: 'isRequired', message: 'Rating is required' },
          ]);
        });

        it('a subclass of a required type is required in validate too', () => {
          const { RequiredRating } = ratingTypes();
          class ChildRating extends RequiredRating {}
          const rating = new ChildRating(4);
          rating.change(null);
          expect(rating.validate().errors).toEqual([isRequiredError]);
        });
      });

      describe('the same value in both', () => {
        it.each([
          ['a valid value', 4, true, true],
          ['an invalid value', -3, false, false],
        ])('%s gives the same result', (_, value, optionalOk, requiredOk) => {
          const { Rating, RequiredRating } = ratingTypes();
          expect(new Rating(value).validate().ok).toBe(optionalOk);
          expect(new RequiredRating(value).validate().ok).toBe(requiredOk);
          expect(new RequiredRating(value).validate()).toEqual(new Rating(value).validate());
        });

        it('null is ok when optional and fails isRequired when required', () => {
          const { Rating, RequiredRating } = ratingTypes();
          const optional = new Rating(4);
          const required = new RequiredRating(4);
          optional.change(null);
          required.change(null);
          expect(optional.validate()).toEqual(valid(null));
          expect(required.validate()).toEqual({
            ok: false,
            value: null,
            errors: [isRequiredError],
          });
        });
      });
    });
  });

  describe('Required', () => {
    it.each([
      ['null', null],
      ['a blank string', '   '],
    ])('does not call filter when the value is %s', (_, input) => {
      const { SpiedType, filterSpy } = typeWithSpiedFilter();
      class RequiredSpied extends Required(SpiedType) {}

      expect(() => new RequiredSpied(input as string)).toThrow(RequiredValueException);
      expect(filterSpy).not.toHaveBeenCalled();
    });

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

    it.each([
      ['a blank string', '   ', '"   "'],
      ['a value that filter turns into null', 'none', '"none"'],
    ])('throws for %s, reporting the raw input', (_, input, received) => {
      class RequiredNone extends Required(NoneAsNull) {}

      expect(() => new RequiredNone(input)).toThrow(requiredError('RequiredNone', received));
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

    it('fails only isRequired when the value becomes null, without running the other validations', () => {
      const rule = jest.fn(() => true);

      @Validations([{ custom: 'rule', fn: rule }])
      class Clearable extends RequiredNumber {
        clear(): void {
          this._value = null;
        }
      }
      const clearable = new Clearable(1);
      clearable.clear();

      expect(clearable.validate()).toEqual({
        ok: false,
        value: null,
        errors: [{ validator: 'isRequired', message: 'Value does not satisfy isRequired' }],
      });
      expect(rule).not.toHaveBeenCalled();
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
