import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Validations } from '@archi-code/validation';
import type { ValidationResult } from '@archi-code/validation';
import { NumberType } from '../../../src/domain/type/number-type';
import { AbstractType } from '../../../src/domain/type/abstract-type';
import { Required } from '../../../src/domain/type/required/required';
import { TypePrimitiveException } from '../../../src/exceptions/domain/type-primitive.exception';
import { RequiredValueException } from '../../../src/exceptions/domain/required-value.exception';
import { ValidationException } from '../../../src/exceptions/domain/validation.exception';

class ProductPrice extends Required(NumberType) {}
class DiscountPercent extends NumberType {}
class ShippingWeight extends NumberType {}

@Validations([{ validator: 'isInt', properties: { min: 1 } }])
class Quantity extends Required(NumberType) {}

const requestInputs: [string, unknown, number][] = [
  ['a zero from a JSON body', 0, 0],
  ['a whole number from a JSON body', 1, 1],
  ['a negative number from a JSON body', -1, -1],
  ['a decimal from a JSON body', 1.5, 1.5],
  ['a negative decimal from a JSON body', -1.5, -1.5],
  ['"0" from a query string', '0', 0],
  ['"1" from a query string', '1', 1],
  ['"-1.5" from a query string', '-1.5', -1.5],
  ['" 2 " pasted with spaces', ' 2 ', 2],
  ['".5" typed without the leading zero', '.5', 0.5],
  ['"1e3" in scientific notation', '1e3', 1000],
];

const blankFormFields: [string, unknown][] = [
  ['a field sent as null', null],
  ['a field left out of the request', undefined],
  ['an empty number box', ''],
  ['a number box with only spaces', '   '],
];

const brokenClientInputs: [string, unknown, string][] = [
  ['a word', 'abc', '"abc"'],
  ['a decimal comma', '1,5', '"1,5"'],
  ['a hexadecimal text', '0x10', '"0x10"'],
  ['a text that overflows a double', '1e400', '"1e400"'],
  ['NaN', NaN, 'NaN'],
  ['Infinity', Infinity, 'Infinity'],
  ['-Infinity', -Infinity, '-Infinity'],
  ['a boolean', true, 'true'],
  ['an object', { a: 1 }, '{"a":1}'],
  ['an empty list', [], '[]'],
  ['a Date', new Date('2020-01-01T00:00:00.000Z'), 'Date(2020-01-01T00:00:00.000Z)'],
  ['a BigInt', BigInt(10), '10'],
];

function primitiveError(received: string): string {
  return `Validation Error: Expected a valid Number, but received ${received}.`;
}

function requiredError(typeName: string, received: string): string {
  return `Validation Error: ${typeName} is required, but received ${received}.`;
}

function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}

function positiveAmounts() {
  const isPositive = vi.fn((value: unknown) => typeof value === 'number' && value > 0);

  @Validations([{ custom: 'isPositive', fn: isPositive }])
  class TipAmount extends NumberType {}

  @Validations([{ custom: 'isPositive', fn: isPositive }])
  class OrderTotal extends Required(NumberType) {}

  return { TipAmount, OrderTotal, isPositive };
}

function issuesOf(build: () => unknown): unknown {
  return (thrownBy(build) as ValidationException).errors;
}

const isPositiveBroken = (type: string) => [
  { field: null, message: `${type}: Value does not satisfy isPositive` },
];

describe('NumberType', () => {
  describe('an optional discount percent', () => {
    it('is typed as number | null, built from a number, null or nothing', () => {
      expectTypeOf<DiscountPercent>().toMatchTypeOf<AbstractType<number>>();
      expectTypeOf<ConstructorParameters<typeof DiscountPercent>>().toEqualTypeOf<
        [value?: number | null]
      >();
      expectTypeOf<DiscountPercent['value']>().toEqualTypeOf<number | null>();
      expectTypeOf<DiscountPercent['validate']>().toEqualTypeOf<
        () => ValidationResult<number | null>
      >();
    });

    it('cannot be used in arithmetic without checking for null', () => {
      // @ts-expect-error an optional value may be null
      const percent: number = new DiscountPercent(1).value;
      expect(percent).toBe(1);
    });

    it.each(requestInputs)('turns %s into a number', (_, input, expected) => {
      expect(new DiscountPercent(input as number).value).toBe(expected);
      expect(new DiscountPercent(input as number).validate()).toEqual({
        ok: true,
        value: expected,
        errors: [],
      });
    });

    it.each(blankFormFields)('stores %s as null and is valid', (_, input) => {
      expect(new DiscountPercent(input as number).value).toBeNull();
      expect(new DiscountPercent(input as number).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
    });

    it('is null when no discount is given', () => {
      expect(new DiscountPercent().value).toBeNull();
    });

    it.each(brokenClientInputs)(
      'rejects %s sent by a broken client with TypePrimitiveException',
      (_, input, received) => {
        const create = () => new DiscountPercent(input as number);
        expect(create).toThrow(TypePrimitiveException);
        expect(create).toThrow(primitiveError(received));
      },
    );
  });

  describe('a required product price', () => {
    it('is typed as number and built only from a number', () => {
      expectTypeOf<ConstructorParameters<typeof ProductPrice>>().toEqualTypeOf<[value: number]>();
      expectTypeOf<ProductPrice['value']>().toEqualTypeOf<number>();
      expectTypeOf<ProductPrice['validate']>().toEqualTypeOf<() => ValidationResult<number>>();
    });

    it('does not compile without a price, but still throws if one sneaks in at runtime', () => {
      // @ts-expect-error a required number needs a value
      expect(() => new ProductPrice()).toThrow(RequiredValueException);
      // @ts-expect-error a required number does not accept null
      expect(() => new ProductPrice(null)).toThrow(RequiredValueException);
      // @ts-expect-error a required number does not accept undefined
      expect(() => new ProductPrice(undefined)).toThrow(RequiredValueException);
      // @ts-expect-error a required number does not accept a string
      expect(new ProductPrice('1').value).toBe(1);
    });

    it.each(requestInputs)('turns %s into a price', (_, input, expected) => {
      expect(new ProductPrice(input as number).value).toBe(expected);
      expect(new ProductPrice(input as number).validate()).toEqual({
        ok: true,
        value: expected,
        errors: [],
      });
    });

    it.each(blankFormFields)(
      'rejects %s with a RequiredValueException naming the type',
      (_, input) => {
        const received = typeof input === 'string' ? `"${input}"` : 'null';
        const create = () => new ProductPrice(input as number);
        expect(create).toThrow(RequiredValueException);
        expect(create).toThrow(requiredError('ProductPrice', received));
      },
    );

    it('rejects a price written as a word with TypePrimitiveException', () => {
      expect(() => new ProductPrice('abc' as unknown as number)).toThrow(primitiveError('"abc"'));
    });

    it('does not make the plain NumberType required', () => {
      expect(new NumberType(null).validate()).toEqual({ ok: true, value: null, errors: [] });
    });
  });

  describe('amounts that must be positive', () => {
    it('an optional tip accepts a positive amount and refuses a negative one', () => {
      const { TipAmount } = positiveAmounts();
      expect(new TipAmount(1).validate()).toEqual({ ok: true, value: 1, errors: [] });
      expect(issuesOf(() => new TipAmount(-1))).toEqual(isPositiveBroken('TipAmount'));
    });

    it.each(blankFormFields)('a tip left as %s is valid without running the rule', (_, input) => {
      const { TipAmount, isPositive } = positiveAmounts();
      expect(new TipAmount(input as number).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
      expect(isPositive).not.toHaveBeenCalled();
    });

    it('a required order total of zero is present but cannot be built', () => {
      const { OrderTotal } = positiveAmounts();
      expect(new OrderTotal(1).validate()).toEqual({ ok: true, value: 1, errors: [] });
      expect(issuesOf(() => new OrderTotal(0))).toEqual(isPositiveBroken('OrderTotal'));
    });
  });

  describe('an order quantity checked before adding a line to the cart', () => {
    it('a quantity "3" from a query string becomes 3 and passes', () => {
      const quantity = new Quantity('3' as unknown as number);
      expect(quantity.value).toBe(3);
    });

    it('a fractional quantity throws ValidationException listing the error', () => {
      const addLine = () => new Quantity(1.5);
      expect(addLine).toThrow(ValidationException);
      expect(addLine).toThrow('Validation failed, Quantity: Value does not satisfy isInt');
      expect(issuesOf(addLine)).toEqual([
        { field: null, message: 'Quantity: Value does not satisfy isInt' },
      ]);
    });
  });

  describe('comparing amounts', () => {
    it('two prices of 9.99 are equal, whether they came as text or number', () => {
      expect(new ProductPrice(9.99).equals(new ProductPrice('9.99' as unknown as number))).toBe(
        true,
      );
    });

    it('two different prices are not equal', () => {
      expect(new ProductPrice(9.99).equals(new ProductPrice(10))).toBe(false);
    });

    it('a discount and a shipping weight with the same number are not equal', () => {
      expect(new DiscountPercent(5).equals(new ShippingWeight(5))).toBe(false);
    });

    it('two missing discounts are equal', () => {
      expect(new DiscountPercent(null).equals(new DiscountPercent())).toBe(true);
    });
  });

  describe('showing and serializing an amount', () => {
    it.each([
      ['a decimal price', new ProductPrice(-1.5), '-1.5'],
      ['a zero discount', new DiscountPercent(0), '0'],
      ['a missing discount', new DiscountPercent(null), ''],
    ])('toString() of %s gives %o', (_, amount, text) => {
      expect(amount.toString()).toBe(text);
    });

    it('can be used in a template literal for a receipt line', () => {
      expect(`Total: ${new ProductPrice(12.5)} EUR`).toBe('Total: 12.5 EUR');
    });

    it('serializes to its plain value inside an API response', () => {
      expect(
        JSON.stringify({ price: new ProductPrice(12.5), discount: new DiscountPercent() }),
      ).toBe('{"price":12.5,"discount":null}');
    });
  });
});
