import { describe, expect, it, jest } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { Validations } from '@archi-code/validation';
import type { Validatable, ValidationResult } from '@archi-code/validation';
import { AbstractType } from './abstract-type';

class NullableString extends AbstractType<string, null> {
  constructor(value: string | null = null) {
    super(value);
  }

  protected filter(value: string | null): string | null {
    return value;
  }
}

class RequiredNumber extends AbstractType<number> {
  constructor(value = 0) {
    super(value);
  }

  protected filter(value: number): number {
    return value;
  }
}

class TrimmedString extends AbstractType<string, null> {
  protected filter(value: string | null): string | null {
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
}

function typeWithSpiedFilter() {
  const filterSpy = jest.fn((value: unknown) => value);
  class SpiedType extends AbstractType<string, null> {
    protected filter(value: unknown): unknown {
      return filterSpy(value);
    }
  }
  return { SpiedType, filterSpy };
}

describe('AbstractType', () => {
  describe('typing', () => {
    it('value is T when the type does not accept null', () => {
      expectTypeOf<RequiredNumber['value']>().toEqualTypeOf<number>();
    });

    it('value is T | null when the type accepts null', () => {
      expectTypeOf<NullableString['value']>().toEqualTypeOf<string | null>();
    });

    it('the constructor accepts null only when the type accepts null', () => {
      expectTypeOf<ConstructorParameters<typeof AbstractType<number>>>().toEqualTypeOf<
        [value: number]
      >();
      expectTypeOf<ConstructorParameters<typeof AbstractType<number, null>>>().toEqualTypeOf<
        [value: number | null]
      >();
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
      expect(new RequiredNumber().value).toBe(0);
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

      it('a null value does not pass a validator', () => {
        expect(new Email(null).validate()).toEqual({
          ok: false,
          value: null,
          errors: [{ validator: 'isEmail', message: 'Value does not satisfy isEmail' }],
        });
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
        const alwaysFails = jest.fn(() => false);

        @Validations([{ custom: 'alwaysFails', fn: alwaysFails }])
        class AlwaysInvalid extends NullableString {}

        const instance = new AlwaysInvalid(null);
        expect(instance.validate()).toBe(instance.validate());
        expect(alwaysFails).toHaveBeenCalledTimes(1);
      });
    });
  });
});
