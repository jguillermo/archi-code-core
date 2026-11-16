import { DomainException } from '@archi-code/ddd/domain';

export class LessonNotFound extends DomainException {
  constructor(courseId: string, lessonNumber: number) {
    super(`Course ${courseId} has no lesson ${lessonNumber}`, ['LRN006']);
  }
}
