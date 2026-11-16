import type { CreatedAt, UuidType } from '@archi-code/ddd/domain';
import type { EnrollmentId } from '../../domain/value-object/EnrollmentId';
import type { StudentEnrollmentChanges } from './student-enrollment';
import type { StudentEnrollmentStore } from './student-enrollment-store';

export interface StudentEnrollmentChange {
  eventId: UuidType;
  enrollmentId: EnrollmentId;
  occurredOn: CreatedAt;
  changes: StudentEnrollmentChanges;
}

export class StudentEnrollmentProjection {
  constructor(private readonly store: StudentEnrollmentStore) {}

  async apply({
    eventId,
    enrollmentId,
    occurredOn,
    changes,
  }: StudentEnrollmentChange): Promise<void> {
    const appliedEventId = eventId.toString();
    if (await this.store.hasApplied(appliedEventId)) {
      return;
    }
    const at = occurredOn.toString();
    const current = (await this.store.find(enrollmentId.value)) ?? {
      enrollmentId: enrollmentId.value,
      studentId: null,
      courseId: null,
      fee: null,
      activated: false,
      cancelled: false,
      completed: false,
      lastEventAt: at,
    };
    const lastEventAt = current.lastEventAt > at ? current.lastEventAt : at;
    await this.store.save({ ...current, ...changes, lastEventAt }, appliedEventId);
  }
}
