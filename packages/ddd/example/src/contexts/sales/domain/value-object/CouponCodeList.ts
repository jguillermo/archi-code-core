import { Validations } from '@archi-code/validation';
import { ArrayType } from '../../../../ddd/domain';
import { CouponCode } from './CouponCode';

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
