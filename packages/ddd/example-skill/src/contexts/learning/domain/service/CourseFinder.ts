import type { Course } from '../aggregate/Course';
import { CourseAlreadyExists } from '../exception/CourseAlreadyExists';
import { CourseNotFound } from '../exception/CourseNotFound';
import type { CourseRepository } from '../repository/CourseRepository';
import type { CourseId } from '../value-object/CourseId';

export class CourseFinder {
  constructor(private readonly courses: CourseRepository) {}

  async find(id: CourseId): Promise<Course> {
    const course = await this.courses.findById(id);
    if (course === null) {
      throw new CourseNotFound(id.value);
    }
    return course;
  }

  async assertDoesNotExist(id: CourseId): Promise<void> {
    if ((await this.courses.findById(id)) !== null) {
      throw new CourseAlreadyExists(id.value);
    }
  }
}
