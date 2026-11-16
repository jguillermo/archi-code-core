import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class EnrollmentCancelledDomainEvent extends EventBase {
  static readonly eventName = 'enrollment.cancelled';

  readonly enrollmentId: string;
  readonly studentId: string;
  readonly courseId: string;
  readonly fee: { amount: number; currency: string };
  readonly reason: string;

  constructor({
    enrollmentId,
    studentId,
    courseId,
    fee,
    reason,
    eventId,
    occurredOn,
  }: {
    enrollmentId: string;
    studentId: string;
    courseId: string;
    fee: { amount: number; currency: string };
    reason: string;
  } & EventMetadata) {
    super({ eventId, occurredOn });
    this.enrollmentId = enrollmentId;
    this.studentId = studentId;
    this.courseId = courseId;
    this.fee = fee;
    this.reason = reason;
  }
}
