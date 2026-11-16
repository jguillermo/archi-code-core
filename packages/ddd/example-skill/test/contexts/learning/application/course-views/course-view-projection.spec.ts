import { describe, expect, it } from 'vitest';
import { CreatedAt, UuidType } from '@archi-code/ddd/domain';
import { CourseViewProjection } from '../../../../../src/contexts/learning/application/course-views/course-view-projection';
import { CourseId } from '../../../../../src/contexts/learning/domain/value-object/CourseId';
import { InMemoryCourseViewStore } from '../../../../support/learning/in-memory-course-view-store';

describe('CourseViewProjection', () => {
  it('applies an event once and keeps the newest price when events arrive out of order', async () => {
    const store = new InMemoryCourseViewStore();
    const projection = new CourseViewProjection(store);
    const courseId = CourseId.generate();
    const discounted = {
      eventId: new UuidType(UuidType.random()),
      courseId,
      occurredOn: new CreatedAt('2026-03-02T10:00:00Z'),
      changes: { price: { amount: 900, currency: 'EUR' } },
    };

    await projection.apply(discounted);
    await projection.apply({
      eventId: new UuidType(UuidType.random()),
      courseId,
      occurredOn: new CreatedAt('2026-03-01T10:00:00Z'),
      changes: { published: true, title: 'Welding', price: { amount: 1_000, currency: 'EUR' } },
    });
    await projection.apply(discounted);

    expect(await store.find(courseId.value)).toMatchObject({
      published: true,
      title: 'Welding',
      price: { amount: 900, currency: 'EUR' },
      lastEventAt: '2026-03-02T10:00:00.000Z',
    });
  });
});
