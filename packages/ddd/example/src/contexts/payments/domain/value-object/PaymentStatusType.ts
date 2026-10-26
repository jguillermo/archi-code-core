import { EnumType, Required } from '../../../../ddd/domain';

export enum PaymentStatus {
  PENDING = 'pending',
  AWAITING_TRANSFER = 'awaiting_transfer',
  CAPTURED = 'captured',
  REJECTED = 'rejected',
  REFUNDED = 'refunded',
  VOIDED = 'voided',
}

export class PaymentStatusOption extends EnumType<PaymentStatus> {
  protected getEnum(): typeof PaymentStatus {
    return PaymentStatus;
  }
}

export class PaymentStatusType extends Required(PaymentStatusOption) {}
