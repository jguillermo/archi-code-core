import { Specification } from '../../../../ddd/domain';
import type { Order } from '../aggregate/Order';
import type { Sku } from '../value-object/Sku';

export class ContainsSku extends Specification<Order> {
  constructor(private readonly sku: Sku) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.lines.some((line) => line.sku.equals(this.sku));
  }
}
