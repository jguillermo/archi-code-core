import { CreatedAt, UuidType } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import { EnrollmentActivatedDomainEvent } from '../../../domain/event/EnrollmentActivatedDomainEvent';
import { EnrollmentId } from '../../../domain/value-object/EnrollmentId';
import type { StudentEnrollmentProjection } from '../student-enrollment-projection';

@ListensTo(EnrollmentActivatedDomainEvent, {
  consumer: 'enrollments.mark-student-enrollment-active-on-enrollment-activated',
})
export class MarkStudentEnrollmentActiveOnEnrollmentActivated extends EventListener<EnrollmentActivatedDomainEvent> {
  constructor(private readonly projection: StudentEnrollmentProjection) {
    super();
  }

  async handle(event: EnrollmentActivatedDomainEvent): Promise<void> {
    const { eventId, enrollmentId, occurredOn } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      enrollmentId: () => new EnrollmentId(event.enrollmentId),
      occurredOn: () => new CreatedAt(event.occurredOn as string),
    });
    await this.projection.apply({
      eventId,
      enrollmentId,
      occurredOn,
      changes: { activated: true },
    });
  }
}
