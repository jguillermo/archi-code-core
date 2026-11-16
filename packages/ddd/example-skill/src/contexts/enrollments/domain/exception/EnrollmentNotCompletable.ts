import { DomainException } from '@archi-code/ddd/domain';

export class EnrollmentNotCompletable extends DomainException {
  constructor(enrollmentId: string, status: string) {
    super(`Enrollment ${enrollmentId} is ${status}: only an active enrollment is completed`, [
      'ENR006',
    ]);
  }
}
