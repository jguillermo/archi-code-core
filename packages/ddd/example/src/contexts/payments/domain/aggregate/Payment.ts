import { AggregateRoot, CreatedAt, UpdatedAt } from '../../../../ddd/domain';
import type { PrimitiveTypes } from '../../../../ddd/domain';
import { Money } from '../../../shared-kernel/money/Money';
import { OrderReference } from '../value-object/OrderReference';
import { PaymentAmountAdjustedDomainEvent } from '../event/PaymentAmountAdjustedDomainEvent';
import { PaymentAwaitingTransferDomainEvent } from '../event/PaymentAwaitingTransferDomainEvent';
import { PaymentCapturedDomainEvent } from '../event/PaymentCapturedDomainEvent';
import { PaymentCreatedDomainEvent } from '../event/PaymentCreatedDomainEvent';
import { PaymentId } from '../value-object/PaymentId';
import { PaymentMethod } from '../value-object/PaymentMethodType';
import { PaymentMethodType } from '../value-object/PaymentMethodType';
import { PaymentNotAwaitingTransfer } from '../exception/PaymentNotAwaitingTransfer';
import { PaymentRefundedDomainEvent } from '../event/PaymentRefundedDomainEvent';
import { PaymentRejectedDomainEvent } from '../event/PaymentRejectedDomainEvent';
import { PaymentStatus } from '../value-object/PaymentStatusType';
import { PaymentStatusType } from '../value-object/PaymentStatusType';
import { PaymentVoidedDomainEvent } from '../event/PaymentVoidedDomainEvent';
import { RejectionCode } from '../value-object/RejectionCodeType';
import { RejectionCodeType } from '../value-object/RejectionCodeType';

export class Payment extends AggregateRoot<PaymentId> {
  private static readonly LIMIT_CENTS: Record<PaymentMethod, number> = {
    [PaymentMethod.CARD]: 50_000,
    [PaymentMethod.TRANSFER]: 500_000,
  };

  readonly orderReference: OrderReference;
  private _amount: Money;
  readonly method: PaymentMethodType;
  private _status: PaymentStatusType;
  private _rejection: RejectionCodeType;
  readonly createdAt: CreatedAt;
  private _updatedAt: UpdatedAt;

  constructor(
    id: PaymentId,
    orderReference: OrderReference,
    amount: Money,
    method: PaymentMethodType,
    status: PaymentStatusType,
    rejection: RejectionCodeType,
    createdAt: CreatedAt,
    updatedAt: UpdatedAt,
  ) {
    super(id);
    this.orderReference = orderReference;
    this._amount = amount;
    this.method = method;
    this._status = status;
    this._rejection = rejection;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static create(
    id: PaymentId,
    orderReference: OrderReference,
    amount: Money,
    method: PaymentMethodType,
  ): Payment {
    const payment = new Payment(
      id,
      orderReference,
      amount,
      method,
      new PaymentStatusType(PaymentStatus.PENDING),
      new RejectionCodeType(null),
      CreatedAt.now(),
      UpdatedAt.now(),
    );

    payment.record(
      new PaymentCreatedDomainEvent({
        paymentId: payment.id.value,
        orderId: payment.orderReference.value,
        amount: payment._amount.toPrimitives(),
        method: payment.method.value,
      }),
    );

    return payment;
  }

  static fromPrimitives(primitives: PrimitiveTypes<Payment>): Payment {
    return new Payment(
      new PaymentId(primitives.id),
      new OrderReference(primitives.orderReference),
      Money.fromPrimitives(primitives.amount),
      new PaymentMethodType(primitives.method),
      new PaymentStatusType(primitives.status),
      new RejectionCodeType(primitives.rejection),
      new CreatedAt(primitives.createdAt),
      new UpdatedAt(primitives.updatedAt),
    );
  }

  get amount(): Money {
    return this._amount;
  }

  get status(): PaymentStatusType {
    return this._status;
  }

  get rejection(): RejectionCodeType {
    return this._rejection;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  process(): void {
    if (this._status.value !== PaymentStatus.PENDING) {
      return;
    }
    if (this.exceedsLimit()) {
      this.reject(RejectionCode.LIMIT_EXCEEDED);
    } else if (this.method.value === PaymentMethod.CARD) {
      this.capture();
    } else {
      this.awaitTransfer();
    }
  }

  confirmTransfer(received: Money): void {
    if (this._status.value !== PaymentStatus.AWAITING_TRANSFER) {
      throw new PaymentNotAwaitingTransfer(this.id.value, this._status.value);
    }
    if (received.equals(this._amount)) {
      this.capture();
    } else {
      this.reject(RejectionCode.AMOUNT_MISMATCH);
    }
  }

  adjustAmount(amount: Money): void {
    if (this._status.value !== PaymentStatus.AWAITING_TRANSFER || amount.equals(this._amount)) {
      return;
    }
    this._amount = amount;
    this._updatedAt = UpdatedAt.now();
    this.record(
      new PaymentAmountAdjustedDomainEvent({
        paymentId: this.id.value,
        orderId: this.orderReference.value,
        amount: amount.toPrimitives(),
      }),
    );
  }

  settleForCancelledOrder(): void {
    if (this._status.value === PaymentStatus.CAPTURED) {
      this.moveTo(PaymentStatus.REFUNDED);
      this.record(
        new PaymentRefundedDomainEvent({
          paymentId: this.id.value,
          orderId: this.orderReference.value,
          amount: this._amount.toPrimitives(),
        }),
      );
    } else if (this._status.value === PaymentStatus.AWAITING_TRANSFER) {
      this.moveTo(PaymentStatus.VOIDED);
      this.record(
        new PaymentVoidedDomainEvent({
          paymentId: this.id.value,
          orderId: this.orderReference.value,
        }),
      );
    }
  }

  toPrimitives(): PrimitiveTypes<Payment> {
    return {
      id: this.id.value,
      orderReference: this.orderReference.value,
      amount: this._amount.toPrimitives(),
      method: this.method.value,
      status: this._status.value,
      rejection: this._rejection.value,
      createdAt: this.createdAt.value,
      updatedAt: this._updatedAt.value,
    };
  }

  private exceedsLimit(): boolean {
    return this._amount.isAtLeast(Payment.LIMIT_CENTS[this.method.value] + 1);
  }

  private awaitTransfer(): void {
    this.moveTo(PaymentStatus.AWAITING_TRANSFER);
    this.record(
      new PaymentAwaitingTransferDomainEvent({
        paymentId: this.id.value,
        orderId: this.orderReference.value,
        amount: this._amount.toPrimitives(),
      }),
    );
  }

  private capture(): void {
    this.moveTo(PaymentStatus.CAPTURED);
    this.record(
      new PaymentCapturedDomainEvent({
        paymentId: this.id.value,
        orderId: this.orderReference.value,
        amount: this._amount.toPrimitives(),
      }),
    );
  }

  private reject(code: RejectionCode): void {
    this._rejection = new RejectionCodeType(code);
    this.moveTo(PaymentStatus.REJECTED);
    this.record(
      new PaymentRejectedDomainEvent({
        paymentId: this.id.value,
        orderId: this.orderReference.value,
        amount: this._amount.toPrimitives(),
        reason: code,
      }),
    );
  }

  private moveTo(status: PaymentStatus): void {
    this._status = new PaymentStatusType(status);
    this._updatedAt = UpdatedAt.now();
  }
}
