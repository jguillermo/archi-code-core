import { CreatedAt, UuidType } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import { EnrollmentCompletedDomainEvent } from '../../../domain/event/EnrollmentCompletedDomainEvent';
import { EnrollmentId } from '../../../domain/value-object/EnrollmentId';
import type { StudentEnrollmentProjection } from '../student-enrollment-projection';

@ListensTo(EnrollmentCompletedDomainEvent, {
  consumer: 'enrollments.mark-student-enrollment-completed-on-enrollment-completed',
})
export class MarkStudentEnrollmentCompletedOnEnrollmentCompleted extends EventListener<EnrollmentCompletedDomainEvent> {
  constructor(private readonly projection: StudentEnrollmentProjection) {
    super();
  }

  async handle(event: EnrollmentCompletedDomainEvent): Promise<void> {
    const { eventId, enrollmentId, occurredOn } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      enrollmentId: () => new EnrollmentId(event.enrollmentId),
      occurredOn: () => new CreatedAt(event.occurredOn as string),
    });
    await this.projection.apply({
      eventId,
      enrollmentId,
      occurredOn,
      changes: { completed: true },
    });
  }
}
