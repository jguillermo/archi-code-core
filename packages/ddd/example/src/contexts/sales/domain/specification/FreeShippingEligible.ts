import { Specification } from '../../../../ddd/domain';
import { ContainsSku } from './ContainsSku';
import type { Order } from '../aggregate/Order';
import { Sku } from '../value-object/Sku';
import { SubtotalAtLeast } from './SubtotalAtLeast';

export class FreeShippingEligible extends Specification<Order> {
  private readonly rule = new SubtotalAtLeast(5000)
    .or(new ContainsSku(new Sku('PREMIUM-PASS')))
    .and(new ContainsSku(new Sku('GIFT-CARD')).not());

  isSatisfiedBy(order: Order): boolean {
    return this.rule.isSatisfiedBy(order);
  }
}
