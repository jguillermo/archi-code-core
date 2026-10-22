import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Validations } from '@archi-code/validation';
import { Composite } from '../../../../src/domain/type/composite/composite';
import type {
  CompositeInput,
  CompositePrimitives,
  CompositeProps,
} from '../../../../src/domain/type/composite/composite';
import { ValueObjectBuilder } from '../../../../src/application/value-object-builder/value-object-builder';
import { DateType } from '../../../../src/domain/type/date-type';
import { NumberType } from '../../../../src/domain/type/number-type';
import { StringType } from '../../../../src/domain/type/string-type';
import { Required } from '../../../../src/domain/type/required/required-type';
import type { PrimitiveTypes } from '../../../../src/domain/primitive/primitive-types';
import { RequiredValueException } from '../../../../src/exceptions/domain/required-value.exception';
import { TypePrimitiveException } from '../../../../src/exceptions/domain/type-primitive.exception';
import { ValidationException } from '../../../../src/exceptions/domain/validation.exception';

@Validations([{ validator: 'isInt', message: 'An amount is a whole number of cents' }])
class Cents extends Required(NumberType) {}

@Validations([{ validator: 'isIn', properties: { values: ['EUR', 'USD'] } }])
class Currency extends Required(StringType) {}

class Money extends Composite({ amount: Cents, currency: Currency }) {
  static of(cents: number, currency: string): Money {
    return new Money({ amount: new Cents(cents), currency: new Currency(currency) });
  }

  add(other: Money): Money {
    return new Money({
      amount: new Cents(this.amount.value + other.amount.value),
      currency: this.currency,
    });
  }

  times(units: number): Money {
    return new Money({ amount: new Cents(this.amount.value * units), currency: this.currency });
  }
}

class Price extends Composite({ amount: Cents, currency: Currency }) {}

class StartDate extends Required(DateType) {}
class EndDate extends Required(DateType) {}

@Validations([
  {
    custom: 'endsAfterItStarts',
    fn: (range) => {
      const { start, end } = range as DateRange;
      return end.value >= start.value;
    },
    message: 'A promotion cannot end before it starts',
  },
])
class DateRange extends Composite({ start: StartDate, end: EndDate }) {
  contains(moment: Date): boolean {
    return moment >= this.start.value && moment <= this.end.value;
  }
}

class Sku extends Required(StringType) {}

@Validations([{ validator: 'isInt', properties: { min: 1, max: 20 }, message: 'From 1 to 20' }])
class Units extends Required(NumberType) {}

class OrderLine extends Composite({ sku: Sku, units: Units, unitPrice: Money }) {
  subtotal(): Money {
    return this.unitPrice.times(this.units.value);
  }
}

@Validations([
  {
    custom: 'oneCurrency',
    fn: (cart) =>
      new Set((cart as Cart).lines.map((line) => line.unitPrice.currency.value)).size <= 1,
    message: 'A cart is paid in one currency',
  },
])
class Cart extends Composite({ lines: [OrderLine], note: StringType }) {}

class Tag extends Required(StringType) {}
class Labels extends Composite({ tags: [Tag] }) {}

function issuesOf(build: () => unknown): unknown {
  try {
    build();
  } catch (error) {
    return (error as ValidationException).errors;
  }
  return undefined;
}

function thrownBy(build: () => unknown): unknown {
  try {
    build();
  } catch (error) {
    return error;
  }
  return undefined;
}

const torch = { sku: 'TORCH-01', units: 2, unitPrice: { amount: 1250, currency: 'EUR' } };
const mask = { sku: 'MASK-02', units: 1, unitPrice: { amount: 3999, currency: 'EUR' } };

describe('Composite: a value object made of several value objects', () => {
  describe('typing', () => {
    it('exposes every field of the schema as its value object, read-only', () => {
      expectTypeOf<Money['amount']>().toEqualTypeOf<Cents>();
      expectTypeOf<Money['currency']>().toEqualTypeOf<Currency>();
      expectTypeOf<OrderLine['unitPrice']>().toEqualTypeOf<Money>();
      expectTypeOf<Cart['lines']>().toEqualTypeOf<OrderLine[]>();
      const money = Money.of(100, 'EUR');
      // @ts-expect-error the fields of a value object cannot be reassigned
      expect(() => (money.amount = new Cents(1))).toThrow(TypeError);
    });

    it('is built from value objects, never from raw values', () => {
      expectTypeOf<ConstructorParameters<typeof Money>>().toEqualTypeOf<
        [props: CompositeProps<{ amount: typeof Cents; currency: typeof Currency }>]
      >();
      // @ts-expect-error raw numbers are not value objects
      expect(() => new Money({ amount: 100, currency: 'EUR' })).toThrow(TypePrimitiveException);
    });

    it('describes its primitives from its fields, nested composites and lists included', () => {
      expectTypeOf<
        CompositePrimitives<{ amount: typeof Cents; currency: typeof Currency }>
      >().toEqualTypeOf<{ amount: number; currency: string }>();
      expectTypeOf<ReturnType<OrderLine['toPrimitives']>>().toEqualTypeOf<{
        sku: string;
        units: number;
        unitPrice: { amount: number; currency: string };
      }>();
      expectTypeOf<ReturnType<Cart['toPrimitives']>>().toEqualTypeOf<{
        lines: { sku: string; units: number; unitPrice: { amount: number; currency: string } }[];
        note: string | null;
      }>();
      expectTypeOf<ReturnType<DateRange['toPrimitives']>>().toEqualTypeOf<{
        start: Date;
        end: Date;
      }>();
    });

    it('matches what PrimitiveTypes gives an aggregate field that holds it', () => {
      expectTypeOf<PrimitiveTypes<{ readonly price: Money }>>().toEqualTypeOf<{
        price: { amount: number; currency: string };
      }>();
    });

    it('fromPrimitives returns the subclass it is called on', () => {
      expectTypeOf(Money.fromPrimitives({ amount: 1, currency: 'EUR' })).toEqualTypeOf<Money>();
      expectTypeOf(Price.fromPrimitives({ amount: 1, currency: 'EUR' })).toEqualTypeOf<Price>();
    });

    it('fromPrimitives takes what each field accepts: a date range straight from a JSON body', () => {
      const body = { start: '2026-03-20', end: '2026-06-20T00:00:00Z' };
      expectTypeOf<Parameters<typeof DateRange.fromPrimitives>[0]>().toEqualTypeOf<
        CompositeInput<{ start: typeof StartDate; end: typeof EndDate }>
      >();
      expectTypeOf<CompositeInput<{ start: typeof StartDate }>>().toEqualTypeOf<{
        start: Date | string;
      }>();
      expect(DateRange.fromPrimitives(body).toPrimitives()).toEqual({
        start: new Date('2026-03-20T00:00:00.000Z'),
        end: new Date('2026-06-20T00:00:00.000Z'),
      });
      // @ts-expect-error an epoch number is not a date
      expect(() => DateRange.fromPrimitives({ start: 1, end: 2 })).toThrow(ValidationException);
    });
  });

  describe('building one', () => {
    it('keeps each value object and offers the behavior of its class', () => {
      const total = Money.of(1250, 'EUR').add(Money.of(750, 'EUR'));
      expect(total).toBeInstanceOf(Money);
      expect(total.amount.value).toBe(2000);
      expect(total.currency.value).toBe('EUR');
    });

    it('never changes: operations return a new value', () => {
      const price = Money.of(1250, 'EUR');
      const doubled = price.times(2);
      expect(doubled.amount.value).toBe(2500);
      expect(price.amount.value).toBe(1250);
      expect(Object.isFrozen(price)).toBe(true);
    });

    it('holds only its fields: they are what spreads and mappers see', () => {
      expect(Object.keys(Money.of(1250, 'EUR'))).toEqual(['amount', 'currency']);
      expect(Object.keys(DateRange.fromPrimitives(spring()))).toEqual(['start', 'end']);
    });

    it('freezes the lists it holds', () => {
      const cart = Cart.fromPrimitives({ lines: [torch], note: null });
      expect(Object.isFrozen(cart.lines)).toBe(true);
      expect(() => (cart.lines as OrderLine[]).push(cart.lines[0])).toThrow(TypeError);
    });

    it('refuses a missing field, naming the composite and the field', () => {
      const build = () => new Money({ amount: new Cents(100) } as unknown as Money);
      expect(build).toThrow(RequiredValueException);
      expect(build).toThrow(
        'Validation Error: Money.currency is required, but received undefined.',
      );
    });

    it('refuses a value object of another class, even with the same shape', () => {
      const build = () =>
        new Money({ amount: new Cents(100), currency: new Sku('EUR') as unknown as Currency });
      expect(build).toThrow(TypePrimitiveException);
      expect(build).toThrow('Expected a valid Currency for Money.currency, but received');
    });

    it('refuses a list field that is not a list, and an item of another class', () => {
      expect(
        () => new Cart({ lines: 'TORCH-01' as unknown as OrderLine[], note: new StringType() }),
      ).toThrow('Expected a valid list for Cart.lines');
      expect(
        () =>
          new Cart({
            lines: [Money.of(1, 'EUR') as unknown as OrderLine],
            note: new StringType(),
          }),
      ).toThrow('Expected a valid OrderLine for Cart.lines.0');
    });
  });

  describe('rules over several fields with @Validations', () => {
    it('a promotion that ends before it starts cannot be built', () => {
      const build = () =>
        new DateRange({
          start: new StartDate(new Date('2026-06-20T00:00:00Z')),
          end: new EndDate(new Date('2026-03-20T00:00:00Z')),
        });
      expect(build).toThrow(ValidationException);
      expect(issuesOf(build)).toEqual([
        {
          field: null,
          code: 'endsAfterItStarts',
          message: 'DateRange: A promotion cannot end before it starts',
        },
      ]);
    });

    it('a valid promotion answers questions about its dates', () => {
      const promotion = DateRange.fromPrimitives(spring());
      expect(promotion.contains(new Date('2026-05-01T00:00:00Z'))).toBe(true);
      expect(promotion.contains(new Date('2026-07-01T00:00:00Z'))).toBe(false);
    });

    it('runs the rules once its fields are valid, with the built composite', () => {
      const rule = vi.fn(() => true);

      @Validations([{ custom: 'checked', fn: rule }])
      class Checked extends Composite({ amount: Cents }) {}

      const checked = new Checked({ amount: new Cents(5) });
      expect(rule).toHaveBeenCalledTimes(1);
      expect(rule).toHaveBeenCalledWith(checked);
    });

    it('does not run the rules when a field is wrong', () => {
      const rule = vi.fn(() => true);

      @Validations([{ custom: 'checked', fn: rule }])
      class Checked extends Composite({ amount: Cents }) {}

      expect(() => Checked.fromPrimitives({ amount: 'five' as unknown as number })).toThrow(
        ValidationException,
      );
      expect(rule).not.toHaveBeenCalled();
    });

    it('a cart mixing currencies breaks its rule', () => {
      const dollars = { ...mask, unitPrice: { amount: 3999, currency: 'USD' } };
      expect(issuesOf(() => Cart.fromPrimitives({ lines: [torch, dollars], note: null }))).toEqual([
        { field: null, code: 'oneCurrency', message: 'Cart: A cart is paid in one currency' },
      ]);
    });
  });

  describe('fromPrimitives: rebuilding it from stored or received data', () => {
    it('builds every field, nested composites and lists included', () => {
      const cart = Cart.fromPrimitives({ lines: [torch, mask], note: 'Leave it at the door' });
      expect(cart.lines).toHaveLength(2);
      expect(cart.lines[0]).toBeInstanceOf(OrderLine);
      expect(cart.lines[0].unitPrice).toBeInstanceOf(Money);
      expect(cart.lines[0].subtotal().amount.value).toBe(2500);
      expect(cart.note.value).toBe('Leave it at the door');
    });

    it('converts each primitive like the value objects do', () => {
      const promotion = DateRange.fromPrimitives({
        start: '2026-03-20' as unknown as Date,
        end: '2026-06-20T00:00:00Z' as unknown as Date,
      });
      expect(promotion.start.value.toISOString()).toBe('2026-03-20T00:00:00.000Z');
    });

    it('reports every invalid field at once, with the path of nested fields', () => {
      const broken = {
        lines: [
          torch,
          {
            sku: null as unknown as string,
            units: 30,
            unitPrice: { amount: 10.5, currency: 'GBP' },
          },
        ],
        note: null,
      };
      const rebuild = () => Cart.fromPrimitives(broken);
      expect(rebuild).toThrow(ValidationException);
      expect(issuesOf(rebuild)).toEqual([
        {
          field: 'lines.1.sku',
          code: 'DOM004',
          message: 'Validation Error: Sku is required, but received null.',
        },
        { field: 'lines.1.units', code: 'isInt', message: 'Units: From 1 to 20' },
        {
          field: 'lines.1.unitPrice.amount',
          code: 'isInt',
          message: 'Cents: An amount is a whole number of cents',
        },
        {
          field: 'lines.1.unitPrice.currency',
          code: 'isIn',
          message: 'Currency: Value does not satisfy isIn',
        },
      ]);
    });

    it('reports a missing field by its name', () => {
      expect(issuesOf(() => Money.fromPrimitives({ amount: 100 } as never))).toEqual([
        {
          field: 'currency',
          code: 'DOM004',
          message: 'Validation Error: Currency is required, but received null.',
        },
      ]);
    });

    it('reports a list field that is not a list', () => {
      expect(issuesOf(() => Labels.fromPrimitives({ tags: 'ddd' as unknown as string[] }))).toEqual(
        [
          {
            field: 'tags',
            code: 'DOM003',
            message: 'Validation Error: Expected a valid Array, but received "ddd".',
          },
        ],
      );
    });

    it('lets an error that is not a domain error through untouched, it is a bug', () => {
      const outage = new Error('currency table unavailable');
      class CheckedCurrency extends Required(StringType) {
        protected filter(): string {
          throw outage;
        }
      }
      class Charge extends Composite({ amount: Cents, currency: CheckedCurrency }) {}
      expect(() => Charge.fromPrimitives({ amount: 1.5, currency: 'EUR' })).toThrow(outage);
    });

    it.each([
      ['null', null],
      ['a text', 'EUR 12.50'],
      ['a list', [1250, 'EUR']],
    ])('refuses %s instead of an object', (_, primitives) => {
      const rebuild = () => Money.fromPrimitives(primitives as never);
      expect(rebuild).toThrow(TypePrimitiveException);
      expect(rebuild).toThrow('Expected a valid Money');
    });

    it('nests in ValueObjectBuilder.build, so a command reports the path of every field', () => {
      expect(
        issuesOf(() =>
          ValueObjectBuilder.build({
            price: () => Money.fromPrimitives({ amount: 1.5, currency: 'EUR' }),
            promotion: () => DateRange.fromPrimitives(spring()),
          }),
        ),
      ).toEqual([
        {
          field: 'price.amount',
          code: 'isInt',
          message: 'Cents: An amount is a whole number of cents',
        },
      ]);
    });
  });

  describe('equals', () => {
    it('two prices with the same amount and currency are equal', () => {
      expect(Money.of(1250, 'EUR').equals(Money.of(1250, 'EUR'))).toBe(true);
    });

    it('a different amount or currency makes them different', () => {
      expect(Money.of(1250, 'EUR').equals(Money.of(1251, 'EUR'))).toBe(false);
      expect(Money.of(1250, 'EUR').equals(Money.of(1250, 'USD'))).toBe(false);
    });

    it('a Price and a Money with the same fields are different concepts', () => {
      expect(
        Money.of(1250, 'EUR').equals(Price.fromPrimitives({ amount: 1250, currency: 'EUR' })),
      ).toBe(false);
    });

    it('compares nested composites and lists by value', () => {
      const cart = () => Cart.fromPrimitives({ lines: [torch, mask], note: null });
      expect(cart().equals(cart())).toBe(true);
      expect(cart().equals(Cart.fromPrimitives({ lines: [mask, torch], note: null }))).toBe(false);
      expect(cart().equals(Cart.fromPrimitives({ lines: [torch], note: null }))).toBe(false);
    });

    it('compares dates by instant', () => {
      expect(
        DateRange.fromPrimitives(spring()).equals(
          DateRange.fromPrimitives({
            start: '2026-03-20T02:00:00+02:00' as unknown as Date,
            end: new Date('2026-06-20T00:00:00Z'),
          }),
        ),
      ).toBe(true);
    });

    it.each([
      ['null', null],
      ['its primitives', { amount: 1250, currency: 'EUR' }],
      ['a text', '12.50 EUR'],
    ])('is not equal to %s', (_, other) => {
      expect(Money.of(1250, 'EUR').equals(other)).toBe(false);
    });
  });

  describe('toPrimitives', () => {
    it('gives plain data for a repository, nested composites and lists included', () => {
      expect(Cart.fromPrimitives({ lines: [torch], note: null }).toPrimitives()).toEqual({
        lines: [torch],
        note: null,
      });
    });

    it('keeps dates as dates, like the primitives of an aggregate', () => {
      const primitives = DateRange.fromPrimitives(spring()).toPrimitives();
      expect(primitives.start).toBeInstanceOf(Date);
      expect(primitives.end.toISOString()).toBe('2026-06-20T00:00:00.000Z');
    });

    it('goes back and forth without losing anything', () => {
      const cart = Cart.fromPrimitives({ lines: [torch, mask], note: 'Gift' });
      expect(Cart.fromPrimitives(cart.toPrimitives()).equals(cart)).toBe(true);
    });
  });

  it('thrown errors are domain errors, so a use case lets them through', () => {
    expect(thrownBy(() => Money.of(1.5, 'EUR'))).toBeInstanceOf(ValidationException);
  });
});

function spring() {
  return {
    start: new Date('2026-03-20T00:00:00Z'),
    end: new Date('2026-06-20T00:00:00Z'),
  };
}
