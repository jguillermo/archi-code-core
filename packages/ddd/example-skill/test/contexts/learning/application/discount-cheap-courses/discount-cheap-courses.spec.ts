import { describe, expect, it } from 'vitest';
import { NotAllowedException } from '@archi-code/ddd/application';
import {
  DomainEventBus,
  EventRegistry,
  InMemoryEventChannel,
  InMemoryLogger,
} from '@archi-code/ddd/infrastructure';
import { DiscountCheapCourses } from '../../../../../src/contexts/learning/application/discount-cheap-courses/discount-cheap-courses';
import { aDraftCourse, aPublishedCourse } from '../../../../support/learning/course-fixtures';
import { InMemoryCourseRepository } from '../../../../support/learning/in-memory-course-repository';

function learning() {
  const courses = new InMemoryCourseRepository();
  const channel = new InMemoryEventChannel();
  const logger = new InMemoryLogger();
  const bus = new DomainEventBus(channel, new EventRegistry());
  return { courses, channel, logger, discount: new DiscountCheapCourses(courses, bus, logger) };
}

describe('DiscountCheapCourses', () => {
  it('lowers by 10% every published course cheaper than the limit, in pages', async () => {
    const { courses, channel, logger, discount } = learning();
    const cheap = Array.from({ length: 60 }, () => aPublishedCourse({ cents: 1_000 }));
    for (const course of [
      ...cheap,
      aPublishedCourse({ cents: 9_900 }),
      aPublishedCourse({ cents: 1_000, currency: 'USD' }),
      aDraftCourse({ cents: 1_000 }),
    ]) {
      await courses.save(course);
    }

    await discount.execute({ actorRole: 'editor', below: { amount: 5_000, currency: 'EUR' } });

    const discounted = channel.sent.filter((event) => event.eventName === 'course.discounted');
    expect(discounted).toHaveLength(60);
    expect(discounted[0]).toMatchObject({ price: { amount: 900, currency: 'EUR' } });
    expect((await courses.findById(cheap[0].id))?.price.toPrimitives()).toEqual({
      amount: 900,
      currency: 'EUR',
    });
    expect(logger.entries).toMatchObject([
      { level: 'info', message: 'cheap_courses_discounted', context: { discounted: 60 } },
    ]);
  });

  it('only an editor may discount courses', async () => {
    const { channel, discount } = learning();
    await expect(
      discount.execute({ actorRole: 'teacher', below: { amount: 5_000, currency: 'EUR' } }),
    ).rejects.toBeInstanceOf(NotAllowedException);
    expect(channel.sent).toEqual([]);
  });
});
