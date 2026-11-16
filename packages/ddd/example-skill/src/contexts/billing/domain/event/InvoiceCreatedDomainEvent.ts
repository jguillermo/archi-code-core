import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class InvoiceCreatedDomainEvent extends EventBase {
  static readonly eventName = 'invoice.created';

  readonly invoiceId: string;
  readonly enrollmentId: string;
  readonly studentId: string;
  readonly amount: { amount: number; currency: string };

  constructor({
    invoiceId,
    enrollmentId,
    studentId,
    amount,
    eventId,
    occurredOn,
  }: {
    invoiceId: string;
    enrollmentId: string;
    studentId: string;
    amount: { amount: number; currency: string };
  } & EventMetadata) {
    super({ eventId, occurredOn });
    this.invoiceId = invoiceId;
    this.enrollmentId = enrollmentId;
    this.studentId = studentId;
    this.amount = amount;
  }
}
