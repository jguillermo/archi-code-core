import { DomainException } from '@archi-code/ddd/domain';

export class LessonCountOutOfRange extends DomainException {
  constructor(lessons: number) {
    super(`A course has from 1 to 50 lessons, not ${lessons}`, ['LRN005']);
  }
}
