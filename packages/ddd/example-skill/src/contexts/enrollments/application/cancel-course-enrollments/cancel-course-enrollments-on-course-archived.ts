import { Criteria } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { EventBus, Logger } from '@archi-code/ddd/application';
import type { Enrollment } from '../../domain/aggregate/Enrollment';
import type { EnrollmentRepository } from '../../domain/repository/EnrollmentRepository';
import { CourseReference } from '../../domain/value-object/CourseReference';
import type { EnrollmentId } from '../../domain/value-object/EnrollmentId';
import {
  EnrollmentStatus,
  EnrollmentStatusType,
} from '../../domain/value-object/EnrollmentStatusType';
import { CourseArchivedDomainEvent } from '../open-catalog/close-open-course/course-archived-domain-event';

// Saves every enrollment of the course on its own: docs/decisions/0002-cancel-enrollments-of-an-archived-course.md
@ListensTo(CourseArchivedDomainEvent, {
  consumer: 'enrollments.cancel-course-enrollments-on-course-archived',
})
export class CancelCourseEnrollmentsOnCourseArchived extends EventListener<CourseArchivedDomainEvent> {
  private static readonly PAGE_SIZE = 50;

  constructor(
    private readonly enrollments: EnrollmentRepository,
    private readonly events: EventBus,
    private readonly logger: Logger,
  ) {
    super();
  }

  async handle(event: CourseArchivedDomainEvent): Promise<void> {
    const { course } = ValueObjectBuilder.build({
      course: () => new CourseReference(event.courseId),
    });
    let cancelled = 0;
    let after: EnrollmentId | undefined;
    for (;;) {
      const { items } = await this.enrollments.search(
        Criteria.create<Enrollment>({
          where: {
            course,
            status: {
              in: [
                new EnrollmentStatusType(EnrollmentStatus.PENDING_PAYMENT),
                new EnrollmentStatusType(EnrollmentStatus.ACTIVE),
              ],
            },
            id: { gt: after },
          },
          orderBy: { id: 'asc' },
          limit: CancelCourseEnrollmentsOnCourseArchived.PAGE_SIZE,
        }),
      );
      if (items.length === 0) {
        break;
      }
      for (const enrollment of items) {
        enrollment.cancelForArchivedCourse();
        await this.enrollments.save(enrollment);
        const recorded = enrollment.pullDomainEvents();
        await this.events.publish(recorded);
        cancelled += recorded.length;
      }
      after = items[items.length - 1].id;
    }
    if (cancelled > 0) {
      this.logger.info('course_enrollments_cancelled', { courseId: course.value, cancelled });
    }
  }
}
