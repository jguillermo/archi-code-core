import type { MoneyData } from '../create-course/money-data';

export interface CourseViewLesson {
  number: number;
  title: string;
  durationMinutes: number;
}

export interface CourseView {
  courseId: string;
  title: string | null;
  price: MoneyData | null;
  priceOn: string | null;
  lessons: CourseViewLesson[];
  lessonsOn: string | null;
  created: boolean;
  published: boolean;
  archived: boolean;
  discarded: boolean;
  lastEventAt: string;
}

export type CourseViewChanges = Partial<
  Pick<
    CourseView,
    'title' | 'price' | 'lessons' | 'created' | 'published' | 'archived' | 'discarded'
  >
>;
