import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class EnrollmentCreatedDomainEvent extends EventBase {
  static readonly eventName = 'enrollment.created';

  readonly enrollmentId: string;
  readonly studentId: string;
  readonly courseId: string;
  readonly fee: { amount: number; currency: string };

  constructor({
    enrollmentId,
    studentId,
    courseId,
    fee,
    eventId,
    occurredOn,
  }: {
    enrollmentId: string;
    studentId: string;
    courseId: string;
    fee: { amount: number; currency: string };
  } & EventMetadata) {
    super({ eventId, occurredOn });
    this.enrollmentId = enrollmentId;
    this.studentId = studentId;
    this.courseId = courseId;
    this.fee = fee;
  }
}
