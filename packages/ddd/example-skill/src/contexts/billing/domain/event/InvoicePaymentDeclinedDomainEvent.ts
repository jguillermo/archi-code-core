import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class InvoicePaymentDeclinedDomainEvent extends EventBase {
  static readonly eventName = 'invoice.payment_declined';

  readonly invoiceId: string;
  readonly reason: string;

  constructor({
    invoiceId,
    reason,
    eventId,
    occurredOn,
  }: {
    invoiceId: string;
    reason: string;
  } & EventMetadata) {
    super({ eventId, occurredOn });
    this.invoiceId = invoiceId;
    this.reason = reason;
  }
}
