import { describe, expect, it, vi } from 'vitest';
import { Money } from '../../../../../src/contexts/shared-kernel/money/Money';
import { Currency } from '../../../../../src/contexts/shared-kernel/money/MoneyCurrency';
import { AlreadyEnrolled } from '../../../../../src/contexts/enrollments/domain/exception/AlreadyEnrolled';
import { CourseNotOpen } from '../../../../../src/contexts/enrollments/domain/exception/CourseNotOpen';
import type { CourseCatalog } from '../../../../../src/contexts/enrollments/domain/service/CourseCatalog';
import { EnrollmentAdmission } from '../../../../../src/contexts/enrollments/domain/service/EnrollmentAdmission';
import { CourseReference } from '../../../../../src/contexts/enrollments/domain/value-object/CourseReference';
import { StudentReference } from '../../../../../src/contexts/enrollments/domain/value-object/StudentReference';
import {
  aPendingEnrollment,
  laura,
  weldingCourse,
} from '../../../../support/enrollments/enrollment-fixtures';

function catalogCharging(fee: Money | null): CourseCatalog {
  return { feeOfOpenCourse: vi.fn().mockResolvedValue(fee) };
}

const student = new StudentReference(laura);
const course = new CourseReference(weldingCourse);
const price = Money.fromPrimitives({ amount: 4_900, currency: Currency.EUR });

describe('EnrollmentAdmission', () => {
  it('admits a student to an open course for its current price', async () => {
    await expect(
      new EnrollmentAdmission(catalogCharging(price)).feeToAdmit(student, course, []),
    ).resolves.toBe(price);
  });

  it('refuses a course that is not open', async () => {
    await expect(
      new EnrollmentAdmission(catalogCharging(null)).feeToAdmit(student, course, []),
    ).rejects.toBeInstanceOf(CourseNotOpen);
  });

  it('refuses a student who already holds a seat in the course', async () => {
    await expect(
      new EnrollmentAdmission(catalogCharging(price)).feeToAdmit(student, course, [
        aPendingEnrollment(),
      ]),
    ).rejects.toBeInstanceOf(AlreadyEnrolled);
  });
});
