import type { CouponCodes } from '../value-object/CouponCodes';
import { CouponId } from '../../coupon/value-object/CouponId';
import type { CouponRepository } from '../../coupon/repository/CouponRepository';
import { DiscountPercent } from '../../coupon/value-object/DiscountPercent';
import { UnknownCoupon } from '../exception/UnknownCoupon';

export class OrderPricing {
  private static readonly MAX_DISCOUNT = 50;

  constructor(private readonly coupons: CouponRepository) {}

  async discountFor(codes: CouponCodes): Promise<DiscountPercent> {
    let percent = 0;
    for (const code of codes.items) {
      const coupon = await this.coupons.findById(CouponId.forCode(code));
      if (coupon === null) {
        throw new UnknownCoupon(code.value);
      }
      percent += coupon.discount.value;
    }
    return new DiscountPercent(Math.min(percent, OrderPricing.MAX_DISCOUNT));
  }
}
