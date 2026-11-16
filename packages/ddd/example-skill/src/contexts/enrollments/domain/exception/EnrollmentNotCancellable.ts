import { DomainException } from '@archi-code/ddd/domain';

export class EnrollmentNotCancellable extends DomainException {
  constructor(enrollmentId: string, status: string) {
    super(`Enrollment ${enrollmentId} is ${status} and can no longer be cancelled`, ['ENR005']);
  }
}
