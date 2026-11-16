import type { Enrollment } from '../aggregate/Enrollment';
import { EnrollmentNotFound } from '../exception/EnrollmentNotFound';
import type { EnrollmentRepository } from '../repository/EnrollmentRepository';
import type { EnrollmentId } from '../value-object/EnrollmentId';

export class EnrollmentFinder {
  constructor(private readonly enrollments: EnrollmentRepository) {}

  async find(id: EnrollmentId): Promise<Enrollment> {
    const enrollment = await this.enrollments.findById(id);
    if (enrollment === null) {
      throw new EnrollmentNotFound(id.value);
    }
    return enrollment;
  }
}
