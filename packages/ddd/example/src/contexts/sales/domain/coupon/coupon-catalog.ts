import type { CouponCode } from '../order/coupon-codes';
import type { DiscountPercent } from '../order/discount-percent';

export interface CouponCatalog {
  discountOf(code: CouponCode): Promise<DiscountPercent | null>;
}
