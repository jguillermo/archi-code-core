import { CreatedAt, UuidType } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import { Money } from '../../../../shared-kernel/money/Money';
import type { Currency } from '../../../../shared-kernel/money/MoneyCurrency';
import { CourseReference } from '../../../domain/value-object/CourseReference';
import { CourseTitle } from '../../../domain/value-object/CourseTitle';
import type { OpenCourseProjection } from '../open-course-projection';
import { CoursePublishedDomainEvent } from './course-published-domain-event';

@ListensTo(CoursePublishedDomainEvent, {
  consumer: 'enrollments.add-open-course-on-course-published',
})
export class AddOpenCourseOnCoursePublished extends EventListener<CoursePublishedDomainEvent> {
  constructor(private readonly projection: OpenCourseProjection) {
    super();
  }

  async handle(event: CoursePublishedDomainEvent): Promise<void> {
    const { eventId, courseId, occurredOn, title, price } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      courseId: () => new CourseReference(event.courseId),
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
