import { CreatedAt, UuidType } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import { CourseDiscardedDomainEvent } from '../../../domain/event/CourseDiscardedDomainEvent';
import { CourseId } from '../../../domain/value-object/CourseId';
import type { CourseViewProjection } from '../course-view-projection';

@ListensTo(CourseDiscardedDomainEvent, {
  consumer: 'learning.mark-course-view-discarded-on-course-discarded',
})
export class MarkCourseViewDiscardedOnCourseDiscarded extends EventListener<CourseDiscardedDomainEvent> {
  constructor(private readonly projection: CourseViewProjection) {
    super();
  }

  async handle(event: CourseDiscardedDomainEvent): Promise<void> {
    const { eventId, courseId, occurredOn } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      courseId: () => new CourseId(event.courseId),
      occurredOn: () => new CreatedAt(event.occurredOn as string),
    });
    await this.projection.apply({ eventId, courseId, occurredOn, changes: { discarded: true } });
  }
}
