import { DomainException } from '../../../../ddd/domain';

export class UnknownCoupon extends DomainException {
  constructor(code: string) {
    super(`The coupon ${code} does not exist`, ['SAL009']);
  }
}
