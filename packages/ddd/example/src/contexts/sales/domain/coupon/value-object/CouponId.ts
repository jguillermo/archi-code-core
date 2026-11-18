import { IdType, UuidType } from '../../../../../ddd/domain';
import type { CouponCode } from '../../shared/value-object/CouponCode';

export class CouponId extends IdType<'CouponId'> {
  static forCode(code: CouponCode): CouponId {
    return new CouponId(UuidType.fromValue(`coupon-of-code:${code.value}`));
  }
}
