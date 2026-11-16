import { DomainException } from '@archi-code/ddd/domain';

export class CourseNotOpen extends DomainException {
  constructor(courseId: string) {
    super(`Course ${courseId} is not open for enrollment`, ['ENR001']);
  }
}
