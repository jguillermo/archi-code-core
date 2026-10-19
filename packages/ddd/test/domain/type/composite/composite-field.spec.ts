import { describe, expect, it, vi } from 'vitest';
import { CompositeField } from '../../../../src/domain/type/composite/composite-field';
import { Composite } from '../../../../src/domain/type/composite/composite';
import { NumberType } from '../../../../src/domain/type/number-type';
import { StringType } from '../../../../src/domain/type/string-type';
import { Required } from '../../../../src/domain/type/required/required';

class Cents extends Required(NumberType) {}
class Currency extends Required(StringType) {}
class Money extends Composite({ amount: Cents, currency: Currency }) {}

describe('CompositeField: how a composite handles each field of its schema', () => {
  describe('recognizing a composite', () => {
    it('recognizes a composite and its prototype, not a value object nor plain data', () => {
      const price = Money.fromPrimitives({ amount: 100, currency: 'EUR' });
      expect(CompositeField.isComposite(price)).toBe(true);
      expect(CompositeField.isComposite(Money.prototype)).toBe(true);
      expect(CompositeField.isComposite(new Cents(100))).toBe(false);
      expect(CompositeField.isComposite({ amount: 100, currency: 'EUR' })).toBe(false);
      expect(CompositeField.isComposite(null)).toBe(false);
      expect(CompositeField.isComposite('Money')).toBe(false);
    });

    it('recognizes a composite declared with another copy of the package (CJS and ESM builds)', async () => {
      vi.resetModules();
      const otherCopy = await import('../../../../src/domain/type/composite/composite');
      class OtherMoney extends otherCopy.Composite({ amount: Cents }) {}
      expect(CompositeField.isComposite(OtherMoney.fromPrimitives({ amount: 1 }))).toBe(true);
    });
  });

  describe('rebuilding a field from its primitive', () => {
    it('builds a value object, a composite or a list of them', () => {
      expect(CompositeField.fromPrimitive(Cents, '100')).toEqual(new Cents(100));
      expect(CompositeField.fromPrimitive(Money, { amount: 100, currency: 'EUR' })).toBeInstanceOf(
        Money,
      );
      expect(CompositeField.fromPrimitive([Cents], [1, 2])).toEqual([new Cents(1), new Cents(2)]);
    });
  });

  describe('turning a field into its primitive', () => {
    it('gives the value of a value object, the primitives of a composite and a list of them', () => {
      const price = Money.fromPrimitives({ amount: 100, currency: 'EUR' });
      expect(CompositeField.primitive(new Cents(100))).toBe(100);
      expect(CompositeField.primitive(price)).toEqual({ amount: 100, currency: 'EUR' });
      expect(CompositeField.primitive([price, price])).toEqual([
        { amount: 100, currency: 'EUR' },
        { amount: 100, currency: 'EUR' },
      ]);
    });
  });

  describe('comparing fields', () => {
    it('compares value objects and lists of them by value', () => {
      expect(CompositeField.equals(new Cents(1), new Cents(1))).toBe(true);
      expect(CompositeField.equals([new Cents(1)], [new Cents(1)])).toBe(true);
      expect(CompositeField.equals([new Cents(1)], [new Cents(2)])).toBe(false);
      expect(CompositeField.equals([new Cents(1)], new Cents(1))).toBe(false);
    });
  });
});
