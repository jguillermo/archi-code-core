import { CreatedAt, UuidType } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import { Money } from '../../../../shared-kernel/money/Money';
import type { Currency } from '../../../../shared-kernel/money/MoneyCurrency';
import { EnrollmentCreatedDomainEvent } from '../../../domain/event/EnrollmentCreatedDomainEvent';
import { CourseReference } from '../../../domain/value-object/CourseReference';
import { EnrollmentId } from '../../../domain/value-object/EnrollmentId';
import { StudentReference } from '../../../domain/value-object/StudentReference';
import type { StudentEnrollmentProjection } from '../student-enrollment-projection';

@ListensTo(EnrollmentCreatedDomainEvent, {
  consumer: 'enrollments.add-student-enrollment-on-enrollment-created',
})
export class AddStudentEnrollmentOnEnrollmentCreated extends EventListener<EnrollmentCreatedDomainEvent> {
  constructor(private readonly projection: StudentEnrollmentProjection) {
    super();
  }

  async handle(event: EnrollmentCreatedDomainEvent): Promise<void> {
    const { eventId, enrollmentId, occurredOn, student, course, fee } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      enrollmentId: () => new EnrollmentId(event.enrollmentId),
      occurredOn: () => new CreatedAt(event.occurredOn as string),
      student: () => new StudentReference(event.studentId),
      course: () => new CourseReference(event.courseId),
      fee: () => Money.fromPrimitives(event.fee as { amount: number; currency: Currency }),
    });
    await this.projection.apply({
      eventId,
      enrollmentId,
      occurredOn,
      changes: { studentId: student.value, courseId: course.value, fee: fee.toPrimitives() },
    });
  }
}
