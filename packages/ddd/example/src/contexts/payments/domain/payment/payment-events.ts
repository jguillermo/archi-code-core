import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export interface MoneyData {
  amount: number;
  currency: string;
}

export class PaymentCaptured extends EventBase {
  static readonly eventName = 'payments.payment.PaymentCaptured';

  constructor(
    readonly paymentId: string,
    readonly orderId: string,
    readonly amount: MoneyData,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

export class PaymentRejected extends EventBase {
  static readonly eventName = 'payments.payment.PaymentRejected';

  constructor(
    readonly paymentId: string,
    readonly orderId: string,
    readonly amount: MoneyData,
    readonly reason: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

export class PaymentAwaitingTransfer extends EventBase {
  static readonly eventName = 'payments.payment.PaymentAwaitingTransfer';

  constructor(
    readonly paymentId: string,
    readonly orderId: string,
    readonly amount: MoneyData,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

export class PaymentAmountAdjusted extends EventBase {
  static readonly eventName = 'payments.payment.PaymentAmountAdjusted';

  constructor(
    readonly paymentId: string,
    readonly orderId: string,
    readonly amount: MoneyData,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

export class PaymentRefunded extends EventBase {
  static readonly eventName = 'payments.payment.PaymentRefunded';

  constructor(
    readonly paymentId: string,
    readonly orderId: string,
    readonly amount: MoneyData,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

export class PaymentVoided extends EventBase {
  static readonly eventName = 'payments.payment.PaymentVoided';

  constructor(
    readonly paymentId: string,
    readonly orderId: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

export type PaymentEvent =
  | PaymentCaptured
  | PaymentRejected
  | PaymentAwaitingTransfer
  | PaymentAmountAdjusted
  | PaymentRefunded
  | PaymentVoided;
