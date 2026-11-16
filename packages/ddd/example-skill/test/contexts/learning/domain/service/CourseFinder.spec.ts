import { describe, expect, it, vi } from 'vitest';
import type { Course } from '../../../../../src/contexts/learning/domain/aggregate/Course';
import { CourseAlreadyExists } from '../../../../../src/contexts/learning/domain/exception/CourseAlreadyExists';
import { CourseNotFound } from '../../../../../src/contexts/learning/domain/exception/CourseNotFound';
import type { CourseRepository } from '../../../../../src/contexts/learning/domain/repository/CourseRepository';
import { CourseFinder } from '../../../../../src/contexts/learning/domain/service/CourseFinder';
import { CourseId } from '../../../../../src/contexts/learning/domain/value-object/CourseId';
import { aDraftCourse } from '../../../../support/learning/course-fixtures';

function coursesFinding(course: Course | null): CourseRepository {
  return { findById: vi.fn().mockResolvedValue(course) } as unknown as CourseRepository;
}

describe('CourseFinder', () => {
  it('finds a course of the catalog', async () => {
    const course = aDraftCourse();
    await expect(new CourseFinder(coursesFinding(course)).find(course.id)).resolves.toBe(course);
  });

  it('a course that is not in the catalog cannot be found', async () => {
    await expect(
      new CourseFinder(coursesFinding(null)).find(CourseId.generate()),
    ).rejects.toBeInstanceOf(CourseNotFound);
  });

  it('a new course may not take the id of an existing one', async () => {
    const course = aDraftCourse();
    await expect(
      new CourseFinder(coursesFinding(course)).assertDoesNotExist(course.id),
    ).rejects.toBeInstanceOf(CourseAlreadyExists);
    await expect(
      new CourseFinder(coursesFinding(null)).assertDoesNotExist(course.id),
    ).resolves.toBeUndefined();
  });
});
