import type { StudentEnrollment } from './student-enrollment';

export interface StudentEnrollmentStore {
  find(enrollmentId: string): Promise<StudentEnrollment | null>;
  hasApplied(eventId: string): Promise<boolean>;
  save(enrollment: StudentEnrollment, eventId: string): Promise<void>;
}
