import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class InvoicePaidDomainEvent extends EventBase {
  static readonly eventName = 'invoice.paid';

  readonly invoiceId: string;
  readonly enrollmentId: string;
  readonly chargeId: string;

  constructor({
    invoiceId,
    enrollmentId,
    chargeId,
    eventId,
    occurredOn,
  }: {
    invoiceId: string;
    enrollmentId: string;
    chargeId: string;
  } & EventMetadata) {
    super({ eventId, occurredOn });
    this.invoiceId = invoiceId;
    this.enrollmentId = enrollmentId;
    this.chargeId = chargeId;
  }
}
