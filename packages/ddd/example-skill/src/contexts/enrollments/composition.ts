import type { Logger } from '@archi-code/ddd/application';
import { DomainEventBus, EventRegistry } from '@archi-code/ddd/infrastructure';
import type { EventChannel, Subscription } from '@archi-code/ddd/infrastructure';
import { ActivateEnrollmentOnInvoicePaid } from './application/activate-enrollment/activate-enrollment-on-invoice-paid';
import { InvoicePaidDomainEvent } from './application/activate-enrollment/invoice-paid-domain-event';
import { CancelCourseEnrollmentsOnCourseArchived } from './application/cancel-course-enrollments/cancel-course-enrollments-on-course-archived';
import { CancelEnrollment } from './application/cancel-enrollment/cancel-enrollment';
import { CompleteEnrollment } from './application/complete-enrollment/complete-enrollment';
import { EnrollStudent } from './application/enroll-student/enroll-student';
import { AddStudentEnrollmentOnEnrollmentCreated } from './application/my-enrollments/add-student-enrollment/add-student-enrollment-on-enrollment-created';
import { MarkStudentEnrollmentActiveOnEnrollmentActivated } from './application/my-enrollments/mark-student-enrollment-active/mark-student-enrollment-active-on-enrollment-activated';
import { MarkStudentEnrollmentCancelledOnEnrollmentCancelled } from './application/my-enrollments/mark-student-enrollment-cancelled/mark-student-enrollment-cancelled-on-enrollment-cancelled';
import { MarkStudentEnrollmentCompletedOnEnrollmentCompleted } from './application/my-enrollments/mark-student-enrollment-completed/mark-student-enrollment-completed-on-enrollment-completed';
import { StudentEnrollmentProjection } from './application/my-enrollments/student-enrollment-projection';
import { AddOpenCourseOnCoursePublished } from './application/open-catalog/add-open-course/add-open-course-on-course-published';
import { CoursePublishedDomainEvent } from './application/open-catalog/add-open-course/course-published-domain-event';
import { CloseOpenCourseOnCourseArchived } from './application/open-catalog/close-open-course/close-open-course-on-course-archived';
import { CourseArchivedDomainEvent } from './application/open-catalog/close-open-course/course-archived-domain-event';
import type { MoneyData } from './application/open-catalog/money-data';
import { OpenCourseProjection } from './application/open-catalog/open-course-projection';
import { CourseDiscountedDomainEvent } from './application/open-catalog/reprice-open-course/course-discounted-domain-event';
import { RepriceOpenCourseOnCourseDiscounted } from './application/open-catalog/reprice-open-course/reprice-open-course-on-course-discounted';
import { EnrollmentActivatedDomainEvent } from './domain/event/EnrollmentActivatedDomainEvent';
import { EnrollmentCancelledDomainEvent } from './domain/event/EnrollmentCancelledDomainEvent';
import { EnrollmentCompletedDomainEvent } from './domain/event/EnrollmentCompletedDomainEvent';
import { EnrollmentCreatedDomainEvent } from './domain/event/EnrollmentCreatedDomainEvent';
import { ReadModelCourseCatalog } from './infrastructure/catalog/read-model-course-catalog';
import { InMemoryEnrollmentRepository } from './infrastructure/persistence/in-memory-enrollment-repository';
import { InMemoryOpenCourseStore } from './infrastructure/read-model/in-memory-open-course-store';
import { InMemoryStudentEnrollmentStore } from './infrastructure/read-model/in-memory-student-enrollment-store';
import { EnrollmentsController } from './interfaces/http/enrollments-controller';

export interface EnrollmentsSettings {
  channel: EventChannel;
  logger: Logger;
}

export class EnrollmentsContext {
  private constructor(
    readonly controller: EnrollmentsController,
    private readonly subscriptions: Subscription[],
  ) {}

  static async start({ channel, logger }: EnrollmentsSettings): Promise<EnrollmentsContext> {
    const bus = new DomainEventBus(channel, EnrollmentsContext.registry(), logger);
    const enrollments = new InMemoryEnrollmentRepository();
    const openCourses = new InMemoryOpenCourseStore();
    const studentEnrollments = new InMemoryStudentEnrollmentStore();
    const catalog = new ReadModelCourseCatalog(openCourses);
    const openCatalog = new OpenCourseProjection(openCourses);
    const myEnrollments = new StudentEnrollmentProjection(studentEnrollments);
    const subscriptions = [
      await bus.subscribe(new AddOpenCourseOnCoursePublished(openCatalog)),
      await bus.subscribe(new CloseOpenCourseOnCourseArchived(openCatalog)),
      await bus.subscribe(new RepriceOpenCourseOnCourseDiscounted(openCatalog)),
      await bus.subscribe(new CancelCourseEnrollmentsOnCourseArchived(enrollments, bus, logger)),
      await bus.subscribe(new ActivateEnrollmentOnInvoicePaid(enrollments, bus)),
      await bus.subscribe(new AddStudentEnrollmentOnEnrollmentCreated(myEnrollments)),
      await bus.subscribe(new MarkStudentEnrollmentActiveOnEnrollmentActivated(myEnrollments)),
      await bus.subscribe(new MarkStudentEnrollmentCancelledOnEnrollmentCancelled(myEnrollments)),
      await bus.subscribe(new MarkStudentEnrollmentCompletedOnEnrollmentCompleted(myEnrollments)),
    ];
    const controller = new EnrollmentsController(
      new EnrollStudent(enrollments, catalog, bus),
      new CancelEnrollment(enrollments, bus),
      new CompleteEnrollment(enrollments, bus),
      openCourses,
      studentEnrollments,
      logger,
    );
    return new EnrollmentsContext(controller, subscriptions);
  }

  async stop(): Promise<void> {
    for (const subscription of this.subscriptions.splice(0)) {
      await subscription.unsubscribe();
    }
  }

  private static registry(): EventRegistry {
    return new EventRegistry()
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
        CourseDiscountedDomainEvent,
        (json) =>
          new CourseDiscountedDomainEvent({
            courseId: json.courseId as string,
            price: json.price as MoneyData,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        InvoicePaidDomainEvent,
        (json) =>
          new InvoicePaidDomainEvent({
            invoiceId: json.invoiceId as string,
            enrollmentId: json.enrollmentId as string,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        EnrollmentCreatedDomainEvent,
        (json) =>
          new EnrollmentCreatedDomainEvent({
            enrollmentId: json.enrollmentId as string,
            studentId: json.studentId as string,
            courseId: json.courseId as string,
            fee: json.fee as MoneyData,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        EnrollmentActivatedDomainEvent,
        (json) =>
          new EnrollmentActivatedDomainEvent({
            enrollmentId: json.enrollmentId as string,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        EnrollmentCancelledDomainEvent,
        (json) =>
          new EnrollmentCancelledDomainEvent({
            enrollmentId: json.enrollmentId as string,
            studentId: json.studentId as string,
            courseId: json.courseId as string,
            fee: json.fee as MoneyData,
            reason: json.reason as string,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        EnrollmentCompletedDomainEvent,
        (json) =>
          new EnrollmentCompletedDomainEvent({
            enrollmentId: json.enrollmentId as string,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      );
  }
}
