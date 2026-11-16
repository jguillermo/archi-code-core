import { AggregateRoot, CreatedAt, UpdatedAt } from '@archi-code/ddd/domain';
import type { PrimitiveTypes } from '@archi-code/ddd/domain';
import { Money } from '../../../shared-kernel/money/Money';
import { Lesson } from '../entity/Lesson';
import { CourseArchivedDomainEvent } from '../event/CourseArchivedDomainEvent';
import { CourseCreatedDomainEvent } from '../event/CourseCreatedDomainEvent';
import { CourseDiscardedDomainEvent } from '../event/CourseDiscardedDomainEvent';
import { CourseDiscountedDomainEvent } from '../event/CourseDiscountedDomainEvent';
import { CourseLessonRenamedDomainEvent } from '../event/CourseLessonRenamedDomainEvent';
import { CoursePublishedDomainEvent } from '../event/CoursePublishedDomainEvent';
import { CourseAlreadyRetired } from '../exception/CourseAlreadyRetired';
import { CourseNotDiscountable } from '../exception/CourseNotDiscountable';
import { CourseNotEditable } from '../exception/CourseNotEditable';
import { CourseNotPublishable } from '../exception/CourseNotPublishable';
import { DuplicateLessonTitle } from '../exception/DuplicateLessonTitle';
import { LessonCountOutOfRange } from '../exception/LessonCountOutOfRange';
import { LessonNotFound } from '../exception/LessonNotFound';
import { CourseId } from '../value-object/CourseId';
import { CourseStatus, CourseStatusType } from '../value-object/CourseStatusType';
import { CourseTitle } from '../value-object/CourseTitle';
import { LessonDuration } from '../value-object/LessonDuration';
import { LessonNumber } from '../value-object/LessonNumber';
import { LessonTitle } from '../value-object/LessonTitle';
import { CourseRetirement } from './CourseRetirement';
import type { NewLesson } from './NewLesson';

export class Course extends AggregateRoot<CourseId> {
  private static readonly MIN_LESSONS = 1;
  private static readonly MAX_LESSONS = 50;
  private static readonly MIN_LESSONS_TO_PUBLISH = 3;
  private static readonly CHEAP_COURSE_DISCOUNT_PERCENT = 10;

  readonly title: CourseTitle;
  private _price: Money;
  private _status: CourseStatusType;
  private _lessons: Lesson[];
  readonly createdAt: CreatedAt;
  private _updatedAt: UpdatedAt;

  constructor(
    id: CourseId,
    title: CourseTitle,
    price: Money,
    status: CourseStatusType,
    lessons: Lesson[],
    createdAt: CreatedAt,
    updatedAt: UpdatedAt,
  ) {
    super(id);
    this.title = title;
    this._price = price;
    this._status = status;
    this._lessons = lessons;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static create(id: CourseId, title: CourseTitle, price: Money, lessons: NewLesson[]): Course {
    if (lessons.length < Course.MIN_LESSONS || lessons.length > Course.MAX_LESSONS) {
      throw new LessonCountOutOfRange(lessons.length);
    }
    const course = new Course(
      id,
      title,
      price,
      new CourseStatusType(CourseStatus.DRAFT),
      lessons.map(
        (lesson, index) => new Lesson(new LessonNumber(index + 1), lesson.title, lesson.duration),
      ),
      CreatedAt.now(),
      UpdatedAt.now(),
    );
    course.assertUniqueLessonTitles();
    course.record(
      new CourseCreatedDomainEvent({
        courseId: course.id.value,
        title: title.value,
        price: price.toPrimitives(),
        lessons: course.lessonData(),
      }),
    );
    return course;
  }

  static fromPrimitives(primitives: PrimitiveTypes<Course>): Course {
    return new Course(
      new CourseId(primitives.id),
      new CourseTitle(primitives.title),
      Money.fromPrimitives(primitives.price),
      new CourseStatusType(primitives.status),
      primitives.lessons.map(
        (lesson) =>
          new Lesson(
            new LessonNumber(lesson.id),
            new LessonTitle(lesson.title),
            new LessonDuration(lesson.duration),
          ),
      ),
      new CreatedAt(primitives.createdAt),
      new UpdatedAt(primitives.updatedAt),
    );
  }

  get price(): Money {
    return this._price;
  }

  get status(): CourseStatusType {
    return this._status;
  }

  get lessons(): Lesson[] {
    return [...this._lessons];
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  isIn(status: CourseStatus): boolean {
    return this._status.value === status;
  }

  renameLesson(number: LessonNumber, title: LessonTitle): void {
    if (this.isIn(CourseStatus.ARCHIVED)) {
      throw new CourseNotEditable(this.id.value);
    }
    const lesson = this._lessons.find((candidate) => candidate.id.equals(number));
    if (lesson === undefined) {
      throw new LessonNotFound(this.id.value, number.value);
    }
    if (this._lessons.some((other) => !other.equals(lesson) && other.isTitled(title))) {
      throw new DuplicateLessonTitle(this.id.value, title.value);
    }
    lesson.rename(title);
    this.touch();
    this.record(
      new CourseLessonRenamedDomainEvent({
        courseId: this.id.value,
        lessonNumber: number.value,
        title: title.value,
        lessons: this.lessonData(),
      }),
    );
  }

  publish(): void {
    if (!this.isIn(CourseStatus.DRAFT) || this._lessons.length < Course.MIN_LESSONS_TO_PUBLISH) {
      throw new CourseNotPublishable(this.id.value, this._status.value, this._lessons.length);
    }
    this.moveTo(CourseStatus.PUBLISHED);
    this.record(
      new CoursePublishedDomainEvent({
        courseId: this.id.value,
        title: this.title.value,
        price: this._price.toPrimitives(),
      }),
    );
  }

  retire(): CourseRetirement {
    if (this.isIn(CourseStatus.ARCHIVED)) {
      throw new CourseAlreadyRetired(this.id.value);
    }
    if (this.isIn(CourseStatus.DRAFT)) {
      this.record(new CourseDiscardedDomainEvent({ courseId: this.id.value }));
      return CourseRetirement.DISCARDED;
    }
    this.moveTo(CourseStatus.ARCHIVED);
    this.record(new CourseArchivedDomainEvent({ courseId: this.id.value }));
    return CourseRetirement.ARCHIVED;
  }

  discountAsCheaperThan(limit: Money): void {
    if (!this.isIn(CourseStatus.PUBLISHED) || !this._price.isCheaperThan(limit)) {
      throw new CourseNotDiscountable(this.id.value);
    }
    this._price = this._price.minusPercent(Course.CHEAP_COURSE_DISCOUNT_PERCENT);
    this.touch();
    this.record(
      new CourseDiscountedDomainEvent({
        courseId: this.id.value,
        price: this._price.toPrimitives(),
      }),
    );
  }

  toPrimitives(): PrimitiveTypes<Course> {
    return {
      id: this.id.value,
      title: this.title.value,
      price: this._price.toPrimitives(),
      status: this._status.value,
      lessons: this._lessons.map((lesson) => ({
        id: lesson.id.value,
        title: lesson.title.value,
        duration: lesson.duration.value,
      })),
      createdAt: this.createdAt.value,
      updatedAt: this._updatedAt.value,
    };
  }

  private assertUniqueLessonTitles(): void {
    const seen: LessonTitle[] = [];
    for (const lesson of this._lessons) {
      if (seen.some((title) => title.equals(lesson.title))) {
        throw new DuplicateLessonTitle(this.id.value, lesson.title.value);
      }
      seen.push(lesson.title);
    }
  }

  private lessonData(): { number: number; title: string; durationMinutes: number }[] {
    return this._lessons.map((lesson) => ({
      number: lesson.id.value,
      title: lesson.title.value,
      durationMinutes: lesson.duration.value,
    }));
  }

  private moveTo(status: CourseStatus): void {
    this._status = new CourseStatusType(status);
    this.touch();
  }

  private touch(): void {
    this._updatedAt = UpdatedAt.now();
  }
}
