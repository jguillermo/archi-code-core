import { describe, expect, it, vi } from 'vitest';
import type { Enrollment } from '../../../../../src/contexts/enrollments/domain/aggregate/Enrollment';
import { EnrollmentNotFound } from '../../../../../src/contexts/enrollments/domain/exception/EnrollmentNotFound';
import type { EnrollmentRepository } from '../../../../../src/contexts/enrollments/domain/repository/EnrollmentRepository';
import { EnrollmentFinder } from '../../../../../src/contexts/enrollments/domain/service/EnrollmentFinder';
import { EnrollmentId } from '../../../../../src/contexts/enrollments/domain/value-object/EnrollmentId';
import { aPendingEnrollment } from '../../../../support/enrollments/enrollment-fixtures';

function enrollmentsFinding(enrollment: Enrollment | null): EnrollmentRepository {
  return { findById: vi.fn().mockResolvedValue(enrollment) } as unknown as EnrollmentRepository;
}

describe('EnrollmentFinder', () => {
  it('finds an existing enrollment', async () => {
    const enrollment = aPendingEnrollment();
    await expect(
      new EnrollmentFinder(enrollmentsFinding(enrollment)).find(enrollment.id),
    ).resolves.toBe(enrollment);
  });

  it('an unknown enrollment cannot be found', async () => {
    await expect(
      new EnrollmentFinder(enrollmentsFinding(null)).find(EnrollmentId.generate()),
    ).rejects.toBeInstanceOf(EnrollmentNotFound);
  });
});
