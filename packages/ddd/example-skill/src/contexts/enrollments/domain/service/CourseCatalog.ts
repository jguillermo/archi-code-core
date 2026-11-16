import type { Money } from '../../../shared-kernel/money/Money';
import type { CourseReference } from '../value-object/CourseReference';

export interface CourseCatalog {
  feeOfOpenCourse(course: CourseReference): Promise<Money | null>;
}
