import type { StudentEnrollment } from './student-enrollment';

export interface MyEnrollments {
  ofStudent(studentId: string): Promise<StudentEnrollment[]>;
}
