import { describe, expect, it, jest } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { Validations } from '@archi-code/validation';
import type { Validatable, ValidationResult } from '@archi-code/validation';
import { AbstractType, Required } from './abstract-type';

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

class DefaultedNumber extends PlainNumber {
  constructor(value: number | null = 0) {
    super(value);
  }
}

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

describe('AbstractType', () => {
  describe('typing', () => {
    it('value is T when the type is required', () => {
      expectTypeOf<RequiredNumber['value']>().toEqualTypeOf<number>();
    });

    it('value is T | null by default', () => {
      expectTypeOf<NullableString['value']>().toEqualTypeOf<string | null>();
      expectTypeOf<PlainNumber['value']>().toEqualTypeOf<number | null>();
    });

    it('the constructor accepts null or nothing by default and asks for T when required', () => {
      expectTypeOf<ConstructorParameters<typeof AbstractType<number>>>().toEqualTypeOf<
        [value?: number | null]
      >();
      expectTypeOf<ConstructorParameters<typeof PlainNumber>>().toEqualTypeOf<
        [value?: number | null]
      >();
      expectTypeOf<
        ConstructorParameters<ReturnType<typeof Required<typeof PlainNumber>>>
      >().toEqualTypeOf<[value: number]>();
    });

    it('public API has the expected types', () => {
      expectTypeOf<NullableString['isNull']>().toEqualTypeOf<boolean>();
      expectTypeOf<NullableString['isNotNull']>().toEqualTypeOf<boolean>();
      expectTypeOf<NullableString['toString']>().toEqualTypeOf<string>();
      expectTypeOf<NullableString['validate']>().toEqualTypeOf<
        () => ValidationResult<string | null>
      >();
      expectTypeOf<RequiredNumber['validate']>().toEqualTypeOf<() => ValidationResult<number>>();
    });

    it('is Validatable of its value type', () => {
      expectTypeOf<NullableString>().toMatchTypeOf<Validatable<string | null>>();
      expectTypeOf<RequiredNumber>().toMatchTypeOf<Validatable<number>>();
    });
  });

  describe('required or optional construction', () => {
    const missing = {
      ok: false,
      value: null,
      errors: [{ validator: 'isNotEmpty', message: 'Value should not be empty' }],
    };

    describe('optional (default)', () => {
      it('can be created without a value, with null, with undefined or with a value', () => {
        expect(new NullableString().value).toBeNull();
        expect(new NullableString(null).value).toBeNull();
        expect(new NullableString(undefined).value).toBeNull();
        expect(new NullableString('abc').value).toBe('abc');
      });

      it('its value is typed as T | null', () => {
        const value = new NullableString('abc').value;
        expectTypeOf(value).toEqualTypeOf<string | null>();
        // @ts-expect-error an optional value may be null, so it is not a plain string
        const text: string = value;
        expect(text).toBe('abc');
      });

      it('without a value it is valid', () => {
        expect(new NullableString().validate()).toEqual({ ok: true, value: null, errors: [] });
      });
    });

    describe('required', () => {
      it('the constructor parameter is mandatory and of type T', () => {
        expectTypeOf<ConstructorParameters<typeof RequiredNumber>>().toEqualTypeOf<
          [value: number]
        >();
      });

      it('is a type error to create it without a value', () => {
        // @ts-expect-error a required type needs a value
        const instance = new RequiredNumber();
        expect(instance.validate()).toEqual(missing);
      });

      it('is a type error to create it with null', () => {
        // @ts-expect-error a required type does not accept null
        const instance = new RequiredNumber(null);
        expect(instance.validate()).toEqual(missing);
      });

      it('is a type error to create it with undefined', () => {
        // @ts-expect-error a required type does not accept undefined
        const instance = new RequiredNumber(undefined);
        expect(instance.validate()).toEqual(missing);
      });

      it('is a type error to create it with a value of another type', () => {
        // @ts-expect-error a required number does not accept a string
        const create = () => new RequiredNumber('1');
        expect(create).not.toThrow();
      });

      it('accepts a value of type T and its value is typed as T', () => {
        const instance = new RequiredNumber(1);
        const value: number = instance.value;
        expect(value).toBe(1);
        expect(instance.validate()).toEqual({ ok: true, value: 1, errors: [] });
      });

      it('a subclass is required too', () => {
        class Child extends RequiredNumber {}

        expectTypeOf<ConstructorParameters<typeof Child>>().toEqualTypeOf<[value: number]>();
        // @ts-expect-error a subclass of a required type needs a value
        const instance = new Child();
        expect(instance.validate()).toEqual(missing);
      });

      it('asks for a value even when the wrapped type has a default', () => {
        class RequiredDefaulted extends Required(DefaultedNumber) {}

        expectTypeOf<ConstructorParameters<typeof RequiredDefaulted>>().toEqualTypeOf<
          [value: number]
        >();
        // @ts-expect-error Required replaces the optional constructor of the wrapped type
        const create = () => new RequiredDefaulted();
        expect(create).not.toThrow();
      });

      it('a subclass that declares its own constructor with a default makes the value optional again', () => {
        class Defaulted extends RequiredNumber {
          constructor(value = 0) {
            super(value);
          }
        }

        expectTypeOf<ConstructorParameters<typeof Defaulted>>().toEqualTypeOf<[value?: number]>();
        expect(new Defaulted().value).toBe(0);
      });
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
      ['null', null],
      ['undefined', undefined],
    ])('passes %s to filter as null', (_, input) => {
      const { SpiedType, filterSpy } = typeWithSpiedFilter();
      const instance = new SpiedType(input as string | null);
      expect(filterSpy).toHaveBeenCalledWith(null);
      expect(instance.value).toBeNull();
    });

    it.each([
      ['0', 0],
      ['empty string', ''],
      ['false', false],
      ['NaN', NaN],
    ])('keeps the falsy value %s (only null/undefined become null)', (_, input) => {
      const { SpiedType, filterSpy } = typeWithSpiedFilter();
      const instance = new SpiedType(input as unknown as string);
      expect(filterSpy).toHaveBeenCalledWith(input);
      expect(instance.value).toBe(input);
    });

    it('stores what filter returns, not the raw input', () => {
      expect(new TrimmedString('  abc  ').value).toBe('abc');
      expect(new TrimmedString('   ').value).toBeNull();
    });

    it('uses the default value of the subclass constructor', () => {
      expect(new DefaultedNumber().value).toBe(0);
      expect(new NullableString().value).toBeNull();
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
      ['a string', new NullableString('abc'), false],
      ['an empty string', new NullableString(''), false],
      ['0', new RequiredNumber(0), false],
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
      ['an empty string', new NullableString(''), ''],
      ['a number', new RequiredNumber(42), '42'],
      ['0', new RequiredNumber(0), '0'],
      ['a negative decimal', new RequiredNumber(-1.5), '-1.5'],
      ['the filtered value', new TrimmedString('  abc  '), 'abc'],
    ])('%s → %p', (_, instance, expected) => {
      expect(instance.toString).toBe(expected);
    });

    it('can be overridden by a subclass', () => {
      class Upper extends NullableString {
        get toString(): string {
          return this.isNull ? '-' : (this.value as string).toUpperCase();
        }
      }
      expect(new Upper('abc').toString).toBe('ABC');
      expect(new Upper(null).toString).toBe('-');
    });
  });

  describe('validate', () => {
    describe('result', () => {
      @Validations([{ validator: 'isEmail' }])
      class Email extends NullableString {}

      it('is ok with the validated value and no errors when the value is valid', () => {
        expect(new Email('user@example.com').validate()).toEqual({
          ok: true,
          value: 'user@example.com',
          errors: [],
        });
      });

      it('is not ok with the validated value and the errors when the value is invalid', () => {
        expect(new Email('x').validate()).toEqual({
          ok: false,
          value: 'x',
          errors: [{ validator: 'isEmail', message: 'Value does not satisfy isEmail' }],
        });
      });

      it('holds the filtered value, not the raw input', () => {
        @Validations([{ validator: 'isAlpha' }])
        class Letters extends TrimmedString {}

        expect(new Letters('  abc  ').validate()).toEqual({ ok: true, value: 'abc', errors: [] });
      });

      it('is frozen', () => {
        const result = new Email('x').validate();
        expect(Object.isFrozen(result)).toBe(true);
        expect(Object.isFrozen(result.errors)).toBe(true);
      });
    });

    describe('without declared validations', () => {
      it.each([
        ['a string', new NullableString('anything')],
        ['null', new NullableString(null)],
        ['a negative number', new RequiredNumber(-1)],
      ])('is ok for %s', (_, instance) => {
        expect(instance.validate()).toEqual({ ok: true, value: instance.value, errors: [] });
      });
    });

    describe('built-in validations', () => {
      @Validations([{ validator: 'isEmail' }])
      class Email extends NullableString {}

      @Validations([{ validator: 'isLength', properties: { min: 3, max: 5 } }])
      class Code extends NullableString {}

      it.each([
        ['user@example.com', true],
        ['not-an-email', false],
        ['', false],
      ])('isEmail: %p → ok %s', (value, expected) => {
        expect(new Email(value).validate().ok).toBe(expected);
      });

      it.each([
        ['ab', false],
        ['abc', true],
        ['abcde', true],
        ['abcdef', false],
      ])('isLength { min: 3, max: 5 }: %p → ok %s', (value, expected) => {
        expect(new Code(value).validate().ok).toBe(expected);
      });

      it('a null value of an optional type is valid without running the validators', () => {
        expect(new Email(null).validate()).toEqual({ ok: true, value: null, errors: [] });
      });
    });

    describe('custom validations', () => {
      it('receives the filtered value, not the raw input', () => {
        const isHello = jest.fn((value: unknown) => value === 'hello');

        @Validations([{ custom: 'isHello', fn: isHello }])
        class Greeting extends TrimmedString {}

        expect(new Greeting('  hello  ').validate().ok).toBe(true);
        expect(isHello).toHaveBeenLastCalledWith('hello');
        expect(new Greeting('bye').validate().ok).toBe(false);
        expect(isHello).toHaveBeenLastCalledWith('bye');
      });
    });

    describe('errors', () => {
      @Validations([
        { validator: 'isLength', properties: { min: 3 } },
        { validator: 'isAlpha', message: 'Only letters' },
        {
          custom: 'startsWithA',
          fn: (value) => typeof value === 'string' && value.startsWith('a'),
          message: 'Must start with a',
        },
        { custom: 'noSpaces', fn: (value) => typeof value === 'string' && !value.includes(' ') },
      ])
      class Name extends NullableString {}

      const isLength = { validator: 'isLength', message: 'Value does not satisfy isLength' };
      const isAlpha = { validator: 'isAlpha', message: 'Only letters' };
      const startsWithA = { custom: 'startsWithA', message: 'Must start with a' };
      const noSpaces = { custom: 'noSpaces', message: 'Value does not satisfy noSpaces' };

      it.each([
        ['abc', []],
        ['abc1', [isAlpha]],
        ['ab', [isLength]],
        ['ab cd', [isAlpha, noSpaces]],
        ['b 1', [isAlpha, startsWithA, noSpaces]],
        ['b', [isLength, startsWithA]],
      ])('%p → errors %j', (value, expectedErrors) => {
        expect(new Name(value).validate().errors).toEqual(expectedErrors);
      });

      it('ok is true exactly when there are no errors', () => {
        for (const value of ['abc', 'ab', 'abc1', 'b 1', null]) {
          const result = new Name(value).validate();
          expect(result.ok).toBe(result.errors.length === 0);
        }
      });

      it('include the inherited ones, parent first', () => {
        @Validations([
          {
            custom: 'endsWithZ',
            fn: (value) => typeof value === 'string' && value.endsWith('z'),
            message: 'Must end with z',
          },
        ])
        class Child extends Name {}

        expect(new Child('abz').validate().errors).toEqual([]);
        expect(new Child('b').validate().errors).toEqual([
          isLength,
          startsWithA,
          { custom: 'endsWithZ', message: 'Must end with z' },
        ]);
      });
    });

    describe('inheritance', () => {
      @Validations([{ validator: 'isLength', properties: { min: 3 } }])
      class Base extends NullableString {}

      @Validations([{ validator: 'isAlpha' }])
      class Child extends Base {}

      @Validations([{ validator: 'isLength', properties: { min: 1 } }])
      class Relaxed extends Base {}

      class Inheriting extends Base {}

      it('a subclass runs the validations of its parent and its own', () => {
        expect(new Child('abc').validate().ok).toBe(true);
        expect(new Child('ab').validate().ok).toBe(false);
        expect(new Child('ab1').validate().ok).toBe(false);
      });

      it('a subclass without its own validations inherits the parent ones', () => {
        expect(new Inheriting('ab').validate().ok).toBe(false);
        expect(new Inheriting('abc').validate().ok).toBe(true);
      });

      it('a subclass replaces a parent validation of the same validator', () => {
        expect(new Base('ab').validate().ok).toBe(false);
        expect(new Relaxed('ab').validate().ok).toBe(true);
      });

      it('subclasses do not change the validations of the parent or of each other', () => {
        expect(new Base('ab1').validate().ok).toBe(true);
        expect(new Relaxed('ab1').validate().ok).toBe(true);
        expect(new NullableString('a').validate().ok).toBe(true);
      });
    });

    describe('reuse of the last result', () => {
      function counterWithSpiedRule() {
        const isNonNegative = jest.fn((value: unknown) => typeof value === 'number' && value >= 0);

        @Validations([{ custom: 'nonNegative', fn: isNonNegative }])
        class Counter extends AbstractType<number | number[]> {
          protected filter(value: number | number[]): number | number[] {
            return value;
          }

          change(value: number | number[]): void {
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
        expect(counter.validate()).toBe(result);
        expect(isNonNegative).toHaveBeenCalledTimes(1);
      });

      it('validates again when the value changes', () => {
        const { Counter, isNonNegative } = counterWithSpiedRule();
        const counter = new Counter(1);
        const beforeChange = counter.validate();
        counter.change(-1);
        const afterChange = counter.validate();
        expect(afterChange).not.toBe(beforeChange);
        expect(afterChange).toEqual({
          ok: false,
          value: -1,
          errors: [{ custom: 'nonNegative', message: 'Value does not satisfy nonNegative' }],
        });
        expect(isNonNegative).toHaveBeenCalledTimes(2);
      });

      it('validates again when the value comes back to a previous one', () => {
        const { Counter, isNonNegative } = counterWithSpiedRule();
        const counter = new Counter(1);
        const withOne = counter.validate();
        counter.change(-1);
        counter.validate();
        counter.change(1);
        const withOneAgain = counter.validate();
        expect(withOneAgain).not.toBe(withOne);
        expect(withOneAgain).toEqual(withOne);
        expect(isNonNegative).toHaveBeenCalledTimes(3);
      });

      it('reuses the result when the same value is assigned again', () => {
        const { Counter, isNonNegative } = counterWithSpiedRule();
        const counter = new Counter(1);
        const result = counter.validate();
        counter.change(1);
        expect(counter.validate()).toBe(result);
        expect(isNonNegative).toHaveBeenCalledTimes(1);
      });

      it('compares by identity: NaN is the same value, -0 and 0 are not', () => {
        const { Counter, isNonNegative } = counterWithSpiedRule();
        const counter = new Counter(NaN);
        const withNaN = counter.validate();
        counter.change(NaN);
        expect(counter.validate()).toBe(withNaN);
        counter.change(0);
        const withZero = counter.validate();
        counter.change(-0);
        expect(counter.validate()).not.toBe(withZero);
        expect(isNonNegative).toHaveBeenCalledTimes(3);
      });

      it('compares by identity: another array with the same items is a new value', () => {
        const { Counter, isNonNegative } = counterWithSpiedRule();
        const counter = new Counter([1]);
        const withArray = counter.validate();
        counter.change([1]);
        expect(counter.validate()).not.toBe(withArray);
        expect(isNonNegative).toHaveBeenCalledTimes(2);
      });

      it('keeps one result per instance', () => {
        const { Counter, isNonNegative } = counterWithSpiedRule();
        const first = new Counter(1);
        const second = new Counter(1);
        expect(first.validate()).not.toBe(second.validate());
        expect(isNonNegative).toHaveBeenCalledTimes(2);
      });

      it('reuses the result of a null value too', () => {
        const optional = new NullableString(null);
        const required = new RequiredNumber(null as unknown as number);
        expect(optional.validate()).toBe(optional.validate());
        expect(required.validate()).toBe(required.validate());
      });
    });
  });

  describe('Required', () => {
    const missing = {
      ok: false,
      value: null,
      errors: [{ validator: 'isNotEmpty', message: 'Value should not be empty' }],
    };

    it('a required type with null is not valid', () => {
      expect(new RequiredNumber(null as unknown as number).validate()).toEqual(missing);
    });

    it('a required type with a value runs its validations', () => {
      @Validations([{ custom: 'positive', fn: (value) => typeof value === 'number' && value > 0 }])
      class Positive extends RequiredNumber {}

      expect(new Positive(1).validate()).toEqual({ ok: true, value: 1, errors: [] });
      expect(new Positive(0).validate().errors).toEqual([
        { custom: 'positive', message: 'Value does not satisfy positive' },
      ]);
    });

    it('only reports the missing value, without running the validations', () => {
      const isPositive = jest.fn((value: unknown) => typeof value === 'number' && value > 0);

      @Validations([{ custom: 'positive', fn: isPositive }])
      class Positive extends RequiredNumber {}

      expect(new Positive(null as unknown as number).validate()).toEqual(missing);
      expect(isPositive).not.toHaveBeenCalled();
    });

    it('a subclass of a required type is required too', () => {
      class Child extends RequiredNumber {}

      expectTypeOf<Child['value']>().toEqualTypeOf<number>();
      expect(new Child(null as unknown as number).validate()).toEqual(missing);
    });

    it('does not make the wrapped type required', () => {
      expect(new PlainNumber(null).validate()).toEqual({ ok: true, value: null, errors: [] });
    });

    it('keeps the wrapped type: instanceof and static members', () => {
      const number = new RequiredNumber(1);
      expect(number).toBeInstanceOf(PlainNumber);
      expect(number).toBeInstanceOf(AbstractType);
      expect(RequiredNumber.zero().value).toBe(0);
    });

    it('keeps the validations of the wrapped type', () => {
      @Validations([{ validator: 'isEmail' }])
      class Email extends NullableString {}
      class RequiredEmail extends Required(Email) {}

      expect(new RequiredEmail('x').validate().errors).toEqual([
        { validator: 'isEmail', message: 'Value does not satisfy isEmail' },
      ]);
      expect(new RequiredEmail('user@example.com').validate().ok).toBe(true);
    });
  });
});
