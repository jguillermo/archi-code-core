import type { CreatedAt, UuidType } from '@archi-code/ddd/domain';
import type { CourseReference } from '../../domain/value-object/CourseReference';
import type { OpenCourse, OpenCourseChanges } from './open-course';
import type { OpenCourseStore } from './open-course-store';

export interface OpenCourseChange {
  eventId: UuidType;
  courseId: CourseReference;
  occurredOn: CreatedAt;
  changes: OpenCourseChanges;
}

export class OpenCourseProjection {
  constructor(private readonly store: OpenCourseStore) {}

  async apply({ eventId, courseId, occurredOn, changes }: OpenCourseChange): Promise<void> {
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
      published: false,
      archived: false,
      lastEventAt: at,
    };
    const { price, ...facts } = changes;
    const next: OpenCourse = {
      ...current,
      ...facts,
      lastEventAt: current.lastEventAt > at ? current.lastEventAt : at,
    };
    if (price !== undefined && (current.priceOn === null || current.priceOn <= at)) {
      next.price = price;
      next.priceOn = at;
    }
    await this.store.save(next, appliedEventId);
  }
}
