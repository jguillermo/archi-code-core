import { DomainException } from '@archi-code/ddd/domain';

export class NotTheStudentOfEnrollment extends DomainException {
  constructor(enrollmentId: string) {
    super(`Only the student of enrollment ${enrollmentId} may cancel it`, ['ENR004']);
  }
}
