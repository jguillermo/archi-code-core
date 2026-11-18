import type { PrimitiveTypes } from '../../../../ddd/domain';
import { ConcurrencyException } from '../../../../ddd/application';
import { Coupon } from '../../domain/coupon/aggregate/Coupon';
import { CouponRepository } from '../../domain/coupon/repository/CouponRepository';
import type { CouponId } from '../../domain/coupon/value-object/CouponId';

interface CouponRow {
  version: number;
  primitives: PrimitiveTypes<Coupon>;
}

export class InMemoryCouponRepository extends CouponRepository {
  private readonly rows = new Map<string, CouponRow>();
  private readonly versions = new WeakMap<Coupon, number>();

  async findById(id: CouponId): Promise<Coupon | null> {
    const row = this.rows.get(id.value);
    if (row === undefined) {
      return null;
    }
    const coupon = Coupon.fromPrimitives(structuredClone(row.primitives));
    this.versions.set(coupon, row.version);
    return coupon;
  }

  async save(coupon: Coupon): Promise<void> {
    const key = coupon.id.value;
    const version = this.versions.get(coupon) ?? 0;
    if ((this.rows.get(key)?.version ?? 0) !== version) {
      throw new ConcurrencyException('Coupon', key, version);
    }
    this.rows.set(key, {
      version: version + 1,
      primitives: structuredClone(coupon.toPrimitives()),
    });
    this.versions.delete(coupon);
  }
}
