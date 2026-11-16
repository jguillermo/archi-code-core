import type { OpenCourse } from '../../application/open-catalog/open-course';
import type { OpenCourseStore } from '../../application/open-catalog/open-course-store';
import type { OpenCourses } from '../../application/open-catalog/open-courses';

export class InMemoryOpenCourseStore implements OpenCourseStore, OpenCourses {
  private readonly courses = new Map<string, OpenCourse>();
  private readonly appliedEvents = new Set<string>();

  async find(courseId: string): Promise<OpenCourse | null> {
    return this.byId(courseId);
  }

  async hasApplied(eventId: string): Promise<boolean> {
    return this.appliedEvents.has(eventId);
  }

  async save(course: OpenCourse, eventId: string): Promise<void> {
    this.courses.set(course.courseId, structuredClone(course));
    this.appliedEvents.add(eventId);
  }

  async byId(courseId: string): Promise<OpenCourse | null> {
    const course = this.courses.get(courseId);
    return course === undefined ? null : structuredClone(course);
  }

  async open(): Promise<OpenCourse[]> {
    return [...this.courses.values()]
      .filter((course) => course.published && !course.archived)
      .map((course) => structuredClone(course));
  }
}
