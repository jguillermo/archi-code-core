import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class EnrollmentActivatedDomainEvent extends EventBase {
  static readonly eventName = 'enrollment.activated';

  readonly enrollmentId: string;

  constructor({ enrollmentId, eventId, occurredOn }: { enrollmentId: string } & EventMetadata) {
    super({ eventId, occurredOn });
    this.enrollmentId = enrollmentId;
  }
}
