import { describe, expect, it, vi } from 'vitest';
import { CompositeBrand } from '../../../../src/domain/type/composite/composite-brand';
import { Composite } from '../../../../src/domain/type/composite/composite';
import { NumberType } from '../../../../src/domain/type/number-type';
import { StringType } from '../../../../src/domain/type/string-type';
import { Required } from '../../../../src/domain/type/required/required-type';

class Cents extends Required(NumberType) {}
class Currency extends Required(StringType) {}
class Money extends Composite({ amount: Cents, currency: Currency }) {}

describe('CompositeBrand: recognizing a composite', () => {
  it('recognizes a composite and its prototype, not a value object nor plain data', () => {
    const price = Money.fromPrimitives({ amount: 100, currency: 'EUR' });
    expect(CompositeBrand.isComposite(price)).toBe(true);
    expect(CompositeBrand.isComposite(Money.prototype)).toBe(true);
    expect(CompositeBrand.isComposite(new Cents(100))).toBe(false);
    expect(CompositeBrand.isComposite({ amount: 100, currency: 'EUR' })).toBe(false);
    expect(CompositeBrand.isComposite(null)).toBe(false);
    expect(CompositeBrand.isComposite('Money')).toBe(false);
  });

  it('recognizes a composite declared with another copy of the package (CJS and ESM builds)', async () => {
    vi.resetModules();
    const otherCopy = await import('../../../../src/domain/type/composite/composite');
    class OtherMoney extends otherCopy.Composite({ amount: Cents }) {}
    expect(CompositeBrand.isComposite(OtherMoney.fromPrimitives({ amount: 1 }))).toBe(true);
  });

  it('marks a prototype without adding a visible field', () => {
    class Coupon {}
    CompositeBrand.mark(Coupon.prototype);
    expect(CompositeBrand.isComposite(new Coupon())).toBe(true);
    expect(Object.keys(new Coupon())).toEqual([]);
  });
});
