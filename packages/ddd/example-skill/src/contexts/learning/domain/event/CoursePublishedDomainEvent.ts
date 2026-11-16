import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class CoursePublishedDomainEvent extends EventBase {
  static readonly eventName = 'course.published';

  readonly courseId: string;
  readonly title: string;
  readonly price: { amount: number; currency: string };

  constructor({
    courseId,
    title,
    price,
    eventId,
    occurredOn,
  }: {
    courseId: string;
    title: string;
    price: { amount: number; currency: string };
  } & EventMetadata) {
    super({ eventId, occurredOn });
    this.courseId = courseId;
    this.title = title;
    this.price = price;
  }
}
