import { AggregateRepository } from '../../../../ddd/domain';
import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import type { Coupon } from '../aggregate/Coupon';
import type { CouponId } from '../value-object/CouponId';

export abstract class CouponRepository
  extends AggregateRepository<Coupon>
  implements AggregateFinder<Coupon>, AggregateSaver<Coupon>
{
  abstract findById(id: CouponId): Promise<Coupon | null>;
  abstract save(coupon: Coupon): Promise<void>;
}
