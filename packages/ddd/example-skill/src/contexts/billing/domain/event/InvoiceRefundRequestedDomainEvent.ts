import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class InvoiceRefundRequestedDomainEvent extends EventBase {
  static readonly eventName = 'invoice.refund_requested';

  readonly invoiceId: string;
  readonly amount: { amount: number; currency: string };

  constructor({
    invoiceId,
    amount,
    eventId,
    occurredOn,
  }: {
    invoiceId: string;
    amount: { amount: number; currency: string };
  } & EventMetadata) {
    super({ eventId, occurredOn });
    this.invoiceId = invoiceId;
    this.amount = amount;
  }
}
