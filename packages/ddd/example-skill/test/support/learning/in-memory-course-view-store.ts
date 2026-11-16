import type { CourseView } from '../../../src/contexts/learning/application/course-views/course-view';
import type { CourseViewStore } from '../../../src/contexts/learning/application/course-views/course-view-store';

export class InMemoryCourseViewStore implements CourseViewStore {
  private readonly views = new Map<string, CourseView>();
  private readonly appliedEvents = new Set<string>();

  async find(courseId: string): Promise<CourseView | null> {
    const view = this.views.get(courseId);
    return view === undefined ? null : structuredClone(view);
  }

  async hasApplied(eventId: string): Promise<boolean> {
    return this.appliedEvents.has(eventId);
  }

  async save(view: CourseView, eventId: string): Promise<void> {
    this.views.set(view.courseId, structuredClone(view));
    this.appliedEvents.add(eventId);
  }
}
