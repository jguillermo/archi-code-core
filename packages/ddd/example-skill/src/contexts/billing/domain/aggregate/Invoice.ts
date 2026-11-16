import { AggregateRoot, CreatedAt, UpdatedAt } from '@archi-code/ddd/domain';
import type { PrimitiveTypes } from '@archi-code/ddd/domain';
import { Money } from '../../../shared-kernel/money/Money';
import { InvoiceCreatedDomainEvent } from '../event/InvoiceCreatedDomainEvent';
import { InvoicePaidDomainEvent } from '../event/InvoicePaidDomainEvent';
import { InvoicePaymentDeclinedDomainEvent } from '../event/InvoicePaymentDeclinedDomainEvent';
import { InvoicePaymentRequestedDomainEvent } from '../event/InvoicePaymentRequestedDomainEvent';
import { InvoiceRefundedDomainEvent } from '../event/InvoiceRefundedDomainEvent';
import { InvoiceRefundRequestedDomainEvent } from '../event/InvoiceRefundRequestedDomainEvent';
import { InvoiceVoidedDomainEvent } from '../event/InvoiceVoidedDomainEvent';
import { InvoiceNotPayable } from '../exception/InvoiceNotPayable';
import { NotTheStudentOfInvoice } from '../exception/NotTheStudentOfInvoice';
import { PaymentAmountMismatch } from '../exception/PaymentAmountMismatch';
import type { ChargeOutcome } from '../value-object/ChargeOutcome';
import { EnrollmentReference } from '../value-object/EnrollmentReference';
import { EnrollmentWithdrawn } from '../value-object/EnrollmentWithdrawn';
import { GatewayChargeId } from '../value-object/GatewayChargeId';
import { InvoiceId } from '../value-object/InvoiceId';
import { InvoiceStatus, InvoiceStatusType } from '../value-object/InvoiceStatusType';
import { StudentReference } from '../value-object/StudentReference';

export class Invoice extends AggregateRoot<InvoiceId> {
  readonly enrollment: EnrollmentReference;
  readonly student: StudentReference;
  readonly amount: Money;
  private _status: InvoiceStatusType;
  private _charge: GatewayChargeId;
  private _enrollmentWithdrawn: EnrollmentWithdrawn;
  readonly createdAt: CreatedAt;
  private _updatedAt: UpdatedAt;

  constructor(
    id: InvoiceId,
    enrollment: EnrollmentReference,
    student: StudentReference,
    amount: Money,
    status: InvoiceStatusType,
    charge: GatewayChargeId,
    enrollmentWithdrawn: EnrollmentWithdrawn,
    createdAt: CreatedAt,
    updatedAt: UpdatedAt,
  ) {
    super(id);
    this.enrollment = enrollment;
    this.student = student;
    this.amount = amount;
    this._status = status;
    this._charge = charge;
    this._enrollmentWithdrawn = enrollmentWithdrawn;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static create(
    id: InvoiceId,
    enrollment: EnrollmentReference,
    student: StudentReference,
    amount: Money,
  ): Invoice {
    const invoice = new Invoice(
      id,
      enrollment,
      student,
      amount,
      new InvoiceStatusType(InvoiceStatus.OPEN),
      new GatewayChargeId(null),
      new EnrollmentWithdrawn(false),
      CreatedAt.now(),
      UpdatedAt.now(),
    );
    invoice.record(
      new InvoiceCreatedDomainEvent({
        invoiceId: id.value,
        enrollmentId: enrollment.value,
        studentId: student.value,
        amount: amount.toPrimitives(),
      }),
    );
    return invoice;
  }

  static createVoided(
    id: InvoiceId,
    enrollment: EnrollmentReference,
    student: StudentReference,
    amount: Money,
  ): Invoice {
    const invoice = new Invoice(
      id,
      enrollment,
      student,
      amount,
      new InvoiceStatusType(InvoiceStatus.VOIDED),
      new GatewayChargeId(null),
      new EnrollmentWithdrawn(true),
      CreatedAt.now(),
      UpdatedAt.now(),
    );
    invoice.record(
      new InvoiceVoidedDomainEvent({ invoiceId: id.value, enrollmentId: enrollment.value }),
    );
    return invoice;
  }

  static fromPrimitives(primitives: PrimitiveTypes<Invoice>): Invoice {
    return new Invoice(
      new InvoiceId(primitives.id),
      new EnrollmentReference(primitives.enrollment),
      new StudentReference(primitives.student),
      Money.fromPrimitives(primitives.amount),
      new InvoiceStatusType(primitives.status),
      new GatewayChargeId(primitives.charge),
      new EnrollmentWithdrawn(primitives.enrollmentWithdrawn),
      new CreatedAt(primitives.createdAt),
      new UpdatedAt(primitives.updatedAt),
    );
  }

  get status(): InvoiceStatusType {
    return this._status;
  }

  get charge(): GatewayChargeId {
    return this._charge;
  }

  get enrollmentWithdrawn(): EnrollmentWithdrawn {
    return this._enrollmentWithdrawn;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  awaitsCharge(): boolean {
    return this.isIn(InvoiceStatus.PAYMENT_REQUESTED);
  }

  awaitsRefund(): boolean {
    return this.isIn(InvoiceStatus.REFUND_REQUESTED);
  }

  requestPayment(requester: StudentReference, offered: Money): void {
    if (!this.student.equals(requester)) {
      throw new NotTheStudentOfInvoice(this.id.value);
    }
    if (!this.isIn(InvoiceStatus.OPEN)) {
      throw new InvoiceNotPayable(this.id.value, this._status.value);
    }
    if (!this.amount.equals(offered)) {
      throw new PaymentAmountMismatch(
        this.id.value,
        this.amount.amount.value,
        offered.amount.value,
      );
    }
    this.moveTo(InvoiceStatus.PAYMENT_REQUESTED);
    this.record(
      new InvoicePaymentRequestedDomainEvent({
        invoiceId: this.id.value,
        amount: this.amount.toPrimitives(),
      }),
    );
  }

  recordChargeOutcome(outcome: ChargeOutcome): void {
    if (!this.awaitsCharge()) {
      return;
    }
    if (!outcome.succeeded()) {
      this.record(
        new InvoicePaymentDeclinedDomainEvent({
          invoiceId: this.id.value,
          reason: outcome.declineReason.toString(),
        }),
      );
      if (this._enrollmentWithdrawn.value) {
        this.void();
      } else {
        this.moveTo(InvoiceStatus.OPEN);
      }
      return;
    }
    this._charge = outcome.chargeId;
    this.moveTo(InvoiceStatus.PAID);
    this.record(
      new InvoicePaidDomainEvent({
        invoiceId: this.id.value,
        enrollmentId: this.enrollment.value,
        chargeId: this._charge.toString(),
      }),
    );
    if (this._enrollmentWithdrawn.value) {
      this.requestRefund();
    }
  }

  settleForCancelledEnrollment(): void {
    if (this._enrollmentWithdrawn.value) {
      return;
    }
    this._enrollmentWithdrawn = new EnrollmentWithdrawn(true);
    this.touch();
    if (this.isIn(InvoiceStatus.OPEN)) {
      this.void();
    } else if (this.isIn(InvoiceStatus.PAID)) {
      this.requestRefund();
    }
  }

  recordRefund(): void {
    if (!this.awaitsRefund()) {
      return;
    }
    this.moveTo(InvoiceStatus.REFUNDED);
    this.record(
      new InvoiceRefundedDomainEvent({
        invoiceId: this.id.value,
        enrollmentId: this.enrollment.value,
      }),
    );
  }

  toPrimitives(): PrimitiveTypes<Invoice> {
    return {
      id: this.id.value,
      enrollment: this.enrollment.value,
      student: this.student.value,
      amount: this.amount.toPrimitives(),
      status: this._status.value,
      charge: this._charge.value,
      enrollmentWithdrawn: this._enrollmentWithdrawn.value,
      createdAt: this.createdAt.value,
      updatedAt: this._updatedAt.value,
    };
  }

  private isIn(status: InvoiceStatus): boolean {
    return this._status.value === status;
  }

  private void(): void {
    this.moveTo(InvoiceStatus.VOIDED);
    this.record(
      new InvoiceVoidedDomainEvent({
        invoiceId: this.id.value,
        enrollmentId: this.enrollment.value,
      }),
    );
  }

  private requestRefund(): void {
    this.moveTo(InvoiceStatus.REFUND_REQUESTED);
    this.record(
      new InvoiceRefundRequestedDomainEvent({
        invoiceId: this.id.value,
        amount: this.amount.toPrimitives(),
      }),
    );
  }

  private moveTo(status: InvoiceStatus): void {
    this._status = new InvoiceStatusType(status);
    this.touch();
  }

  private touch(): void {
    this._updatedAt = UpdatedAt.now();
  }
}
