import { DomainException } from '@archi-code/ddd/domain';

export class EnrollmentNotFound extends DomainException {
  constructor(enrollmentId: string) {
    super(`Enrollment ${enrollmentId} does not exist`, ['ENR003']);
  }
}
