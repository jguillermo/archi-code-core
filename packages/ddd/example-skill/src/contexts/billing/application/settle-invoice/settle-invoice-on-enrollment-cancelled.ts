import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { EventBus } from '@archi-code/ddd/application';
import { Money } from '../../../shared-kernel/money/Money';
import type { Currency } from '../../../shared-kernel/money/MoneyCurrency';
import { Invoice } from '../../domain/aggregate/Invoice';
import type { InvoiceRepository } from '../../domain/repository/InvoiceRepository';
import { EnrollmentReference } from '../../domain/value-object/EnrollmentReference';
import { InvoiceId } from '../../domain/value-object/InvoiceId';
import { StudentReference } from '../../domain/value-object/StudentReference';
import { EnrollmentCancelledDomainEvent } from './enrollment-cancelled-domain-event';

@ListensTo(EnrollmentCancelledDomainEvent, {
  consumer: 'billing.settle-invoice-on-enrollment-cancelled',
})
export class SettleInvoiceOnEnrollmentCancelled extends EventListener<EnrollmentCancelledDomainEvent> {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  async handle(event: EnrollmentCancelledDomainEvent): Promise<void> {
    const { enrollment, student, fee } = ValueObjectBuilder.build({
      enrollment: () => new EnrollmentReference(event.enrollmentId),
      student: () => new StudentReference(event.studentId),
      fee: () => Money.fromPrimitives(event.fee as { amount: number; currency: Currency }),
    });
    const invoiceId = InvoiceId.forEnrollment(enrollment);
    const invoice = await this.invoices.findById(invoiceId);
    if (invoice === null) {
      const voided = Invoice.createVoided(invoiceId, enrollment, student, fee);
      await this.invoices.save(voided);
      await this.events.publish(voided.pullDomainEvents());
      return;
    }
    invoice.settleForCancelledEnrollment();
    await this.invoices.save(invoice);
    await this.events.publish(invoice.pullDomainEvents());
  }
}
