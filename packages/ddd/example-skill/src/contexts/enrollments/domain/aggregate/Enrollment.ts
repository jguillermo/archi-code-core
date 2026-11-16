import { AggregateRoot, CreatedAt, UpdatedAt } from '@archi-code/ddd/domain';
import type { PrimitiveTypes } from '@archi-code/ddd/domain';
import { Money } from '../../../shared-kernel/money/Money';
import { EnrollmentActivatedDomainEvent } from '../event/EnrollmentActivatedDomainEvent';
import { EnrollmentCancelledDomainEvent } from '../event/EnrollmentCancelledDomainEvent';
import { EnrollmentCompletedDomainEvent } from '../event/EnrollmentCompletedDomainEvent';
import { EnrollmentCreatedDomainEvent } from '../event/EnrollmentCreatedDomainEvent';
import { EnrollmentNotCancellable } from '../exception/EnrollmentNotCancellable';
import { EnrollmentNotCompletable } from '../exception/EnrollmentNotCompletable';
import { NotTheStudentOfEnrollment } from '../exception/NotTheStudentOfEnrollment';
import { CancellationReason, CancellationReasonType } from '../value-object/CancellationReasonType';
import { CourseReference } from '../value-object/CourseReference';
import { EnrollmentId } from '../value-object/EnrollmentId';
import { EnrollmentStatus, EnrollmentStatusType } from '../value-object/EnrollmentStatusType';
import { StudentReference } from '../value-object/StudentReference';

export class Enrollment extends AggregateRoot<EnrollmentId> {
  private static readonly CANCELLABLE = [EnrollmentStatus.PENDING_PAYMENT, EnrollmentStatus.ACTIVE];

  readonly student: StudentReference;
  readonly course: CourseReference;
  readonly fee: Money;
  private _status: EnrollmentStatusType;
  private _cancellationReason: CancellationReasonType;
  readonly createdAt: CreatedAt;
  private _updatedAt: UpdatedAt;

  constructor(
    id: EnrollmentId,
    student: StudentReference,
    course: CourseReference,
    fee: Money,
    status: EnrollmentStatusType,
    cancellationReason: CancellationReasonType,
    createdAt: CreatedAt,
    updatedAt: UpdatedAt,
  ) {
    super(id);
    this.student = student;
    this.course = course;
    this.fee = fee;
    this._status = status;
    this._cancellationReason = cancellationReason;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static create(
    id: EnrollmentId,
    student: StudentReference,
    course: CourseReference,
    fee: Money,
  ): Enrollment {
    const enrollment = new Enrollment(
      id,
      student,
      course,
      fee,
      new EnrollmentStatusType(EnrollmentStatus.PENDING_PAYMENT),
      new CancellationReasonType(null),
      CreatedAt.now(),
      UpdatedAt.now(),
    );
    enrollment.record(
      new EnrollmentCreatedDomainEvent({
        enrollmentId: id.value,
        studentId: student.value,
        courseId: course.value,
        fee: fee.toPrimitives(),
      }),
    );
    return enrollment;
  }

  static fromPrimitives(primitives: PrimitiveTypes<Enrollment>): Enrollment {
    return new Enrollment(
      new EnrollmentId(primitives.id),
      new StudentReference(primitives.student),
      new CourseReference(primitives.course),
      Money.fromPrimitives(primitives.fee),
      new EnrollmentStatusType(primitives.status),
      new CancellationReasonType(primitives.cancellationReason),
      new CreatedAt(primitives.createdAt),
      new UpdatedAt(primitives.updatedAt),
    );
  }

  get status(): EnrollmentStatusType {
    return this._status;
  }

  get cancellationReason(): CancellationReasonType {
    return this._cancellationReason;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  holdsSeat(): boolean {
    return this._status.value !== EnrollmentStatus.CANCELLED;
  }

  cancel(requester: StudentReference): void {
    if (!this.student.equals(requester)) {
      throw new NotTheStudentOfEnrollment(this.id.value);
    }
    if (!this.isCancellable()) {
      throw new EnrollmentNotCancellable(this.id.value, this._status.value);
    }
    this.cancelFor(CancellationReason.STUDENT_REQUEST);
  }

  cancelForArchivedCourse(): void {
    if (!this.isCancellable()) {
      return;
    }
    this.cancelFor(CancellationReason.COURSE_ARCHIVED);
  }

  activateAfterPayment(): void {
    if (this._status.value !== EnrollmentStatus.PENDING_PAYMENT) {
      return;
    }
    this.moveTo(EnrollmentStatus.ACTIVE);
    this.record(new EnrollmentActivatedDomainEvent({ enrollmentId: this.id.value }));
  }

  complete(): void {
    if (this._status.value !== EnrollmentStatus.ACTIVE) {
      throw new EnrollmentNotCompletable(this.id.value, this._status.value);
    }
    this.moveTo(EnrollmentStatus.COMPLETED);
    this.record(new EnrollmentCompletedDomainEvent({ enrollmentId: this.id.value }));
  }

  toPrimitives(): PrimitiveTypes<Enrollment> {
    return {
      id: this.id.value,
      student: this.student.value,
      course: this.course.value,
      fee: this.fee.toPrimitives(),
      status: this._status.value,
      cancellationReason: this._cancellationReason.value,
      createdAt: this.createdAt.value,
      updatedAt: this._updatedAt.value,
    };
  }

  private isCancellable(): boolean {
    return Enrollment.CANCELLABLE.includes(this._status.value);
  }

  private cancelFor(reason: CancellationReason): void {
    this._cancellationReason = new CancellationReasonType(reason);
    this.moveTo(EnrollmentStatus.CANCELLED);
    this.record(
      new EnrollmentCancelledDomainEvent({
        enrollmentId: this.id.value,
        studentId: this.student.value,
        courseId: this.course.value,
        fee: this.fee.toPrimitives(),
        reason,
      }),
    );
  }

  private moveTo(status: EnrollmentStatus): void {
    this._status = new EnrollmentStatusType(status);
    this._updatedAt = UpdatedAt.now();
  }
}
