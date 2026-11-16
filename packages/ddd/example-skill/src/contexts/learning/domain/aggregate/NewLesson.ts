import type { LessonDuration } from '../value-object/LessonDuration';
import type { LessonTitle } from '../value-object/LessonTitle';

export interface NewLesson {
  title: LessonTitle;
  duration: LessonDuration;
}
