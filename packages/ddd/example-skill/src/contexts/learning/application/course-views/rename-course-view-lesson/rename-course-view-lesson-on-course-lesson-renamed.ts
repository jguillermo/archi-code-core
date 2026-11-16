import { CreatedAt, UuidType } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import { CourseLessonRenamedDomainEvent } from '../../../domain/event/CourseLessonRenamedDomainEvent';
import { CourseId } from '../../../domain/value-object/CourseId';
import { LessonDuration } from '../../../domain/value-object/LessonDuration';
import { LessonNumber } from '../../../domain/value-object/LessonNumber';
import { LessonTitle } from '../../../domain/value-object/LessonTitle';
import type { CourseViewProjection } from '../course-view-projection';

@ListensTo(CourseLessonRenamedDomainEvent, {
  consumer: 'learning.rename-course-view-lesson-on-course-lesson-renamed',
})
export class RenameCourseViewLessonOnCourseLessonRenamed extends EventListener<CourseLessonRenamedDomainEvent> {
  constructor(private readonly projection: CourseViewProjection) {
    super();
  }

  async handle(event: CourseLessonRenamedDomainEvent): Promise<void> {
    const { eventId, courseId, occurredOn, lessons } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      courseId: () => new CourseId(event.courseId),
      occurredOn: () => new CreatedAt(event.occurredOn as string),
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
        lessons: lessons.map((lesson) => ({
          number: lesson.number.value,
          title: lesson.title.value,
          durationMinutes: lesson.duration.value,
        })),
      },
    });
  }
}
