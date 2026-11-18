import { EventBase } from '../../../../../ddd/domain';
import type { EventMetadata } from '../../../../../ddd/domain';

export class CouponCreatedDomainEvent extends EventBase {
  static readonly eventName = 'coupon.created';

  readonly couponId: string;
  readonly code: string;
  readonly discount: number;

  constructor({
    couponId,
    code,
    discount,
    eventId,
    occurredOn,
  }: { couponId: string; code: string; discount: number } & EventMetadata) {
    super({ eventId, occurredOn });
    this.couponId = couponId;
    this.code = code;
    this.discount = discount;
  }
}
