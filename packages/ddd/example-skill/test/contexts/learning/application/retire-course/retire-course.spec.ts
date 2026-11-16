import { describe, expect, it } from 'vitest';
import {
  DomainEventBus,
  EventRegistry,
  InMemoryEventChannel,
} from '@archi-code/ddd/infrastructure';
import { RetireCourse } from '../../../../../src/contexts/learning/application/retire-course/retire-course';
import { CourseNotFound } from '../../../../../src/contexts/learning/domain/exception/CourseNotFound';
import { CourseStatus } from '../../../../../src/contexts/learning/domain/value-object/CourseStatusType';
import { aDraftCourse, aPublishedCourse } from '../../../../support/learning/course-fixtures';
import { InMemoryCourseRepository } from '../../../../support/learning/in-memory-course-repository';

function learning() {
  const courses = new InMemoryCourseRepository();
  const channel = new InMemoryEventChannel();
  const retire = new RetireCourse(courses, new DomainEventBus(channel, new EventRegistry()));
  return { courses, channel, retire };
}

describe('RetireCourse', () => {
  it('deletes a course that is still a draft', async () => {
    const { courses, channel, retire } = learning();
    const course = aDraftCourse();
    await courses.save(course);
    await retire.execute({ actorRole: 'editor', courseId: course.id.value });
    expect(await courses.findById(course.id)).toBeNull();
    expect(channel.sent.map((event) => event.eventName)).toEqual(['course.discarded']);
  });

  it('archives a published course', async () => {
    const { courses, channel, retire } = learning();
    const course = aPublishedCourse();
    await courses.save(course);
    await retire.execute({ actorRole: 'editor', courseId: course.id.value });
    expect((await courses.findById(course.id))?.status.value).toBe(CourseStatus.ARCHIVED);
    expect(channel.sent.map((event) => event.eventName)).toEqual(['course.archived']);
  });

  it('cannot retire a course that is not in the catalog', async () => {
    const { retire } = learning();
    await expect(
      retire.execute({ actorRole: 'editor', courseId: crypto.randomUUID() }),
    ).rejects.toBeInstanceOf(CourseNotFound);
  });
});
