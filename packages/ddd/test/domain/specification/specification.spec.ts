import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Specification } from '../../../src/domain/specification/specification';
import type { SatisfiedBy } from '../../../src/domain/specification/specification';

interface Order {
  readonly zone: 'PENINSULA' | 'ISLANDS';
  readonly totalCents: number;
  readonly skus: readonly string[];
}

class ShipsToThePeninsula extends Specification<Order> {
  isSatisfiedBy(order: Order): boolean {
    return order.zone === 'PENINSULA';
  }
}

class OrderAbove extends Specification<Order> {
  constructor(private readonly thresholdCents: number) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.totalCents >= this.thresholdCents;
  }
}

class InCentralStock extends Specification<Order> {
  constructor(private readonly stock: ReadonlySet<string>) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.skus.every((sku) => this.stock.has(sku));
  }
}

const centralStock = new Set(['TORCH-01', 'MASK-02']);

const madridTorch: Order = { zone: 'PENINSULA', totalCents: 6000, skus: ['TORCH-01'] };
const smallMadridTorch: Order = { zone: 'PENINSULA', totalCents: 2000, skus: ['TORCH-01'] };
const palmaTorch: Order = { zone: 'ISLANDS', totalCents: 6000, skus: ['TORCH-01'] };
const madridHelmet: Order = { zone: 'PENINSULA', totalCents: 6000, skus: ['HELMET-03'] };

describe('Specification: a business rule with a name that can be combined', () => {
  it('a named rule answers whether an order satisfies it', () => {
    expect(new ShipsToThePeninsula().isSatisfiedBy(madridTorch)).toBe(true);
    expect(new ShipsToThePeninsula().isSatisfiedBy(palmaTorch)).toBe(false);
  });

  describe('and: free express shipping needs every rule', () => {
    const freeExpress = new ShipsToThePeninsula()
      .and(new InCentralStock(centralStock))
      .and(new OrderAbove(5000));

    it.each([
      ['a large order to Madrid with stock', madridTorch, true],
      ['a small order', smallMadridTorch, false],
      ['an order to the islands', palmaTorch, false],
      ['an order without central stock', madridHelmet, false],
    ])('%s → %s', (_, order, expected) => {
      expect(freeExpress.isSatisfiedBy(order)).toBe(expected);
    });

    it('stops at the first rule that fails', () => {
      const stock = new InCentralStock(centralStock);
      const checkStock = vi.spyOn(stock, 'isSatisfiedBy');
      new ShipsToThePeninsula().and(stock).isSatisfiedBy(palmaTorch);
      expect(checkStock).not.toHaveBeenCalled();
    });
  });

  describe('or: a manual review is needed by any of the rules', () => {
    const needsReview = new OrderAbove(5000).or(new InCentralStock(centralStock).not());

    it.each([
      ['a large order', madridTorch, true],
      ['an order without central stock', { ...smallMadridTorch, skus: ['HELMET-03'] }, true],
      ['a small order with stock', smallMadridTorch, false],
    ])('%s → %s', (_, order, expected) => {
      expect(needsReview.isSatisfiedBy(order)).toBe(expected);
    });

    it('stops at the first rule that holds', () => {
      const stock = new InCentralStock(centralStock);
      const checkStock = vi.spyOn(stock, 'isSatisfiedBy');
      new OrderAbove(5000).or(stock).isSatisfiedBy(madridTorch);
      expect(checkStock).not.toHaveBeenCalled();
    });
  });

  describe('not: the opposite rule, with a name of its own', () => {
    it('an order to the islands does not ship to the peninsula', () => {
      const shipsToTheIslands = new ShipsToThePeninsula().not();
      expect(shipsToTheIslands.isSatisfiedBy(palmaTorch)).toBe(true);
      expect(shipsToTheIslands.isSatisfiedBy(madridTorch)).toBe(false);
      expect(shipsToTheIslands.not().isSatisfiedBy(madridTorch)).toBe(true);
    });
  });

  it('selects the orders of a list that satisfy the rule', () => {
    const peninsula = new ShipsToThePeninsula();
    expect(
      [madridTorch, palmaTorch, madridHelmet].filter((order) => peninsula.isSatisfiedBy(order)),
    ).toEqual([madridTorch, madridHelmet]);
  });

  it('combining returns a specification of the same candidate, so it keeps combining', () => {
    expectTypeOf(new ShipsToThePeninsula().and(new OrderAbove(1))).toEqualTypeOf<
      Specification<Order>
    >();
    expectTypeOf(new ShipsToThePeninsula().not().or)
      .parameter(0)
      .toEqualTypeOf<SatisfiedBy<Order>>();
  });

  it('combines with any rule that only answers isSatisfiedBy, such as a rule from another module', () => {
    const paidByCard: SatisfiedBy<Order> = { isSatisfiedBy: (order) => order.totalCents > 0 };
    const rule = new ShipsToThePeninsula().and(paidByCard).or(paidByCard);
    expect(rule.isSatisfiedBy(madridTorch)).toBe(true);
    expect(new ShipsToThePeninsula().and(paidByCard).isSatisfiedBy(palmaTorch)).toBe(false);
  });

  it('does not combine rules about different candidates', () => {
    class IsAdult extends Specification<{ age: number }> {
      isSatisfiedBy(person: { age: number }): boolean {
        return person.age >= 18;
      }
    }
    // @ts-expect-error a rule about people cannot be combined with a rule about orders
    expect(() => new ShipsToThePeninsula().and(new IsAdult())).not.toThrow();
  });
});
