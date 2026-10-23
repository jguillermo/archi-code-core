import { Specification } from '../../../../ddd/domain';
import type { Order } from './order';
import { Sku } from './order-line';

export class SubtotalAtLeast extends Specification<Order> {
  constructor(private readonly cents: number) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.subtotal().isAtLeast(this.cents);
  }
}

export class ContainsSku extends Specification<Order> {
  constructor(private readonly sku: Sku) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.lines.some((line) => line.sku.equals(this.sku));
  }
}

export class FreeShippingEligible extends Specification<Order> {
  private readonly rule = new SubtotalAtLeast(5000)
    .or(new ContainsSku(new Sku('PREMIUM-PASS')))
    .and(new ContainsSku(new Sku('GIFT-CARD')).not());

  isSatisfiedBy(order: Order): boolean {
    return this.rule.isSatisfiedBy(order);
  }
}
