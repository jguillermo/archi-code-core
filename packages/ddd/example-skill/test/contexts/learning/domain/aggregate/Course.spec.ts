import { describe, expect, it } from 'vitest';
import { CourseRetirement } from '../../../../../src/contexts/learning/domain/aggregate/CourseRetirement';
import { Course } from '../../../../../src/contexts/learning/domain/aggregate/Course';
import { CourseAlreadyRetired } from '../../../../../src/contexts/learning/domain/exception/CourseAlreadyRetired';
import { CourseNotDiscountable } from '../../../../../src/contexts/learning/domain/exception/CourseNotDiscountable';
import { CourseNotEditable } from '../../../../../src/contexts/learning/domain/exception/CourseNotEditable';
import { CourseNotPublishable } from '../../../../../src/contexts/learning/domain/exception/CourseNotPublishable';
import { DuplicateLessonTitle } from '../../../../../src/contexts/learning/domain/exception/DuplicateLessonTitle';
import { LessonCountOutOfRange } from '../../../../../src/contexts/learning/domain/exception/LessonCountOutOfRange';
import { LessonNotFound } from '../../../../../src/contexts/learning/domain/exception/LessonNotFound';
import { CourseId } from '../../../../../src/contexts/learning/domain/value-object/CourseId';
import { CourseStatus } from '../../../../../src/contexts/learning/domain/value-object/CourseStatusType';
import { CourseTitle } from '../../../../../src/contexts/learning/domain/value-object/CourseTitle';
import { LessonDuration } from '../../../../../src/contexts/learning/domain/value-object/LessonDuration';
import { LessonNumber } from '../../../../../src/contexts/learning/domain/value-object/LessonNumber';
import { LessonTitle } from '../../../../../src/contexts/learning/domain/value-object/LessonTitle';
import {
  aDraftCourse,
  aPublishedCourse,
  euros,
} from '../../../../support/learning/course-fixtures';

describe('Course', () => {
  it('keeps every field, lessons included, when stored and loaded', () => {
    const course = aPublishedCourse({ lessons: 4 });
    course.renameLesson(new LessonNumber(2), new LessonTitle('Choosing the wire'));
    expect(Course.fromPrimitives(course.toPrimitives()).toPrimitives()).toEqual(
      course.toPrimitives(),
    );
  });

  it('is created as a draft with numbered lessons and announces it', () => {
    const course = aDraftCourse({ lessons: 2 });
    expect(course.status.value).toBe(CourseStatus.DRAFT);
    expect(course.lessons.map((lesson) => lesson.id.value)).toEqual([1, 2]);
    expect(Number.isNaN(course.createdAt.value.getTime())).toBe(false);
    expect(course.pullDomainEvents().map((event) => ({ ...event }))).toMatchObject([
      {
        eventName: 'course.created',
        courseId: course.id.value,
        price: { amount: 4_900, currency: 'EUR' },
      },
    ]);
  });

  it('cleans the title into one line', () => {
    expect(new CourseTitle('  TIG \n welding ').value).toBe('TIG welding');
  });

  it('holds from 1 to 50 lessons with unique titles', () => {
    expect(() => aDraftCourse({ lessons: 0 })).toThrow(LessonCountOutOfRange);
    expect(() => aDraftCourse({ lessons: 51 })).toThrow(LessonCountOutOfRange);
    expect(() =>
      Course.create(CourseId.generate(), new CourseTitle('Brazing'), euros(1_000), [
        { title: new LessonTitle('Torches'), duration: new LessonDuration(20) },
        { title: new LessonTitle('Torches'), duration: new LessonDuration(30) },
      ]),
    ).toThrow(DuplicateLessonTitle);
  });

  it('renames a lesson unless the title is taken, the lesson is missing or the course archived', () => {
    const course = aPublishedCourse();
    expect(() => course.renameLesson(new LessonNumber(1), new LessonTitle('Lesson 2'))).toThrow(
      DuplicateLessonTitle,
    );
    expect(() => course.renameLesson(new LessonNumber(9), new LessonTitle('Extra'))).toThrow(
      LessonNotFound,
    );
    course.retire();
    expect(() => course.renameLesson(new LessonNumber(1), new LessonTitle('Intro'))).toThrow(
      CourseNotEditable,
    );
  });

  it('publishes only a draft with at least three lessons', () => {
    expect(() => aDraftCourse({ lessons: 2 }).publish()).toThrow(CourseNotPublishable);
    const course = aPublishedCourse();
    expect(() => course.publish()).toThrow(CourseNotPublishable);
  });

  it('a draft is discarded and a published course archived when retired', () => {
    expect(aDraftCourse().retire()).toBe(CourseRetirement.DISCARDED);
    const course = aPublishedCourse();
    expect(course.retire()).toBe(CourseRetirement.ARCHIVED);
    expect(course.status.value).toBe(CourseStatus.ARCHIVED);
    expect(() => course.retire()).toThrow(CourseAlreadyRetired);
  });

  it('gives 10% off a published course under the limit, and refuses any other', () => {
    const course = aPublishedCourse({ cents: 2_999 });
    course.discountAsCheaperThan(euros(3_000));
    expect(course.price.toPrimitives()).toEqual({ amount: 2_700, currency: 'EUR' });
    expect(() => aPublishedCourse({ cents: 5_000 }).discountAsCheaperThan(euros(3_000))).toThrow(
      CourseNotDiscountable,
    );
    expect(() => aDraftCourse({ cents: 1_000 }).discountAsCheaperThan(euros(3_000))).toThrow(
      CourseNotDiscountable,
    );
  });
});
