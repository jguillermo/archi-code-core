import { CreatedAt, UuidType } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import { CourseReference } from '../../../domain/value-object/CourseReference';
import type { OpenCourseProjection } from '../open-course-projection';
import { CourseArchivedDomainEvent } from './course-archived-domain-event';

@ListensTo(CourseArchivedDomainEvent, {
  consumer: 'enrollments.close-open-course-on-course-archived',
})
export class CloseOpenCourseOnCourseArchived extends EventListener<CourseArchivedDomainEvent> {
  constructor(private readonly projection: OpenCourseProjection) {
    super();
  }

  async handle(event: CourseArchivedDomainEvent): Promise<void> {
    const { eventId, courseId, occurredOn } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      courseId: () => new CourseReference(event.courseId),
      occurredOn: () => new CreatedAt(event.occurredOn as string),
    });
    await this.projection.apply({ eventId, courseId, occurredOn, changes: { archived: true } });
  }
}
