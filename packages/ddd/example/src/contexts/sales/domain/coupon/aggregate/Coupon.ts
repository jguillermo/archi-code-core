import { AggregateRoot, CreatedAt, UpdatedAt } from '../../../../../ddd/domain';
import type { PrimitiveTypes } from '../../../../../ddd/domain';
import { CouponCode } from '../value-object/CouponCode';
import { CouponCreatedDomainEvent } from '../event/CouponCreatedDomainEvent';
import { CouponId } from '../value-object/CouponId';
import { DiscountPercent } from '../value-object/DiscountPercent';

export class Coupon extends AggregateRoot<CouponId> {
  readonly code: CouponCode;
  readonly discount: DiscountPercent;
  readonly createdAt: CreatedAt;
  private _updatedAt: UpdatedAt;

  constructor(
    id: CouponId,
    code: CouponCode,
    discount: DiscountPercent,
    createdAt: CreatedAt,
    updatedAt: UpdatedAt,
  ) {
    super(id);
    this.code = code;
    this.discount = discount;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static create(id: CouponId, code: CouponCode, discount: DiscountPercent): Coupon {
    const coupon = new Coupon(id, code, discount, CreatedAt.now(), UpdatedAt.now());
    coupon.record(
      new CouponCreatedDomainEvent({
        couponId: coupon.id.value,
        code: coupon.code.value,
        discount: coupon.discount.value,
      }),
    );
    return coupon;
  }

  static fromPrimitives(primitives: PrimitiveTypes<Coupon>): Coupon {
    return new Coupon(
      new CouponId(primitives.id),
      new CouponCode(primitives.code),
      new DiscountPercent(primitives.discount),
      new CreatedAt(primitives.createdAt),
      new UpdatedAt(primitives.updatedAt),
    );
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  toPrimitives(): PrimitiveTypes<Coupon> {
    return {
      id: this.id.value,
      code: this.code.value,
      discount: this.discount.value,
      createdAt: this.createdAt.value,
      updatedAt: this._updatedAt.value,
    };
  }
}
