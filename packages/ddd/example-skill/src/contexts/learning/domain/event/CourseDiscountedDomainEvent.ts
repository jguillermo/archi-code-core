import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class CourseDiscountedDomainEvent extends EventBase {
  static readonly eventName = 'course.discounted';

  readonly courseId: string;
  readonly price: { amount: number; currency: string };

  constructor({
    courseId,
    price,
    eventId,
    occurredOn,
  }: { courseId: string; price: { amount: number; currency: string } } & EventMetadata) {
    super({ eventId, occurredOn });
    this.courseId = courseId;
    this.price = price;
  }
}
