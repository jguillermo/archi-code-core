import type { CouponCodes } from '../order/coupon-codes';
import { DiscountPercent } from '../order/discount-percent';
import { UnknownCouponException } from '../order/order-exceptions';
import type { CouponCatalog } from './coupon-catalog';

export class OrderPricing {
  private static readonly MAX_DISCOUNT = 50;

  constructor(private readonly catalog: CouponCatalog) {}

  async discountFor(codes: CouponCodes): Promise<DiscountPercent> {
    let percent = 0;
    for (const code of codes.items) {
      const discount = await this.catalog.discountOf(code);
      if (discount === null) {
        throw new UnknownCouponException(code.value);
      }
      percent += discount.value;
    }
    return new DiscountPercent(Math.min(percent, OrderPricing.MAX_DISCOUNT));
  }
}
