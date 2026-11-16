import { DomainException } from '@archi-code/ddd/domain';

export class CourseNotFound extends DomainException {
  constructor(courseId: string) {
    super(`Course ${courseId} is not in the catalog`, ['LRN002']);
  }
}
