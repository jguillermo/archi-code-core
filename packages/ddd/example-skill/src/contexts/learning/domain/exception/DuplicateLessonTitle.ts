import { DomainException } from '@archi-code/ddd/domain';

export class DuplicateLessonTitle extends DomainException {
  constructor(courseId: string, title: string) {
    super(`Course ${courseId} already has a lesson titled "${title}"`, ['LRN004']);
  }
}
