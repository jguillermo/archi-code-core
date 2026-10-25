import type { CouponCodes } from '../value-object/CouponCodes';
import { DiscountPercent } from '../value-object/DiscountPercent';
import type { CouponCatalog } from './CouponCatalog';
import { UnknownCoupon } from '../exception/UnknownCoupon';

export class OrderPricing {
  private static readonly MAX_DISCOUNT = 50;

  constructor(private readonly catalog: CouponCatalog) {}

  async discountFor(codes: CouponCodes): Promise<DiscountPercent> {
    let percent = 0;
    for (const code of codes.items) {
      const discount = await this.catalog.discountOf(code);
      if (discount === null) {
        throw new UnknownCoupon(code.value);
      }
      percent += discount.value;
    }
    return new DiscountPercent(Math.min(percent, OrderPricing.MAX_DISCOUNT));
  }
}
