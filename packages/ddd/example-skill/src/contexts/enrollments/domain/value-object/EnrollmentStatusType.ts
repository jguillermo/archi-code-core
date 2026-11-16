import { EnumType, Required } from '@archi-code/ddd/domain';

export enum EnrollmentStatus {
  PENDING_PAYMENT = 'pending_payment',
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export class EnrollmentStatusOption extends EnumType<EnrollmentStatus> {
  protected getEnum(): typeof EnrollmentStatus {
    return EnrollmentStatus;
  }
}

export class EnrollmentStatusType extends Required(EnrollmentStatusOption) {}
