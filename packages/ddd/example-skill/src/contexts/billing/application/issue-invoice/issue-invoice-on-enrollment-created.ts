import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { EventBus } from '@archi-code/ddd/application';
import { Money } from '../../../shared-kernel/money/Money';
import type { Currency } from '../../../shared-kernel/money/MoneyCurrency';
import { Invoice } from '../../domain/aggregate/Invoice';
import type { InvoiceRepository } from '../../domain/repository/InvoiceRepository';
import { EnrollmentReference } from '../../domain/value-object/EnrollmentReference';
import { InvoiceId } from '../../domain/value-object/InvoiceId';
import { StudentReference } from '../../domain/value-object/StudentReference';
import { EnrollmentCreatedDomainEvent } from './enrollment-created-domain-event';

@ListensTo(EnrollmentCreatedDomainEvent, {
  consumer: 'billing.issue-invoice-on-enrollment-created',
})
export class IssueInvoiceOnEnrollmentCreated extends EventListener<EnrollmentCreatedDomainEvent> {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  async handle(event: EnrollmentCreatedDomainEvent): Promise<void> {
    const { enrollment, student, fee } = ValueObjectBuilder.build({
      enrollment: () => new EnrollmentReference(event.enrollmentId),
      student: () => new StudentReference(event.studentId),
      fee: () => Money.fromPrimitives(event.fee as { amount: number; currency: Currency }),
    });
    const invoiceId = InvoiceId.forEnrollment(enrollment);
    if ((await this.invoices.findById(invoiceId)) !== null) {
      return;
    }
    const invoice = Invoice.create(invoiceId, enrollment, student, fee);
    await this.invoices.save(invoice);
    await this.events.publish(invoice.pullDomainEvents());
  }
}
