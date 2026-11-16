import { InternalErrorException } from '@archi-code/ddd/infrastructure';
import { Money } from '../../../shared-kernel/money/Money';
import type { Currency } from '../../../shared-kernel/money/MoneyCurrency';
import type { OpenCourses } from '../../application/open-catalog/open-courses';
import type { CourseCatalog } from '../../domain/service/CourseCatalog';
import type { CourseReference } from '../../domain/value-object/CourseReference';

export class ReadModelCourseCatalog implements CourseCatalog {
  constructor(private readonly openCourses: OpenCourses) {}

  async feeOfOpenCourse(course: CourseReference): Promise<Money | null> {
    const row = await this.openCourses.byId(course.value);
    if (row === null || !row.published || row.archived || row.price === null) {
      return null;
    }
    try {
      return Money.fromPrimitives(row.price as { amount: number; currency: Currency });
    } catch (error) {
      throw new InternalErrorException(`reading the fee of course ${course.value}`, {
        cause: error,
      });
    }
  }
}
