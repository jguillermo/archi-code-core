import type { PaymentAmountAdjustedDomainEvent } from './PaymentAmountAdjustedDomainEvent';
import type { PaymentAwaitingTransferDomainEvent } from './PaymentAwaitingTransferDomainEvent';
import type { PaymentCapturedDomainEvent } from './PaymentCapturedDomainEvent';
import type { PaymentCreatedDomainEvent } from './PaymentCreatedDomainEvent';
import type { PaymentRefundedDomainEvent } from './PaymentRefundedDomainEvent';
import type { PaymentRejectedDomainEvent } from './PaymentRejectedDomainEvent';
import type { PaymentVoidedDomainEvent } from './PaymentVoidedDomainEvent';

export type PaymentEvent =
  | PaymentCreatedDomainEvent
  | PaymentCapturedDomainEvent
  | PaymentRejectedDomainEvent
  | PaymentAwaitingTransferDomainEvent
  | PaymentAmountAdjustedDomainEvent
  | PaymentRefundedDomainEvent
  | PaymentVoidedDomainEvent;
