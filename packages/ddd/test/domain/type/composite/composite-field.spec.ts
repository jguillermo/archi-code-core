import { describe, expect, it } from 'vitest';
import { CompositeField } from '../../../../src/domain/type/composite/composite-field';
import { Composite } from '../../../../src/domain/type/composite/composite';
import { NumberType } from '../../../../src/domain/type/number-type';
import { StringType } from '../../../../src/domain/type/string-type';
import { Required } from '../../../../src/domain/type/required/required-type';
import { RequiredValueException } from '../../../../src/exceptions/domain/required-value.exception';
import { TypePrimitiveException } from '../../../../src/exceptions/domain/type-primitive.exception';

class Cents extends Required(NumberType) {}
class Currency extends Required(StringType) {}
class Money extends Composite({ amount: Cents, currency: Currency }) {}

const cents = CompositeField.of(Cents);
const money = CompositeField.of(Money);
const centsList = CompositeField.of([Cents]);
const price = () => Money.fromPrimitives({ amount: 100, currency: 'EUR' });

describe('CompositeField: how a composite handles each field of its schema', () => {
  describe('accepting a value object for a field', () => {
    it('keeps a value object or a composite of the declared class', () => {
      const amount = new Cents(100);
      const unitPrice = price();
      expect(cents.accept('Money.amount', amount)).toBe(amount);
      expect(money.accept('Line.unitPrice', unitPrice)).toBe(unitPrice);
    });

    it('refuses a missing value and a value object of another class, naming the path', () => {
      expect(() => cents.accept('Money.amount', undefined)).toThrow(RequiredValueException);
      expect(() => cents.accept('Money.amount', new Currency('EUR'))).toThrow(
        'Expected a valid Cents for Money.amount',
      );
    });

    it('freezes a list and names the position of a wrong item', () => {
      expect(Object.isFrozen(centsList.accept('Order.discounts', [new Cents(1)]))).toBe(true);
      expect(() => centsList.accept('Order.discounts', new Cents(1))).toThrow(
        'Expected a valid list for Order.discounts',
      );
      expect(() => centsList.accept('Order.discounts', [new Cents(1), null])).toThrow(
        'Order.discounts.1 is required',
      );
    });
  });

  describe('rebuilding a field from its primitive', () => {
    it('builds a value object, a composite or a list of them', () => {
      expect(cents.fromPrimitive('100')).toEqual(new Cents(100));
      expect(money.fromPrimitive({ amount: 100, currency: 'EUR' })).toBeInstanceOf(Money);
      expect(centsList.fromPrimitive([1, 2])).toEqual([new Cents(1), new Cents(2)]);
    });

    it('refuses a list field whose primitive is not a list', () => {
      expect(() => centsList.fromPrimitive(1)).toThrow(TypePrimitiveException);
    });
  });

  describe('turning a field into its primitive', () => {
    it('gives the value of a value object, the primitives of a composite and a list of them', () => {
      expect(cents.toPrimitive(new Cents(100))).toBe(100);
      expect(money.toPrimitive(price())).toEqual({ amount: 100, currency: 'EUR' });
      expect(CompositeField.of([Money]).toPrimitive([price(), price()])).toEqual([
        { amount: 100, currency: 'EUR' },
        { amount: 100, currency: 'EUR' },
      ]);
    });
  });

  describe('comparing fields', () => {
    it('compares value objects and lists of them by value', () => {
      expect(cents.equals(new Cents(1), new Cents(1))).toBe(true);
      expect(centsList.equals([new Cents(1)], [new Cents(1)])).toBe(true);
      expect(centsList.equals([new Cents(1)], [new Cents(2)])).toBe(false);
      expect(centsList.equals([new Cents(1)], [new Cents(1), new Cents(1)])).toBe(false);
      expect(centsList.equals([new Cents(1)], new Cents(1))).toBe(false);
    });
  });
});
