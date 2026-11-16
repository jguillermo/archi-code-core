import type { CreatedAt, UuidType } from '@archi-code/ddd/domain';
import type { CourseId } from '../../domain/value-object/CourseId';
import type { CourseView, CourseViewChanges } from './course-view';
import type { CourseViewStore } from './course-view-store';

export interface CourseViewChange {
  eventId: UuidType;
  courseId: CourseId;
  occurredOn: CreatedAt;
  changes: CourseViewChanges;
}

export class CourseViewProjection {
  constructor(private readonly store: CourseViewStore) {}

  async apply({ eventId, courseId, occurredOn, changes }: CourseViewChange): Promise<void> {
    const appliedEventId = eventId.toString();
    if (await this.store.hasApplied(appliedEventId)) {
      return;
    }
    const at = occurredOn.toString();
    const current = (await this.store.find(courseId.value)) ?? {
      courseId: courseId.value,
      title: null,
      price: null,
      priceOn: null,
      lessons: [],
      lessonsOn: null,
      created: false,
      published: false,
      archived: false,
      discarded: false,
      lastEventAt: at,
    };
    const { price, lessons, ...facts } = changes;
    const next: CourseView = {
      ...current,
      ...facts,
      lastEventAt: current.lastEventAt > at ? current.lastEventAt : at,
    };
    if (price !== undefined && (current.priceOn === null || current.priceOn <= at)) {
      next.price = price;
      next.priceOn = at;
    }
    if (lessons !== undefined && (current.lessonsOn === null || current.lessonsOn <= at)) {
      next.lessons = lessons;
      next.lessonsOn = at;
    }
    await this.store.save(next, appliedEventId);
  }
}
