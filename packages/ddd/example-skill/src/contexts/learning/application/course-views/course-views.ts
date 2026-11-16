import type { MoneyData } from '../create-course/money-data';
import type { CourseView } from './course-view';

export interface CourseViews {
  byId(courseId: string): Promise<CourseView | null>;
  publishedCheaperThan(price: MoneyData): Promise<CourseView[]>;
}
