import { Entity } from '@archi-code/ddd/domain';
import { LessonDuration } from '../value-object/LessonDuration';
import { LessonNumber } from '../value-object/LessonNumber';
import { LessonTitle } from '../value-object/LessonTitle';

export class Lesson extends Entity<LessonNumber> {
  private _title: LessonTitle;
  readonly duration: LessonDuration;

  constructor(id: LessonNumber, title: LessonTitle, duration: LessonDuration) {
    super(id);
    this._title = title;
    this.duration = duration;
  }

  get title(): LessonTitle {
    return this._title;
  }

  isTitled(title: LessonTitle): boolean {
    return this._title.equals(title);
  }

  rename(title: LessonTitle): void {
    this._title = title;
  }
}
