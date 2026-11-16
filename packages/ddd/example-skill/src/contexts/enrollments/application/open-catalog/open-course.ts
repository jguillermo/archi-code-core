import type { MoneyData } from './money-data';

export interface OpenCourse {
  courseId: string;
  title: string | null;
  price: MoneyData | null;
  priceOn: string | null;
  published: boolean;
  archived: boolean;
  lastEventAt: string;
}

export type OpenCourseChanges = Partial<
  Pick<OpenCourse, 'title' | 'price' | 'published' | 'archived'>
>;
