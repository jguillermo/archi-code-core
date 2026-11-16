import { IndexedDbTable } from '@archi-code/ddd/infrastructure';
import type { MoneyData } from '../../application/create-course/money-data';
import type { CourseView } from '../../application/course-views/course-view';
import type { CourseViewStore } from '../../application/course-views/course-view-store';
import type { CourseViews } from '../../application/course-views/course-views';

interface CourseViewRow {
  id: string;
  view: CourseView;
}

interface AppliedEventRow {
  id: string;
}

export class IndexedDbCourseViewStore implements CourseViewStore, CourseViews {
  private static readonly views = IndexedDbTable.of<CourseViewRow>('course_views', {
    database: 'learning',
  });
  private static readonly appliedEvents = IndexedDbTable.of<AppliedEventRow>(
    'course_view_applied_events',
    { database: 'learning' },
  );

  async find(courseId: string): Promise<CourseView | null> {
    const row = await IndexedDbCourseViewStore.views.get(courseId);
    return row === null ? null : row.view;
  }

  async hasApplied(eventId: string): Promise<boolean> {
    return IndexedDbCourseViewStore.appliedEvents.exists(eventId);
  }

  async save(view: CourseView, eventId: string): Promise<void> {
    const { views, appliedEvents } = IndexedDbCourseViewStore;
    await IndexedDbTable.transaction([views, appliedEvents], 'readwrite', async (tx) => {
      await tx.put(views, { id: view.courseId, view });
      await tx.put(appliedEvents, { id: eventId });
    });
  }

  async byId(courseId: string): Promise<CourseView | null> {
    return this.find(courseId);
  }

  async publishedCheaperThan(price: MoneyData): Promise<CourseView[]> {
    const { items } = await IndexedDbCourseViewStore.views.find({
      filter: ({ view }) =>
        view.published &&
        !view.archived &&
        !view.discarded &&
        view.price !== null &&
        view.price.currency === price.currency &&
        view.price.amount < price.amount,
    });
    return items
      .map((row) => row.view)
      .sort((a, b) => (a.price?.amount ?? 0) - (b.price?.amount ?? 0));
  }
}
