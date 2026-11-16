import { EnumType, Required } from '@archi-code/ddd/domain';

export enum InvoiceStatus {
  OPEN = 'open',
  PAYMENT_REQUESTED = 'payment_requested',
  PAID = 'paid',
  REFUND_REQUESTED = 'refund_requested',
  REFUNDED = 'refunded',
  VOIDED = 'voided',
}

export class InvoiceStatusOption extends EnumType<InvoiceStatus> {
  protected getEnum(): typeof InvoiceStatus {
    return InvoiceStatus;
  }
}

export class InvoiceStatusType extends Required(InvoiceStatusOption) {}
