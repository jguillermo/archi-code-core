import { CreatedAt, UuidType } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import { EnrollmentCancelledDomainEvent } from '../../../domain/event/EnrollmentCancelledDomainEvent';
import { EnrollmentId } from '../../../domain/value-object/EnrollmentId';
import type { StudentEnrollmentProjection } from '../student-enrollment-projection';

@ListensTo(EnrollmentCancelledDomainEvent, {
  consumer: 'enrollments.mark-student-enrollment-cancelled-on-enrollment-cancelled',
})
export class MarkStudentEnrollmentCancelledOnEnrollmentCancelled extends EventListener<EnrollmentCancelledDomainEvent> {
  constructor(private readonly projection: StudentEnrollmentProjection) {
    super();
  }

  async handle(event: EnrollmentCancelledDomainEvent): Promise<void> {
    const { eventId, enrollmentId, occurredOn } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      enrollmentId: () => new EnrollmentId(event.enrollmentId),
      occurredOn: () => new CreatedAt(event.occurredOn as string),
    });
    await this.projection.apply({
      eventId,
      enrollmentId,
      occurredOn,
      changes: { cancelled: true },
    });
  }
}
