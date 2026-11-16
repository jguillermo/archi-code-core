import { DomainException } from '@archi-code/ddd/domain';

export class CourseNotPublishable extends DomainException {
  constructor(courseId: string, status: string, lessons: number) {
    super(
      `Course ${courseId} is ${status} with ${lessons} lessons: only a draft with at least 3 lessons can be published`,
      ['LRN003'],
    );
  }
}
