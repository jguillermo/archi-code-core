import type { OpenCourse } from './open-course';

export interface OpenCourseStore {
  find(courseId: string): Promise<OpenCourse | null>;
  hasApplied(eventId: string): Promise<boolean>;
  save(course: OpenCourse, eventId: string): Promise<void>;
}
