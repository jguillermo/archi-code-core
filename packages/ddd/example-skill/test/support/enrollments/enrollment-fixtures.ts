import { Money } from '../../../src/contexts/shared-kernel/money/Money';
import type { Currency } from '../../../src/contexts/shared-kernel/money/MoneyCurrency';
import { Enrollment } from '../../../src/contexts/enrollments/domain/aggregate/Enrollment';
import { CourseReference } from '../../../src/contexts/enrollments/domain/value-object/CourseReference';
import { EnrollmentId } from '../../../src/contexts/enrollments/domain/value-object/EnrollmentId';
import { StudentReference } from '../../../src/contexts/enrollments/domain/value-object/StudentReference';

export const laura = '6f1c2a9e-3b7d-4c51-9a8e-2d4f6b8c0e11';
export const marta = '0a7e5d3c-1f2b-4e6a-8c9d-7b5a3e1f2c44';
export const weldingCourse = 'c3d2e1f0-9a8b-4c7d-8e6f-5a4b3c2d1e00';

export function aPendingEnrollment(
  student = laura,
  course = weldingCourse,
  id = EnrollmentId.generate(),
): Enrollment {
  const enrollment = Enrollment.create(
    id,
    new StudentReference(student),
    new CourseReference(course),
    Money.fromPrimitives({ amount: 4_900, currency: 'EUR' as Currency }),
  );
  enrollment.pullDomainEvents();
  return enrollment;
}

export function anActiveEnrollment(student = laura): Enrollment {
  const enrollment = aPendingEnrollment(student);
  enrollment.activateAfterPayment();
  enrollment.pullDomainEvents();
  return enrollment;
}
