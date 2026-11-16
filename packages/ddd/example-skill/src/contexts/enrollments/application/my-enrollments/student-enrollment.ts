import type { MoneyData } from '../open-catalog/money-data';

export interface StudentEnrollment {
  enrollmentId: string;
  studentId: string | null;
  courseId: string | null;
  fee: MoneyData | null;
  activated: boolean;
  cancelled: boolean;
  completed: boolean;
  lastEventAt: string;
}

export type StudentEnrollmentChanges = Partial<
  Pick<
    StudentEnrollment,
    'studentId' | 'courseId' | 'fee' | 'activated' | 'cancelled' | 'completed'
  >
>;
