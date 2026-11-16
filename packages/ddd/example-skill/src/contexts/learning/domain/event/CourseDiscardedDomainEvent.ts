import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class CourseDiscardedDomainEvent extends EventBase {
  static readonly eventName = 'course.discarded';

  readonly courseId: string;

  constructor({ courseId, eventId, occurredOn }: { courseId: string } & EventMetadata) {
    super({ eventId, occurredOn });
    this.courseId = courseId;
  }
}
