import { DomainException } from '@archi-code/ddd/domain';

export class CourseNotEditable extends DomainException {
  constructor(courseId: string) {
    super(`Course ${courseId} is archived and can no longer change`, ['LRN009']);
  }
}
