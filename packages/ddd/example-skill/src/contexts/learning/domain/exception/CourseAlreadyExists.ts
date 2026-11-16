import { DomainException } from '@archi-code/ddd/domain';

export class CourseAlreadyExists extends DomainException {
  constructor(courseId: string) {
    super(`Course ${courseId} already exists`, ['LRN001']);
  }
}
