import { AggregateRoot, CreatedAt, UpdatedAt } from '../../../../ddd/domain';
import type { PrimitiveTypes } from '../../../../ddd/domain';
import { Money } from '../../../shared-kernel/money/money';
import { OrderReference } from './order-reference';
import {
  PaymentAmountAdjusted,
  PaymentAwaitingTransfer,
  PaymentCaptured,
  PaymentRefunded,
  PaymentRejected,
  PaymentVoided,
} from './payment-events';
import type { PaymentEvent } from './payment-events';
import { PaymentNotAwaitingTransferException } from './payment-exceptions';
import { PaymentId } from './payment-id';
import { PaymentMethod, PaymentMethodType } from './payment-method';
import { PaymentStatus, PaymentStatusType } from './payment-status';
import { RejectionCode, RejectionCodeType } from './rejection-code';

export interface PaymentRequest {
  orderReference: OrderReference;
  amount: Money;
  method: PaymentMethodType;
}

interface Clock {
  now(): Date;
}

export class Payment extends AggregateRoot<PaymentId, PaymentEvent> {
  private static readonly LIMIT_CENTS: Record<PaymentMethod, number> = {
    [PaymentMethod.CARD]: 50_000,
    [PaymentMethod.TRANSFER]: 500_000,
  };

  private constructor(
    id: PaymentId,
    readonly orderReference: OrderReference,
    private _amount: Money,
    readonly method: PaymentMethodType,
    private _status: PaymentStatusType,
    private _rejection: RejectionCodeType,
    readonly createdAt: CreatedAt,
    private _updatedAt: UpdatedAt,
  ) {
    super(id);
  }

  static request(request: PaymentRequest, clock: Clock): Payment {
    const payment = new Payment(
      PaymentId.forOrder(request.orderReference),
      request.orderReference,
      request.amount,
      request.method,
      new PaymentStatusType(PaymentStatus.AWAITING_TRANSFER),
      new RejectionCodeType(null),
      CreatedAt.now(clock),
      UpdatedAt.now(clock),
    );
    if (payment.exceedsLimit()) {
      payment.reject(RejectionCode.LIMIT_EXCEEDED, clock);
    } else if (payment.method.value === PaymentMethod.CARD) {
      payment.capture(clock);
    } else {
      payment.record(
        new PaymentAwaitingTransfer(
          payment.id.value,
          payment.orderReference.value,
          payment._amount.toPrimitives(),
          { clock },
        ),
      );
    }
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

  confirmTransfer(received: Money, clock: Clock): void {
    if (this._status.value !== PaymentStatus.AWAITING_TRANSFER) {
      throw new PaymentNotAwaitingTransferException(this.id.value, this._status.value);
    }
    if (received.equals(this._amount)) {
      this.capture(clock);
    } else {
      this.reject(RejectionCode.AMOUNT_MISMATCH, clock);
    }
  }

  adjustAmount(amount: Money, clock: Clock): void {
    if (this._status.value !== PaymentStatus.AWAITING_TRANSFER || amount.equals(this._amount)) {
      return;
    }
    this._amount = amount;
    this._updatedAt = UpdatedAt.now(clock);
    this.record(
      new PaymentAmountAdjusted(this.id.value, this.orderReference.value, amount.toPrimitives(), {
        clock,
      }),
    );
  }

  settleForCancelledOrder(clock: Clock): void {
    if (this._status.value === PaymentStatus.CAPTURED) {
      this.moveTo(PaymentStatus.REFUNDED, clock);
      this.record(
        new PaymentRefunded(this.id.value, this.orderReference.value, this._amount.toPrimitives(), {
          clock,
        }),
      );
    } else if (this._status.value === PaymentStatus.AWAITING_TRANSFER) {
      this.moveTo(PaymentStatus.VOIDED, clock);
      this.record(new PaymentVoided(this.id.value, this.orderReference.value, { clock }));
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

  private capture(clock: Clock): void {
    this.moveTo(PaymentStatus.CAPTURED, clock);
    this.record(
      new PaymentCaptured(this.id.value, this.orderReference.value, this._amount.toPrimitives(), {
        clock,
      }),
    );
  }

  private reject(code: RejectionCode, clock: Clock): void {
    this._rejection = new RejectionCodeType(code);
    this.moveTo(PaymentStatus.REJECTED, clock);
    this.record(
      new PaymentRejected(
        this.id.value,
        this.orderReference.value,
        this._amount.toPrimitives(),
        code,
        { clock },
      ),
    );
  }

  private moveTo(status: PaymentStatus, clock: Clock): void {
    this._status = new PaymentStatusType(status);
    this._updatedAt = UpdatedAt.now(clock);
  }
}
