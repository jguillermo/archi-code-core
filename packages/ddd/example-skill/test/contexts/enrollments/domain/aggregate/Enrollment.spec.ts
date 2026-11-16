import { describe, expect, it } from 'vitest';
import { Enrollment } from '../../../../../src/contexts/enrollments/domain/aggregate/Enrollment';
import { EnrollmentNotCancellable } from '../../../../../src/contexts/enrollments/domain/exception/EnrollmentNotCancellable';
import { EnrollmentNotCompletable } from '../../../../../src/contexts/enrollments/domain/exception/EnrollmentNotCompletable';
import { NotTheStudentOfEnrollment } from '../../../../../src/contexts/enrollments/domain/exception/NotTheStudentOfEnrollment';
import { CancellationReason } from '../../../../../src/contexts/enrollments/domain/value-object/CancellationReasonType';
import { EnrollmentStatus } from '../../../../../src/contexts/enrollments/domain/value-object/EnrollmentStatusType';
import { StudentReference } from '../../../../../src/contexts/enrollments/domain/value-object/StudentReference';
import {
  aPendingEnrollment,
  anActiveEnrollment,
  laura,
  marta,
} from '../../../../support/enrollments/enrollment-fixtures';

describe('Enrollment', () => {
  it('keeps every field when stored and loaded', () => {
    const enrollment = aPendingEnrollment();
    enrollment.cancel(new StudentReference(laura));
    expect(Enrollment.fromPrimitives(enrollment.toPrimitives()).toPrimitives()).toEqual(
      enrollment.toPrimitives(),
    );
  });

  it('the student cancels it while it waits for payment or is active', () => {
    const pending = aPendingEnrollment();
    pending.cancel(new StudentReference(laura));
    expect(pending.status.value).toBe(EnrollmentStatus.CANCELLED);
    expect(pending.cancellationReason.value).toBe(CancellationReason.STUDENT_REQUEST);
    expect(pending.pullDomainEvents().map((event) => ({ ...event }))).toMatchObject([
      { eventName: 'enrollment.cancelled', reason: 'student_request', fee: { amount: 4_900 } },
    ]);
    const active = anActiveEnrollment();
    active.cancel(new StudentReference(laura));
    expect(active.status.value).toBe(EnrollmentStatus.CANCELLED);
  });

  it('another student may not cancel it', () => {
    expect(() => aPendingEnrollment().cancel(new StudentReference(marta))).toThrow(
      NotTheStudentOfEnrollment,
    );
  });

  it('a cancelled or completed enrollment can no longer be cancelled', () => {
    const cancelled = aPendingEnrollment();
    cancelled.cancel(new StudentReference(laura));
    expect(() => cancelled.cancel(new StudentReference(laura))).toThrow(EnrollmentNotCancellable);
    const completed = anActiveEnrollment();
    completed.complete();
    expect(() => completed.cancel(new StudentReference(laura))).toThrow(EnrollmentNotCancellable);
  });

  it('an archived course cancels it silently, and only once', () => {
    const enrollment = aPendingEnrollment();
    enrollment.cancelForArchivedCourse();
    enrollment.cancelForArchivedCourse();
    expect(enrollment.cancellationReason.value).toBe(CancellationReason.COURSE_ARCHIVED);
    expect(enrollment.pullDomainEvents()).toHaveLength(1);
  });

  it('a paid invoice activates it once, never after it was cancelled', () => {
    const enrollment = aPendingEnrollment();
    enrollment.activateAfterPayment();
    enrollment.activateAfterPayment();
    expect(enrollment.pullDomainEvents().map((event) => event.eventName)).toEqual([
      'enrollment.activated',
    ]);
    const cancelled = aPendingEnrollment();
    cancelled.cancel(new StudentReference(laura));
    cancelled.pullDomainEvents();
    cancelled.activateAfterPayment();
    expect(cancelled.status.value).toBe(EnrollmentStatus.CANCELLED);
    expect(cancelled.pullDomainEvents()).toEqual([]);
  });

  it('only an active enrollment is completed', () => {
    expect(() => aPendingEnrollment().complete()).toThrow(EnrollmentNotCompletable);
    const enrollment = anActiveEnrollment();
    enrollment.complete();
    expect(enrollment.status.value).toBe(EnrollmentStatus.COMPLETED);
    expect(enrollment.holdsSeat()).toBe(true);
  });
});
