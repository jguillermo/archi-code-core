import { DomainException } from '@archi-code/ddd/domain';

export class AlreadyEnrolled extends DomainException {
  constructor(studentId: string, courseId: string) {
    super(`Student ${studentId} is already enrolled in course ${courseId}`, ['ENR002']);
  }
}
