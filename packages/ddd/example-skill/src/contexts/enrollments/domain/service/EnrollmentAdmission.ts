import type { Money } from '../../../shared-kernel/money/Money';
import type { Enrollment } from '../aggregate/Enrollment';
import { AlreadyEnrolled } from '../exception/AlreadyEnrolled';
import { CourseNotOpen } from '../exception/CourseNotOpen';
import type { CourseReference } from '../value-object/CourseReference';
import type { StudentReference } from '../value-object/StudentReference';
import type { CourseCatalog } from './CourseCatalog';

export class EnrollmentAdmission {
  constructor(private readonly catalog: CourseCatalog) {}

  async feeToAdmit(
    student: StudentReference,
    course: CourseReference,
    enrollmentsInCourse: Enrollment[],
  ): Promise<Money> {
    if (enrollmentsInCourse.some((enrollment) => enrollment.holdsSeat())) {
      throw new AlreadyEnrolled(student.value, course.value);
    }
    const fee = await this.catalog.feeOfOpenCourse(course);
    if (fee === null) {
      throw new CourseNotOpen(course.value);
    }
    return fee;
  }
}
