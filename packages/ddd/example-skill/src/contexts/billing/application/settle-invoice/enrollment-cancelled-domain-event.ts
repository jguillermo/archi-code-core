import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class EnrollmentCancelledDomainEvent extends EventBase {
  static readonly eventName = 'enrollment.cancelled';

  readonly enrollmentId: string;
  readonly studentId: string;
  readonly fee: { amount: number; currency: string };

  constructor({
    enrollmentId,
    studentId,
    fee,
    eventId,
    occurredOn,
  }: {
    enrollmentId: string;
    studentId: string;
    fee: { amount: number; currency: string };
  } & EventMetadata) {
    super({ eventId, occurredOn });
    this.enrollmentId = enrollmentId;
    this.studentId = studentId;
    this.fee = fee;
  }
}
