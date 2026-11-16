import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class CourseCreatedDomainEvent extends EventBase {
  static readonly eventName = 'course.created';

  readonly courseId: string;
  readonly title: string;
  readonly price: { amount: number; currency: string };
  readonly lessons: { number: number; title: string; durationMinutes: number }[];

  constructor({
    courseId,
    title,
    price,
    lessons,
    eventId,
    occurredOn,
  }: {
    courseId: string;
    title: string;
    price: { amount: number; currency: string };
    lessons: { number: number; title: string; durationMinutes: number }[];
  } & EventMetadata) {
    super({ eventId, occurredOn });
    this.courseId = courseId;
    this.title = title;
    this.price = price;
    this.lessons = lessons;
  }
}
