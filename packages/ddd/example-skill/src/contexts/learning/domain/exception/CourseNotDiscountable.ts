import { DomainException } from '@archi-code/ddd/domain';

export class CourseNotDiscountable extends DomainException {
  constructor(courseId: string) {
    super(`Course ${courseId} is not a published course under the given price`, ['LRN007']);
  }
}
