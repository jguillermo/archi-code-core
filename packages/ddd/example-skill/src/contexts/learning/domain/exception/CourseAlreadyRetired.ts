import { DomainException } from '@archi-code/ddd/domain';

export class CourseAlreadyRetired extends DomainException {
  constructor(courseId: string) {
    super(`Course ${courseId} is already archived`, ['LRN008']);
  }
}
