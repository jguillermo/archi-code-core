import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class CourseLessonRenamedDomainEvent extends EventBase {
  static readonly eventName = 'course.lesson_renamed';

  readonly courseId: string;
  readonly lessonNumber: number;
  readonly title: string;
  readonly lessons: { number: number; title: string; durationMinutes: number }[];

  constructor({
    courseId,
    lessonNumber,
    title,
    lessons,
    eventId,
    occurredOn,
  }: {
    courseId: string;
    lessonNumber: number;
    title: string;
    lessons: { number: number; title: string; durationMinutes: number }[];
  } & EventMetadata) {
    super({ eventId, occurredOn });
    this.courseId = courseId;
    this.lessonNumber = lessonNumber;
    this.title = title;
    this.lessons = lessons;
  }
}
