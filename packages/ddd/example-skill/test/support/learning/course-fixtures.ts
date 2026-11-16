import { Money } from '../../../src/contexts/shared-kernel/money/Money';
import type { Currency } from '../../../src/contexts/shared-kernel/money/MoneyCurrency';
import { Course } from '../../../src/contexts/learning/domain/aggregate/Course';
import { CourseId } from '../../../src/contexts/learning/domain/value-object/CourseId';
import { CourseTitle } from '../../../src/contexts/learning/domain/value-object/CourseTitle';
import { LessonDuration } from '../../../src/contexts/learning/domain/value-object/LessonDuration';
import { LessonTitle } from '../../../src/contexts/learning/domain/value-object/LessonTitle';

export interface CourseOptions {
  id?: CourseId;
  cents?: number;
  currency?: string;
  lessons?: number;
}

export function aDraftCourse({
  id = CourseId.generate(),
  cents = 4_900,
  currency = 'EUR',
  lessons = 3,
}: CourseOptions = {}): Course {
  return Course.create(
    id,
    new CourseTitle('MIG welding for beginners'),
    Money.fromPrimitives({ amount: cents, currency: currency as Currency }),
    Array.from({ length: lessons }, (_, index) => ({
      title: new LessonTitle(`Lesson ${index + 1}`),
      duration: new LessonDuration(45),
    })),
  );
}

export function aPublishedCourse(options: CourseOptions = {}): Course {
  const course = aDraftCourse(options);
  course.publish();
  course.pullDomainEvents();
  return course;
}

export function euros(cents: number): Money {
  return Money.fromPrimitives({ amount: cents, currency: 'EUR' as Currency });
}
