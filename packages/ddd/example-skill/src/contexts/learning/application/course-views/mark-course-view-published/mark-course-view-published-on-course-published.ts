import { CreatedAt, UuidType } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import { Money } from '../../../../shared-kernel/money/Money';
import type { Currency } from '../../../../shared-kernel/money/MoneyCurrency';
import { CoursePublishedDomainEvent } from '../../../domain/event/CoursePublishedDomainEvent';
import { CourseId } from '../../../domain/value-object/CourseId';
import { CourseTitle } from '../../../domain/value-object/CourseTitle';
import type { CourseViewProjection } from '../course-view-projection';

@ListensTo(CoursePublishedDomainEvent, {
  consumer: 'learning.mark-course-view-published-on-course-published',
})
export class MarkCourseViewPublishedOnCoursePublished extends EventListener<CoursePublishedDomainEvent> {
  constructor(private readonly projection: CourseViewProjection) {
    super();
  }

  async handle(event: CoursePublishedDomainEvent): Promise<void> {
    const { eventId, courseId, occurredOn, title, price } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      courseId: () => new CourseId(event.courseId),
      occurredOn: () => new CreatedAt(event.occurredOn as string),
      title: () => new CourseTitle(event.title),
      price: () => Money.fromPrimitives(event.price as { amount: number; currency: Currency }),
    });
    await this.projection.apply({
      eventId,
      courseId,
      occurredOn,
      changes: { published: true, title: title.value, price: price.toPrimitives() },
    });
  }
}
