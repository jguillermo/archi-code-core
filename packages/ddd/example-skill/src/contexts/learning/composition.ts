import type { Logger } from '@archi-code/ddd/application';
import { DomainEventBus, EventRegistry } from '@archi-code/ddd/infrastructure';
import type { EventChannel, Subscription } from '@archi-code/ddd/infrastructure';
import { AddCourseViewOnCourseCreated } from './application/course-views/add-course-view/add-course-view-on-course-created';
import type { CourseViewLesson } from './application/course-views/course-view';
import { CourseViewProjection } from './application/course-views/course-view-projection';
import { MarkCourseViewArchivedOnCourseArchived } from './application/course-views/mark-course-view-archived/mark-course-view-archived-on-course-archived';
import { MarkCourseViewDiscardedOnCourseDiscarded } from './application/course-views/mark-course-view-discarded/mark-course-view-discarded-on-course-discarded';
import { MarkCourseViewPublishedOnCoursePublished } from './application/course-views/mark-course-view-published/mark-course-view-published-on-course-published';
import { RenameCourseViewLessonOnCourseLessonRenamed } from './application/course-views/rename-course-view-lesson/rename-course-view-lesson-on-course-lesson-renamed';
import { RepriceCourseViewOnCourseDiscounted } from './application/course-views/reprice-course-view/reprice-course-view-on-course-discounted';
import { CreateCourse } from './application/create-course/create-course';
import type { MoneyData } from './application/create-course/money-data';
import { DiscountCheapCourses } from './application/discount-cheap-courses/discount-cheap-courses';
import { PublishCourse } from './application/publish-course/publish-course';
import { RenameLesson } from './application/rename-lesson/rename-lesson';
import { RetireCourse } from './application/retire-course/retire-course';
import { CourseArchivedDomainEvent } from './domain/event/CourseArchivedDomainEvent';
import { CourseCreatedDomainEvent } from './domain/event/CourseCreatedDomainEvent';
import { CourseDiscardedDomainEvent } from './domain/event/CourseDiscardedDomainEvent';
import { CourseDiscountedDomainEvent } from './domain/event/CourseDiscountedDomainEvent';
import { CourseLessonRenamedDomainEvent } from './domain/event/CourseLessonRenamedDomainEvent';
import { CoursePublishedDomainEvent } from './domain/event/CoursePublishedDomainEvent';
import { IndexedDbCourseRepository } from './infrastructure/persistence/indexeddb-course-repository';
import { IndexedDbCourseViewStore } from './infrastructure/read-model/indexeddb-course-view-store';
import { CoursesController } from './interfaces/http/courses-controller';

export interface LearningSettings {
  channel: EventChannel;
  logger: Logger;
}

export class LearningContext {
  private constructor(
    readonly controller: CoursesController,
    private readonly subscriptions: Subscription[],
  ) {}

  static async start({ channel, logger }: LearningSettings): Promise<LearningContext> {
    const bus = new DomainEventBus(channel, LearningContext.registry(), logger);
    const courses = new IndexedDbCourseRepository();
    const courseViews = new IndexedDbCourseViewStore();
    const projection = new CourseViewProjection(courseViews);
    const subscriptions = [
      await bus.subscribe(new AddCourseViewOnCourseCreated(projection)),
      await bus.subscribe(new RenameCourseViewLessonOnCourseLessonRenamed(projection)),
      await bus.subscribe(new MarkCourseViewPublishedOnCoursePublished(projection)),
      await bus.subscribe(new MarkCourseViewArchivedOnCourseArchived(projection)),
      await bus.subscribe(new MarkCourseViewDiscardedOnCourseDiscarded(projection)),
      await bus.subscribe(new RepriceCourseViewOnCourseDiscounted(projection)),
    ];
    const controller = new CoursesController(
      {
        createCourse: new CreateCourse(courses, bus),
        renameLesson: new RenameLesson(courses, bus),
        publishCourse: new PublishCourse(courses, bus),
        retireCourse: new RetireCourse(courses, bus),
        discountCheapCourses: new DiscountCheapCourses(courses, bus, logger),
      },
      courseViews,
      logger,
    );
    return new LearningContext(controller, subscriptions);
  }

  async stop(): Promise<void> {
    for (const subscription of this.subscriptions.splice(0)) {
      await subscription.unsubscribe();
    }
  }

  private static registry(): EventRegistry {
    return new EventRegistry()
      .register(
        CourseCreatedDomainEvent,
        (json) =>
          new CourseCreatedDomainEvent({
            courseId: json.courseId as string,
            title: json.title as string,
            price: json.price as MoneyData,
            lessons: json.lessons as CourseViewLesson[],
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        CourseLessonRenamedDomainEvent,
        (json) =>
          new CourseLessonRenamedDomainEvent({
            courseId: json.courseId as string,
            lessonNumber: json.lessonNumber as number,
            title: json.title as string,
            lessons: json.lessons as CourseViewLesson[],
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        CoursePublishedDomainEvent,
        (json) =>
          new CoursePublishedDomainEvent({
            courseId: json.courseId as string,
            title: json.title as string,
            price: json.price as MoneyData,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        CourseArchivedDomainEvent,
        (json) =>
          new CourseArchivedDomainEvent({
            courseId: json.courseId as string,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        CourseDiscardedDomainEvent,
        (json) =>
          new CourseDiscardedDomainEvent({
            courseId: json.courseId as string,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        CourseDiscountedDomainEvent,
        (json) =>
          new CourseDiscountedDomainEvent({
            courseId: json.courseId as string,
            price: json.price as MoneyData,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      );
  }
}
