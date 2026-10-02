import { describe, expect, it, jest } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { Validations } from '@archi-code/validation';
import type { ValidationResult } from '@archi-code/validation';
import { ArrayType } from './array-type';
import { NumberType } from './number-type';
import { StringType } from './string-type';
import { AbstractType, Required } from './abstract-type';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';
import { RequiredValueException } from '../exceptions/domain/required-value.exception';

@Validations([{ custom: 'isAdult', fn: (value) => typeof value === 'number' && value >= 18 }])
class Age extends Required(NumberType) {}

class Ages extends ArrayType<Age> {
  protected createItem(value: unknown): Age {
    return new Age(value as number);
  }
}

class RequiredAges extends Required(Ages) {}

class Nicknames extends ArrayType<StringType> {
  protected createItem(value: unknown): StringType {
    return new StringType(value as string);
  }
}

const convertibleInputs: [unknown, number[]][] = [
  [[18], [18]],
  [
    [18, 30],
    [18, 30],
  ],
  [
    ['18', ' 30 '],
    [18, 30],
  ],
  ['[18,30]', [18, 30]],
  [[], []],
];

const emptyInputs: [string, unknown][] = [
  ['null', null],
  ['undefined', undefined],
  ['an empty string', ''],
  ['only spaces', '   '],
];

const notConvertibleInputs: [unknown, string][] = [
  ['abc', '"abc"'],
  ['{"a":1}', '"{"a":1}"'],
  [18, '18'],
  [true, 'true'],
  [{ a: 1 }, '{"a":1}'],
];

function primitiveError(received: string): string {
  return `Validation Error: Expected a valid Array, but received ${received}.`;
}

function requiredError(received: string): string {
  return `Validation Error: RequiredAges is required, but received ${received}.`;
}

function adultError(position: number) {
  return { custom: 'isAdult', message: `Item ${position}: Value does not satisfy isAdult` };
}

function nonEmptyAges() {
  const hasItems = jest.fn((value: unknown) => Array.isArray(value) && value.length > 0);

  @Validations([{ custom: 'hasItems', fn: hasItems }])
  class OptionalNonEmpty extends Ages {}

  @Validations([{ custom: 'hasItems', fn: hasItems }])
  class RequiredNonEmpty extends Required(Ages) {}

  return { OptionalNonEmpty, RequiredNonEmpty, hasItems };
}

const hasItemsError = { custom: 'hasItems', message: 'Value does not satisfy hasItems' };

describe('ArrayType (optional)', () => {
  describe('typing', () => {
    it('is an AbstractType of the item values that takes them, null or nothing and holds them or null', () => {
      expectTypeOf<Ages>().toMatchTypeOf<AbstractType<number[]>>();
      expectTypeOf<ConstructorParameters<typeof Ages>>().toEqualTypeOf<[value?: number[] | null]>();
      expectTypeOf<Ages['value']>().toEqualTypeOf<number[] | null>();
      expectTypeOf<Ages['validate']>().toEqualTypeOf<() => ValidationResult<number[] | null>>();
      expectTypeOf<Ages['items']>().toEqualTypeOf<Age[]>();
    });

    it('holds the value of optional items as T | null', () => {
      expectTypeOf<Nicknames['value']>().toEqualTypeOf<(string | null)[] | null>();
    });

    it('its value cannot be used as a plain array', () => {
      // @ts-expect-error an optional value may be null
      const ages: number[] = new Ages([18]).value;
      expect(ages).toEqual([18]);
    });
  });

  describe('conversion', () => {
    it.each(convertibleInputs)('%p → %p, each item converted', (input, expected) => {
      expect(new Ages(input as number[]).value).toEqual(expected);
    });

    it.each(emptyInputs)('%s → null', (_, input) => {
      expect(new Ages(input as number[]).value).toBeNull();
    });

    it('no value → null', () => {
      expect(new Ages().value).toBeNull();
    });

    it.each(notConvertibleInputs)('%p throws TypePrimitiveException', (input, received) => {
      const create = () => new Ages(input as number[]);
      expect(create).toThrow(TypePrimitiveException);
      expect(create).toThrow(primitiveError(received));
    });

    it('throws the error of an item that cannot be converted', () => {
      expect(() => new Ages([18, 'x'] as unknown as number[])).toThrow(
        'Validation Error: Expected a valid Number, but received "x".',
      );
    });

    it('throws when a required item is missing', () => {
      expect(() => new Ages([18, null] as unknown as number[])).toThrow(
        'Validation Error: Age is required, but received null.',
      );
    });

    it('keeps a missing optional item as null', () => {
      expect(new Nicknames(['Ana', null, '  ']).value).toEqual(['Ana', null, null]);
    });
  });

  describe('validate', () => {
    it.each(convertibleInputs)('%p is valid as %p', (input, expected) => {
      expect(new Ages(input as number[]).validate()).toEqual({
        ok: true,
        value: expected,
        errors: [],
      });
    });

    it.each(emptyInputs)('%s is valid as null', (_, input) => {
      expect(new Ages(input as number[]).validate()).toEqual({ ok: true, value: null, errors: [] });
    });

    it('reports the errors of each item with its position', () => {
      expect(new Ages([18, 10, 30, 5]).validate()).toEqual({
        ok: false,
        value: [18, 10, 30, 5],
        errors: [adultError(2), adultError(4)],
      });
    });

    it('reports its own errors before the errors of the items', () => {
      @Validations([
        { custom: 'atMostTwo', fn: (value) => Array.isArray(value) && value.length <= 2 },
      ])
      class FewAges extends Ages {}

      expect(new FewAges([18, 10, 5]).validate().errors).toEqual([
        { custom: 'atMostTwo', message: 'Value does not satisfy atMostTwo' },
        adultError(2),
        adultError(3),
      ]);
    });

    it('runs its validations on a value, an empty array included', () => {
      const { OptionalNonEmpty } = nonEmptyAges();
      expect(new OptionalNonEmpty([18]).validate().ok).toBe(true);
      expect(new OptionalNonEmpty([]).validate().errors).toEqual([hasItemsError]);
    });

    it.each(emptyInputs)('%s is valid without running its validations', (_, input) => {
      const { OptionalNonEmpty, hasItems } = nonEmptyAges();
      expect(new OptionalNonEmpty(input as number[]).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
      expect(hasItems).not.toHaveBeenCalled();
    });

    it('is frozen when the items have errors', () => {
      const result = new Ages([10]).validate();
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.errors)).toBe(true);
      expect(Object.isFrozen(result.errors[0])).toBe(true);
    });
  });

  describe('items', () => {
    it('are the item instances of the values', () => {
      const items = new Ages([18, 30]).items;
      expect(items).toHaveLength(2);
      expect(items[0]).toBeInstanceOf(Age);
      expect(items.map((item) => item.value)).toEqual([18, 30]);
    });

    it('are empty when the value is null', () => {
      expect(new Ages(null).items).toEqual([]);
    });
  });

  describe('changing the items', () => {
    it('addItem appends the converted item', () => {
      const ages = new Ages([18]);
      ages.addItem('30' as unknown as number);
      expect(ages.value).toEqual([18, 30]);
    });

    it('addItem starts the array when the value is null', () => {
      const ages = new Ages(null);
      ages.addItem(18);
      expect(ages.value).toEqual([18]);
    });

    it('addItem throws for an item that cannot be converted, keeping the value', () => {
      const ages = new Ages([18]);
      expect(() => ages.addItem('x' as unknown as number)).toThrow(TypePrimitiveException);
      expect(ages.value).toEqual([18]);
    });

    it('hasItem compares the converted item', () => {
      const ages = new Ages([18, 30]);
      expect(ages.hasItem(30)).toBe(true);
      expect(ages.hasItem('30' as unknown as number)).toBe(true);
      expect(ages.hasItem(40)).toBe(false);
      expect(new Ages(null).hasItem(18)).toBe(false);
    });

    it('setItem adds the item only when it is not there', () => {
      const ages = new Ages([18]);
      ages.setItem(18);
      ages.setItem(30);
      expect(ages.value).toEqual([18, 30]);
    });

    it('removeItem removes every equal item', () => {
      const ages = new Ages([18, 30, 18]);
      ages.removeItem(18);
      expect(ages.value).toEqual([30]);
    });

    it('removeItem does nothing when the value is null', () => {
      const ages = new Ages(null);
      ages.removeItem(18);
      expect(ages.value).toBeNull();
    });

    it('replaces the array, so validate sees the change', () => {
      const ages = new Ages([18]);
      const before = ages.value;
      const valid = ages.validate();
      ages.addItem(10);
      expect(ages.value).not.toBe(before);
      expect(before).toEqual([18]);
      expect(ages.validate()).not.toBe(valid);
      expect(ages.validate().errors).toEqual([adultError(2)]);
    });
  });

  describe('isNull / toString', () => {
    it.each([
      ['a value', new Ages([18, 30]), false, '18, 30'],
      ['an empty array', new Ages([]), false, ''],
      ['an empty value', new Ages(null), true, ''],
    ])('%s → isNull %s, toString %p', (_, instance, isNull, text) => {
      expect(instance.isNull).toBe(isNull);
      expect(instance.toString).toBe(text);
    });
  });
});

describe('Required(ArrayType)', () => {
  describe('typing', () => {
    it('takes only the item values and holds them', () => {
      expectTypeOf<ConstructorParameters<typeof RequiredAges>>().toEqualTypeOf<[value: number[]]>();
      expectTypeOf<RequiredAges['value']>().toEqualTypeOf<number[]>();
      expectTypeOf<RequiredAges['validate']>().toEqualTypeOf<() => ValidationResult<number[]>>();
    });

    it('does not accept a missing value or a value of another type', () => {
      // @ts-expect-error a required array needs a value
      expect(() => new RequiredAges()).toThrow(RequiredValueException);
      // @ts-expect-error a required array does not accept null
      expect(() => new RequiredAges(null)).toThrow(RequiredValueException);
      // @ts-expect-error a required array does not accept undefined
      expect(() => new RequiredAges(undefined)).toThrow(RequiredValueException);
      // @ts-expect-error a required array does not accept a string
      expect(new RequiredAges('[18]').value).toEqual([18]);
    });
  });

  describe('construction', () => {
    it.each(convertibleInputs)('%p → %p', (input, expected) => {
      expect(new RequiredAges(input as number[]).value).toEqual(expected);
    });

    it.each(emptyInputs)('%s throws RequiredValueException', (_, input) => {
      const received = typeof input === 'string' ? `"${input}"` : 'null';
      const create = () => new RequiredAges(input as number[]);
      expect(create).toThrow(RequiredValueException);
      expect(create).toThrow(requiredError(received));
    });

    it('an empty array is a value, not a missing one', () => {
      expect(new RequiredAges([]).value).toEqual([]);
    });
  });

  describe('validate', () => {
    it('reports the errors of each item with its position', () => {
      expect(new RequiredAges([10, 18]).validate().errors).toEqual([adultError(1)]);
    });

    it('runs its validations on a value, an empty array included', () => {
      const { RequiredNonEmpty } = nonEmptyAges();
      expect(new RequiredNonEmpty([18]).validate().ok).toBe(true);
      expect(new RequiredNonEmpty([]).validate().errors).toEqual([hasItemsError]);
    });

    it('does not make the array type required', () => {
      expect(new Ages(null).validate()).toEqual({ ok: true, value: null, errors: [] });
    });
  });
});
