import type { CouponCode } from '../value-object/CouponCode';
import type { DiscountPercent } from '../value-object/DiscountPercent';

export interface CouponCatalog {
  discountOf(code: CouponCode): Promise<DiscountPercent | null>;
}
