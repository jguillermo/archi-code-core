import { NotAllowedException, UseCase, ValueObjectBuilder } from '../../../../ddd/application';
import type { EventBus } from '../../../../ddd/application';
import { Coupon } from '../../domain/coupon/aggregate/Coupon';
import { CouponCode } from '../../domain/coupon/value-object/CouponCode';
import { CouponId } from '../../domain/coupon/value-object/CouponId';
import type { CouponRepository } from '../../domain/coupon/repository/CouponRepository';
import { DiscountPercent } from '../../domain/coupon/value-object/DiscountPercent';
import { StaffRole } from '../../domain/order/value-object/StaffRoleType';
import { StaffRoleType } from '../../domain/order/value-object/StaffRoleType';

export interface RegisterCouponInput {
  actorRole: string;
  code: string;
  discount: number;
}

export interface RegisterCouponCommand {
  actorRole: StaffRoleType;
  code: CouponCode;
  discount: DiscountPercent;
}

export class RegisterCoupon extends UseCase<RegisterCouponInput, RegisterCouponCommand, string> {
  constructor(
    private readonly coupons: CouponRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  protected toCommand(input: RegisterCouponInput): RegisterCouponCommand {
    return ValueObjectBuilder.build({
      actorRole: () => new StaffRoleType(input.actorRole as StaffRole),
      code: () => new CouponCode(input.code),
      discount: () => new DiscountPercent(input.discount),
    });
  }

  protected async handle(command: RegisterCouponCommand): Promise<string> {
    if (command.actorRole.value !== StaffRole.ADMIN) {
      throw new NotAllowedException(`The role ${command.actorRole.value} may not register coupons`);
    }
    const coupon = Coupon.create(CouponId.forCode(command.code), command.code, command.discount);
    await this.coupons.save(coupon);
    await this.events.publish(coupon.pullDomainEvents());
    return coupon.id.value;
  }
}
