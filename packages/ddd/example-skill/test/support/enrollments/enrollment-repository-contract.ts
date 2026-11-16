import { expect, it } from 'vitest';
import { Criteria } from '@archi-code/ddd/domain';
import { ConcurrencyException } from '@archi-code/ddd/application';
import type { Enrollment } from '../../../src/contexts/enrollments/domain/aggregate/Enrollment';
import type { EnrollmentRepository } from '../../../src/contexts/enrollments/domain/repository/EnrollmentRepository';
import { CourseReference } from '../../../src/contexts/enrollments/domain/value-object/CourseReference';
import {
  EnrollmentStatus,
  EnrollmentStatusType,
} from '../../../src/contexts/enrollments/domain/value-object/EnrollmentStatusType';
import { StudentReference } from '../../../src/contexts/enrollments/domain/value-object/StudentReference';
import { aPendingEnrollment, laura, marta, weldingCourse } from './enrollment-fixtures';

async function loaded(
  enrollments: EnrollmentRepository,
  enrollment: Enrollment,
): Promise<Enrollment> {
  const found = await enrollments.findById(enrollment.id);
  expect(found).not.toBeNull();
  return found as Enrollment;
}

export function enrollmentRepositoryContract(make: () => Promise<EnrollmentRepository>): void {
  it('loads the enrollment it saved', async () => {
    const enrollments = await make();
    const enrollment = aPendingEnrollment();
    await enrollments.save(enrollment);
    expect((await enrollments.findById(enrollment.id))?.toPrimitives()).toEqual(
      enrollment.toPrimitives(),
    );
  });

  it('saves the same enrollment twice', async () => {
    const enrollments = await make();
    const enrollment = aPendingEnrollment();
    await enrollments.save(enrollment);
    enrollment.activateAfterPayment();
    await enrollments.save(enrollment);
    expect((await enrollments.findById(enrollment.id))?.status.value).toBe(EnrollmentStatus.ACTIVE);
  });

  it('refuses a stale save', async () => {
    const enrollments = await make();
    const enrollment = aPendingEnrollment();
    await enrollments.save(enrollment);
    const first = await loaded(enrollments, enrollment);
    const second = await loaded(enrollments, enrollment);
    first.activateAfterPayment();
    await enrollments.save(first);
    second.cancel(new StudentReference(laura));
    await expect(enrollments.save(second)).rejects.toBeInstanceOf(ConcurrencyException);
  });

  it('refuses a new enrollment whose id is taken', async () => {
    const enrollments = await make();
    const enrollment = aPendingEnrollment();
    await enrollments.save(enrollment);
    await expect(
      enrollments.save(aPendingEnrollment(marta, weldingCourse, enrollment.id)),
    ).rejects.toBeInstanceOf(ConcurrencyException);
  });

  it('searches the enrollments of a student in a course that are not cancelled', async () => {
    const enrollments = await make();
    const cancelled = aPendingEnrollment();
    cancelled.cancel(new StudentReference(laura));
    const current = aPendingEnrollment();
    await enrollments.save(cancelled);
    await enrollments.save(current);
    await enrollments.save(aPendingEnrollment(marta));
    const { items } = await enrollments.search(
      Criteria.create<Enrollment>({
        where: {
          student: new StudentReference(laura),
          course: new CourseReference(weldingCourse),
          status: { ne: new EnrollmentStatusType(EnrollmentStatus.CANCELLED) },
        },
        limit: 10,
      }),
    );
    expect(items.map((enrollment) => enrollment.id.value)).toEqual([current.id.value]);
  });
}
