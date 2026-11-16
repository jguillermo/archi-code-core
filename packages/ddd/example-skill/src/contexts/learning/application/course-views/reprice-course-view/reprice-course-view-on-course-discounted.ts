import { CreatedAt, UuidType } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import { Money } from '../../../../shared-kernel/money/Money';
import type { Currency } from '../../../../shared-kernel/money/MoneyCurrency';
import { CourseDiscountedDomainEvent } from '../../../domain/event/CourseDiscountedDomainEvent';
import { CourseId } from '../../../domain/value-object/CourseId';
import type { CourseViewProjection } from '../course-view-projection';

@ListensTo(CourseDiscountedDomainEvent, {
  consumer: 'learning.reprice-course-view-on-course-discounted',
})
export class RepriceCourseViewOnCourseDiscounted extends EventListener<CourseDiscountedDomainEvent> {
  constructor(private readonly projection: CourseViewProjection) {
    super();
  }

  async handle(event: CourseDiscountedDomainEvent): Promise<void> {
    const { eventId, courseId, occurredOn, price } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      courseId: () => new CourseId(event.courseId),
      occurredOn: () => new CreatedAt(event.occurredOn as string),
      price: () => Money.fromPrimitives(event.price as { amount: number; currency: Currency }),
    });
    await this.projection.apply({
      eventId,
      courseId,
      occurredOn,
      changes: { price: price.toPrimitives() },
    });
  }
}
