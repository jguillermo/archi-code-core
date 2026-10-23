import { Validations } from '@archi-code/validation';
import { ArrayType, Required, StringType } from '../../../../ddd/domain';

@Validations([
  {
    validator: 'matches',
    properties: { pattern: /^[A-Z0-9]{4,12}$/ },
    message: 'A coupon code has 4 to 12 capital letters or digits',
  },
])
export class CouponCode extends Required(StringType) {}

@Validations([
  {
    custom: 'atMostThreeCoupons',
    fn: (codes) => (codes as string[]).length <= 3,
    message: 'An order takes at most 3 coupons',
  },
  {
    custom: 'noRepeatedCoupons',
    fn: (codes) => new Set(codes as string[]).size === (codes as string[]).length,
    message: 'A coupon is applied only once',
  },
])
export class CouponCodeList extends ArrayType<CouponCode> {
  protected createItem(value: unknown): CouponCode {
    return new CouponCode(value as string);
  }
}

export class CouponCodes extends Required(CouponCodeList) {}
