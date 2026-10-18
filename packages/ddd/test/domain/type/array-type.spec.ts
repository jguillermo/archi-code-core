import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Validations } from '@archi-code/validation';
import type { ValidationResult } from '@archi-code/validation';
import { ArrayType } from '../../../src/domain/type/array-type';
import { DateType } from '../../../src/domain/type/date-type';
import { NumberType } from '../../../src/domain/type/number-type';
import { StringType } from '../../../src/domain/type/string-type';
import { AbstractType } from '../../../src/domain/type/abstract-type';
import { Required } from '../../../src/domain/type/required/required';
import { TypePrimitiveException } from '../../../src/exceptions/domain/type-primitive.exception';
import { RequiredValueException } from '../../../src/exceptions/domain/required-value.exception';
import { ValidationException } from '../../../src/exceptions/domain/validation.exception';

@Validations([
  { validator: 'isLength', properties: { min: 2, max: 12 }, message: 'A tag has 2 to 12 letters' },
])
class Tag extends Required(StringType) {}

class Tags extends ArrayType<Tag> {
  protected createItem(value: unknown): Tag {
    return new Tag(value as string);
  }
}

class ProductTags extends Required(Tags) {}

class HolidayDate extends Required(DateType) {}

class HolidayDates extends ArrayType<HolidayDate> {
  protected createItem(value: unknown): HolidayDate {
    return new HolidayDate(value as Date);
  }
}

class Score extends NumberType {}

class Scores extends ArrayType<Score> {
  protected createItem(value: unknown): Score {
    return new Score(value as number);
  }
}

@Validations([
  {
    custom: 'atMostThree',
    fn: (value) => Array.isArray(value) && value.length <= 3,
    message: 'A product has at most 3 tags',
  },
])
class LimitedTags extends Tags {}

const CHRISTMAS = '2024-12-25T00:00:00.000Z';
const NEW_YEAR = '2025-01-01T00:00:00.000Z';

describe('ArrayType', () => {
  describe('typing', () => {
    it('an optional list takes the item values, null or nothing', () => {
      expectTypeOf<Tags>().toMatchTypeOf<AbstractType<string[]>>();
      expectTypeOf<ConstructorParameters<typeof Tags>>().toEqualTypeOf<[value?: string[] | null]>();
      expectTypeOf<Tags['value']>().toEqualTypeOf<string[] | null>();
      expectTypeOf<Tags['validate']>().toEqualTypeOf<() => ValidationResult<string[] | null>>();
      expectTypeOf<Tags['items']>().toEqualTypeOf<Tag[]>();
    });

    it('a list of optional items holds T | null for each item', () => {
      expectTypeOf<Scores['value']>().toEqualTypeOf<(number | null)[] | null>();
    });

    it('a required list takes and holds the item values', () => {
      expectTypeOf<ConstructorParameters<typeof ProductTags>>().toEqualTypeOf<[value: string[]]>();
      expectTypeOf<ProductTags['value']>().toEqualTypeOf<string[]>();
      expectTypeOf<ProductTags['validate']>().toEqualTypeOf<() => ValidationResult<string[]>>();
    });

    it('withItem and withoutItem return the same subclass', () => {
      expectTypeOf<ReturnType<ProductTags['withItem']>>().toEqualTypeOf<ProductTags>();
      expectTypeOf<ReturnType<HolidayDates['withoutItem']>>().toEqualTypeOf<HolidayDates>();
    });

    it('a required list does not accept missing values', () => {
      // @ts-expect-error a required list needs a value
      expect(() => new ProductTags()).toThrow(RequiredValueException);
      // @ts-expect-error a required list does not accept null
      expect(() => new ProductTags(null)).toThrow(RequiredValueException);
      // @ts-expect-error raw request text must be typed as unknown before converting it
      expect(new ProductTags('["ddd"]').value).toEqual(['ddd']);
    });

    it('optional tags cannot be used as a plain array', () => {
      // @ts-expect-error an optional list may be null
      const tags: string[] = new Tags(['ddd']).value;
      expect(tags).toEqual(['ddd']);
    });
  });

  describe('reading lists from requests', () => {
    it.each([
      ['a JSON body array', ['ddd', 'node'], ['ddd', 'node']],
      ['a query string with a JSON array', '["ddd","node"]', ['ddd', 'node']],
      ['numbers sent as tags', [2024, 42], ['2024', '42']],
      ['an empty list', [], []],
    ])('converts %s item by item', (_, input, expected) => {
      expect(new Tags(input as unknown as string[]).value).toEqual(expected);
    });

    it('converts scores sent as text into numbers', () => {
      expect(new Scores(['9.5', ' 7 ', 10] as unknown as number[]).value).toEqual([9.5, 7, 10]);
    });

    it('keeps a missing optional score as null', () => {
      expect(new Scores([9, null, '  '] as unknown as number[]).value).toEqual([9, null, null]);
    });

    it('converts every holiday into an immutable UTC date', () => {
      const holidays = new HolidayDates(['2024-12-25', NEW_YEAR] as unknown as Date[]);
      expect(holidays.value?.map((date) => date.toISOString())).toEqual([CHRISTMAS, NEW_YEAR]);
      expect(() => holidays.value?.[0].setUTCDate(26)).toThrow(TypeError);
    });

    it.each([
      ['a single tag that is not a list', 'ddd', '"ddd"'],
      ['a JSON object', '{"a":1}', '"{"a":1}"'],
      ['a number', 18, '18'],
      ['a boolean', true, 'true'],
      ['an object', { tag: 'ddd' }, '{"tag":"ddd"}'],
    ])('rejects %s', (_, input, received) => {
      const create = () => new Tags(input as unknown as string[]);
      expect(create).toThrow(TypePrimitiveException);
      expect(create).toThrow(`Validation Error: Expected a valid Array, but received ${received}.`);
    });

    it('rejects a list with an item that cannot be converted, naming the item', () => {
      expect(() => new Tags(['ddd', { name: 'node' }] as unknown as string[])).toThrow(
        'Validation Error: Expected a valid String, but received {"name":"node"}.',
      );
    });

    it('rejects a list with a missing required item, naming the item type', () => {
      expect(() => new Tags(['ddd', null] as unknown as string[])).toThrow(
        'Validation Error: Tag is required, but received null.',
      );
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['an empty field', ''],
      ['a field with only spaces', '   '],
    ])('a product without tags (%s) holds null', (_, input) => {
      expect(new Tags(input as unknown as string[]).value).toBeNull();
    });

    it('a product without tags can be created with no value', () => {
      expect(new Tags().isNull).toBe(true);
    });

    it('a required list refuses a missing value but accepts an empty one', () => {
      expect(() => new ProductTags(null as unknown as string[])).toThrow(
        'Validation Error: ProductTags is required, but received null.',
      );
      expect(new ProductTags([]).value).toEqual([]);
    });
  });

  describe('items', () => {
    it('are the tag value objects of the list, in order', () => {
      const items = new Tags(['ddd', 'node']).items;
      expect(items).toHaveLength(2);
      expect(items[0]).toBeInstanceOf(Tag);
      expect(items.map((item) => item.value)).toEqual(['ddd', 'node']);
    });

    it('are empty for a product without tags', () => {
      expect(new Tags(null).items).toEqual([]);
    });
  });

  describe('hasItem', () => {
    it('finds a tag by its converted value', () => {
      const tags = new Tags(['2024', 'node']);
      expect(tags.hasItem('node')).toBe(true);
      expect(tags.hasItem(2024 as unknown as string)).toBe(true);
      expect(tags.hasItem('deno')).toBe(false);
    });

    it('finds a holiday date by value, not by reference', () => {
      const holidays = new HolidayDates([new Date(CHRISTMAS)]);
      expect(holidays.hasItem(new Date(CHRISTMAS))).toBe(true);
      expect(holidays.hasItem('2024-12-25' as unknown as Date)).toBe(true);
      expect(holidays.hasItem(new Date(NEW_YEAR))).toBe(false);
    });

    it('finds nothing in a product without tags', () => {
      expect(new Tags(null).hasItem('ddd')).toBe(false);
    });
  });

  describe('withItem', () => {
    it('adding a tag returns a new Tags and leaves the original untouched (shared by two aggregates)', () => {
      const shared = new Tags(['ddd']);
      const firstProduct = { tags: shared };
      const secondProduct = { tags: shared };

      firstProduct.tags = firstProduct.tags.withItem('node');

      expect(firstProduct.tags).not.toBe(shared);
      expect(firstProduct.tags).toBeInstanceOf(Tags);
      expect(firstProduct.tags.value).toEqual(['ddd', 'node']);
      expect(secondProduct.tags.value).toEqual(['ddd']);
    });

    it('keeps the subclass, so its validations keep applying', () => {
      const tags = new LimitedTags(['a1', 'b2', 'c3']).withItem('d4');
      expect(tags).toBeInstanceOf(LimitedTags);
      expect(tags.validate().errors).toEqual([
        { custom: 'atMostThree', message: 'A product has at most 3 tags' },
      ]);
    });

    it('starts the list for a product without tags', () => {
      expect(new Tags(null).withItem('ddd').value).toEqual(['ddd']);
    });

    it('converts the added item like the constructor does', () => {
      expect(new Scores([9]).withItem('7.5' as unknown as number).value).toEqual([9, 7.5]);
    });

    it('appends even when the tag is already there; check hasItem first to keep tags unique', () => {
      const tags = new Tags(['ddd']);
      expect(tags.withItem('ddd').value).toEqual(['ddd', 'ddd']);
      expect((tags.hasItem('ddd') ? tags : tags.withItem('ddd')).value).toEqual(['ddd']);
    });

    it('throws for a tag that cannot be converted and leaves the original list untouched', () => {
      const tags = new Tags(['ddd']);
      expect(() => tags.withItem({} as unknown as string)).toThrow(TypePrimitiveException);
      expect(tags.value).toEqual(['ddd']);
    });

    it('keeps a required list required', () => {
      const tags = new ProductTags(['ddd']).withItem('node');
      expect(tags).toBeInstanceOf(ProductTags);
      expect(tags.value).toEqual(['ddd', 'node']);
    });

    it('returns a frozen list', () => {
      expect(Object.isFrozen(new Tags(['ddd']).withItem('node').value)).toBe(true);
    });
  });

  describe('withoutItem', () => {
    it('removing a holiday by its ISO date removes it', () => {
      const holidays = new HolidayDates([new Date(CHRISTMAS), new Date(NEW_YEAR)]);
      const withoutChristmas = holidays.withoutItem('2024-12-25' as unknown as Date);
      expect(withoutChristmas.value?.map((date) => date.toISOString())).toEqual([NEW_YEAR]);
      expect(holidays.value).toHaveLength(2);
    });

    it('removes every occurrence of a repeated tag', () => {
      expect(new Tags(['ddd', 'node', 'ddd']).withoutItem('ddd').value).toEqual(['node']);
    });

    it('returns an equal list when the tag is not there', () => {
      const tags = new Tags(['ddd']);
      const same = tags.withoutItem('deno');
      expect(same).not.toBe(tags);
      expect(same.equals(tags)).toBe(true);
    });

    it('removing the last tag leaves an empty list, not a missing one', () => {
      expect(new ProductTags(['ddd']).withoutItem('ddd').value).toEqual([]);
    });

    it('on a product without tags returns the same value object, still without tags', () => {
      const tags = new Tags(null);
      expect(tags.withoutItem('ddd')).toBe(tags);
      expect(tags.value).toBeNull();
    });

    it('throws for a tag that cannot be converted', () => {
      expect(() => new Tags(['ddd']).withoutItem('')).toThrow(RequiredValueException);
    });
  });

  describe('immutability', () => {
    it('holds a copy, so the request body changing later does not reach it', () => {
      const body = ['ddd', 'node'];
      const tags = new Tags(body);
      body.push('deno');
      expect(tags.value).not.toBe(body);
      expect(tags.value).toEqual(['ddd', 'node']);
    });

    it('a handler cannot push into or overwrite the held list', () => {
      const value = new Tags(['ddd']).value as string[];
      expect(Object.isFrozen(value)).toBe(true);
      expect(() => value.push('node')).toThrow(TypeError);
      expect(() => {
        value[0] = 'node';
      }).toThrow(TypeError);
    });

    it('has no in-place mutators', () => {
      const tags = new Tags(['ddd']);
      expect('addItem' in tags).toBe(false);
      expect('setItem' in tags).toBe(false);
      expect('removeItem' in tags).toBe(false);
    });
  });

  describe('equals', () => {
    it('two products with the same tags in the same order have equal tags', () => {
      expect(new Tags(['ddd', 'node']).equals(new Tags(['ddd', 'node']))).toBe(true);
    });

    it('the order of the tags matters', () => {
      expect(new Tags(['ddd', 'node']).equals(new Tags(['node', 'ddd']))).toBe(false);
    });

    it('two holiday calendars with the same dates are equal', () => {
      expect(
        new HolidayDates([new Date(CHRISTMAS)]).equals(
          new HolidayDates(['2024-12-25'] as unknown as Date[]),
        ),
      ).toBe(true);
    });

    it('tags and limited tags are different types', () => {
      expect(new Tags(['ddd']).equals(new LimitedTags(['ddd']))).toBe(false);
    });
  });

  describe('text and JSON', () => {
    it.each([
      ['a product with tags', new Tags(['ddd', 'node']), false, 'ddd, node'],
      ['a product with an empty list', new Tags([]), false, ''],
      ['a product without tags', new Tags(null), true, ''],
    ])('%s → isNull %s, toString() %o', (_, tags, isNull, text) => {
      expect(tags.isNull).toBe(isNull);
      expect(tags.toString()).toBe(text);
    });

    it('prints holidays as ISO dates in a message', () => {
      const holidays = new HolidayDates([new Date(CHRISTMAS), new Date(NEW_YEAR)]);
      expect(`Closed on ${holidays}`).toBe(`Closed on ${CHRISTMAS}, ${NEW_YEAR}`);
    });

    it('serializes as a plain JSON array', () => {
      expect(
        JSON.stringify({
          tags: new Tags(['ddd']),
          holidays: new HolidayDates([new Date(CHRISTMAS)]),
          scores: new Scores(null),
        }),
      ).toBe(`{"tags":["ddd"],"holidays":["${CHRISTMAS}"],"scores":null}`);
    });
  });

  describe('validate', () => {
    it('a list of valid tags is valid', () => {
      expect(new Tags(['ddd', 'node']).validate()).toEqual({
        ok: true,
        value: ['ddd', 'node'],
        errors: [],
      });
    });

    it('reports each invalid tag with its position', () => {
      expect(new Tags(['ddd', 'x', 'node', 'averyverylongtag']).validate()).toEqual({
        ok: false,
        value: ['ddd', 'x', 'node', 'averyverylongtag'],
        errors: [
          { validator: 'isLength', message: 'Item 2: A tag has 2 to 12 letters' },
          { validator: 'isLength', message: 'Item 4: A tag has 2 to 12 letters' },
        ],
      });
    });

    it('reports the rules of the list before the errors of its tags', () => {
      expect(new LimitedTags(['a1', 'x', 'c3', 'd4']).validate().errors).toEqual([
        { custom: 'atMostThree', message: 'A product has at most 3 tags' },
        { validator: 'isLength', message: 'Item 2: A tag has 2 to 12 letters' },
      ]);
    });

    it('runs the list rules on an empty list', () => {
      const hasTags = vi.fn((value: unknown) => Array.isArray(value) && value.length > 0);

      @Validations([{ custom: 'hasTags', fn: hasTags, message: 'Add at least one tag' }])
      class NonEmptyTags extends Tags {}

      expect(new NonEmptyTags([]).validate().errors).toEqual([
        { custom: 'hasTags', message: 'Add at least one tag' },
      ]);
      expect(new NonEmptyTags(null).validate()).toEqual({ ok: true, value: null, errors: [] });
      expect(hasTags).toHaveBeenCalledTimes(1);
    });

    it('returns a frozen result when a tag is invalid', () => {
      const result = new Tags(['x']).validate();
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.errors)).toBe(true);
      expect(Object.isFrozen(result.errors[0])).toBe(true);
    });

    it('assertValid throws ValidationException listing the invalid tags', () => {
      expect(() => new ProductTags(['ddd', 'x']).assertValid()).toThrow(ValidationException);
      expect(() => new ProductTags(['ddd', 'x']).assertValid()).toThrow(
        'Validation failed, ProductTags: Item 2: A tag has 2 to 12 letters',
      );
    });

    it('assertValid returns the same list when every tag is valid', () => {
      const tags = new ProductTags(['ddd']);
      expect(tags.assertValid()).toBe(tags);
    });
  });
});
