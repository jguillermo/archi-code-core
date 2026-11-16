import { expect, it } from 'vitest';
import { Criteria } from '@archi-code/ddd/domain';
import { ConcurrencyException } from '@archi-code/ddd/application';
import type { Course } from '../../../src/contexts/learning/domain/aggregate/Course';
import type { CourseRepository } from '../../../src/contexts/learning/domain/repository/CourseRepository';
import {
  CourseStatus,
  CourseStatusType,
} from '../../../src/contexts/learning/domain/value-object/CourseStatusType';
import { LessonNumber } from '../../../src/contexts/learning/domain/value-object/LessonNumber';
import { LessonTitle } from '../../../src/contexts/learning/domain/value-object/LessonTitle';
import { aDraftCourse, aPublishedCourse, euros } from './course-fixtures';

async function loaded(courses: CourseRepository, course: Course): Promise<Course> {
  const found = await courses.findById(course.id);
  expect(found).not.toBeNull();
  return found as Course;
}

export function courseRepositoryContract(make: () => Promise<CourseRepository>): void {
  it('loads the course it saved', async () => {
    const courses = await make();
    const course = aDraftCourse();
    await courses.save(course);
    expect((await courses.findById(course.id))?.toPrimitives()).toEqual(course.toPrimitives());
  });

  it('saves the same course twice', async () => {
    const courses = await make();
    const course = aDraftCourse();
    await courses.save(course);
    course.publish();
    await courses.save(course);
    expect((await courses.findById(course.id))?.status.value).toBe(CourseStatus.PUBLISHED);
  });

  it('refuses to save a course another editor changed first', async () => {
    const courses = await make();
    const course = aDraftCourse();
    await courses.save(course);
    const first = await loaded(courses, course);
    const second = await loaded(courses, course);
    first.renameLesson(new LessonNumber(1), new LessonTitle('Safety first'));
    await courses.save(first);
    second.publish();
    await expect(courses.save(second)).rejects.toBeInstanceOf(ConcurrencyException);
  });

  it('refuses a new course whose id is taken', async () => {
    const courses = await make();
    const course = aDraftCourse();
    await courses.save(course);
    await expect(courses.save(aDraftCourse({ id: course.id }))).rejects.toBeInstanceOf(
      ConcurrencyException,
    );
  });

  it('refuses to remove a course another editor changed', async () => {
    const courses = await make();
    const course = aDraftCourse();
    await courses.save(course);
    const stale = await loaded(courses, course);
    course.publish();
    await courses.save(course);
    await expect(courses.remove(stale)).rejects.toBeInstanceOf(ConcurrencyException);
  });

  it('forgets a removed course', async () => {
    const courses = await make();
    const course = aDraftCourse();
    await courses.save(course);
    await courses.remove(course);
    expect(await courses.findById(course.id)).toBeNull();
  });

  it('searches the published courses under a price, page by page', async () => {
    const courses = await make();
    const cheap = [aPublishedCourse({ cents: 1_000 }), aPublishedCourse({ cents: 2_000 })];
    for (const course of [
      ...cheap,
      aPublishedCourse({ cents: 9_000 }),
      aPublishedCourse({ cents: 1_000, currency: 'USD' }),
      aDraftCourse({ cents: 1_000 }),
    ]) {
      await courses.save(course);
    }
    const below = euros(5_000);
    const criteria = Criteria.create<Course>({
      where: {
        status: new CourseStatusType(CourseStatus.PUBLISHED),
        'price.currency': below.currency,
        'price.amount': { lt: below.amount },
      },
      orderBy: { id: 'asc' },
      limit: 1,
    });
    const first = await courses.search(criteria, { withTotal: true });
    const second = await courses.search(criteria.page(2, 1));
    expect(first.total).toBe(2);
    expect([...first.items, ...second.items].map((course) => course.id.value)).toEqual(
      cheap.map((course) => course.id.value).sort(),
    );
  });
}
