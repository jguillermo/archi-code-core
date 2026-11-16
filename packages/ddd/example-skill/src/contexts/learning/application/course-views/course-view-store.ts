import type { CourseView } from './course-view';

export interface CourseViewStore {
  find(courseId: string): Promise<CourseView | null>;
  hasApplied(eventId: string): Promise<boolean>;
  save(view: CourseView, eventId: string): Promise<void>;
}
