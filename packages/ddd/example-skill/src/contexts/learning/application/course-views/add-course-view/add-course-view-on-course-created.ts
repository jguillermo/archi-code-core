import { CreatedAt, UuidType } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import { Money } from '../../../../shared-kernel/money/Money';
import type { Currency } from '../../../../shared-kernel/money/MoneyCurrency';
import { CourseCreatedDomainEvent } from '../../../domain/event/CourseCreatedDomainEvent';
import { CourseId } from '../../../domain/value-object/CourseId';
import { CourseTitle } from '../../../domain/value-object/CourseTitle';
import { LessonDuration } from '../../../domain/value-object/LessonDuration';
import { LessonNumber } from '../../../domain/value-object/LessonNumber';
import { LessonTitle } from '../../../domain/value-object/LessonTitle';
import type { CourseViewProjection } from '../course-view-projection';

@ListensTo(CourseCreatedDomainEvent, { consumer: 'learning.add-course-view-on-course-created' })
export class AddCourseViewOnCourseCreated extends EventListener<CourseCreatedDomainEvent> {
  constructor(private readonly projection: CourseViewProjection) {
    super();
  }

  async handle(event: CourseCreatedDomainEvent): Promise<void> {
    const { eventId, courseId, occurredOn, title, price, lessons } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      courseId: () => new CourseId(event.courseId),
      occurredOn: () => new CreatedAt(event.occurredOn as string),
      title: () => new CourseTitle(event.title),
      price: () => Money.fromPrimitives(event.price as { amount: number; currency: Currency }),
      lessons: () =>
        ValueObjectBuilder.buildList(event.lessons, (lesson) =>
          ValueObjectBuilder.build({
            number: () => new LessonNumber(lesson.number),
            title: () => new LessonTitle(lesson.title),
            duration: () => new LessonDuration(lesson.durationMinutes),
          }),
        ),
    });
    await this.projection.apply({
      eventId,
      courseId,
      occurredOn,
      changes: {
        created: true,
        title: title.value,
        price: price.toPrimitives(),
        lessons: lessons.map((lesson) => ({
          number: lesson.number.value,
          title: lesson.title.value,
          durationMinutes: lesson.duration.value,
        })),
      },
    });
  }
}
