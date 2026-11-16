import { CreatedAt, UuidType } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import { CourseArchivedDomainEvent } from '../../../domain/event/CourseArchivedDomainEvent';
import { CourseId } from '../../../domain/value-object/CourseId';
import type { CourseViewProjection } from '../course-view-projection';

@ListensTo(CourseArchivedDomainEvent, {
  consumer: 'learning.mark-course-view-archived-on-course-archived',
})
export class MarkCourseViewArchivedOnCourseArchived extends EventListener<CourseArchivedDomainEvent> {
  constructor(private readonly projection: CourseViewProjection) {
    super();
  }

  async handle(event: CourseArchivedDomainEvent): Promise<void> {
    const { eventId, courseId, occurredOn } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      courseId: () => new CourseId(event.courseId),
      occurredOn: () => new CreatedAt(event.occurredOn as string),
    });
    await this.projection.apply({ eventId, courseId, occurredOn, changes: { archived: true } });
  }
}
