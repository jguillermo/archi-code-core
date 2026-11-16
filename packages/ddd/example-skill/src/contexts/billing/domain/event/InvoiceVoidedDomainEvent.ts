import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class InvoiceVoidedDomainEvent extends EventBase {
  static readonly eventName = 'invoice.voided';

  readonly invoiceId: string;
  readonly enrollmentId: string;

  constructor({
    invoiceId,
    enrollmentId,
    eventId,
    occurredOn,
  }: {
    invoiceId: string;
    enrollmentId: string;
  } & EventMetadata) {
    super({ eventId, occurredOn });
    this.invoiceId = invoiceId;
    this.enrollmentId = enrollmentId;
  }
}
