import type { MyEnrollments } from '../../application/my-enrollments/my-enrollments';
import type { StudentEnrollment } from '../../application/my-enrollments/student-enrollment';
import type { StudentEnrollmentStore } from '../../application/my-enrollments/student-enrollment-store';

export class InMemoryStudentEnrollmentStore implements StudentEnrollmentStore, MyEnrollments {
  private readonly enrollments = new Map<string, StudentEnrollment>();
  private readonly appliedEvents = new Set<string>();

  async find(enrollmentId: string): Promise<StudentEnrollment | null> {
    const enrollment = this.enrollments.get(enrollmentId);
    return enrollment === undefined ? null : structuredClone(enrollment);
  }

  async hasApplied(eventId: string): Promise<boolean> {
    return this.appliedEvents.has(eventId);
  }

  async save(enrollment: StudentEnrollment, eventId: string): Promise<void> {
    this.enrollments.set(enrollment.enrollmentId, structuredClone(enrollment));
    this.appliedEvents.add(eventId);
  }

  async ofStudent(studentId: string): Promise<StudentEnrollment[]> {
    return [...this.enrollments.values()]
      .filter((enrollment) => enrollment.studentId === studentId)
      .map((enrollment) => structuredClone(enrollment));
  }
}
