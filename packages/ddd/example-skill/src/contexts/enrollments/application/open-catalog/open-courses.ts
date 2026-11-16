import type { OpenCourse } from './open-course';

export interface OpenCourses {
  byId(courseId: string): Promise<OpenCourse | null>;
  open(): Promise<OpenCourse[]>;
}
