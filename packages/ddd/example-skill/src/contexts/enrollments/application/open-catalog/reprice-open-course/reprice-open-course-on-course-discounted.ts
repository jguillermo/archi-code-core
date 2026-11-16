import { CreatedAt, UuidType } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import { Money } from '../../../../shared-kernel/money/Money';
import type { Currency } from '../../../../shared-kernel/money/MoneyCurrency';
import { CourseReference } from '../../../domain/value-object/CourseReference';
import type { OpenCourseProjection } from '../open-course-projection';
import { CourseDiscountedDomainEvent } from './course-discounted-domain-event';

@ListensTo(CourseDiscountedDomainEvent, {
  consumer: 'enrollments.reprice-open-course-on-course-discounted',
})
export class RepriceOpenCourseOnCourseDiscounted extends EventListener<CourseDiscountedDomainEvent> {
  constructor(private readonly projection: OpenCourseProjection) {
    super();
  }

  async handle(event: CourseDiscountedDomainEvent): Promise<void> {
    const { eventId, courseId, occurredOn, price } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      courseId: () => new CourseReference(event.courseId),
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
