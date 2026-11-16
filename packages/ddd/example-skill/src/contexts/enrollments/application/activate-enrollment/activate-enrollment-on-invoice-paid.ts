import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { EventBus } from '@archi-code/ddd/application';
import type { EnrollmentRepository } from '../../domain/repository/EnrollmentRepository';
import { EnrollmentId } from '../../domain/value-object/EnrollmentId';
import { InvoicePaidDomainEvent } from './invoice-paid-domain-event';

@ListensTo(InvoicePaidDomainEvent, { consumer: 'enrollments.activate-enrollment-on-invoice-paid' })
export class ActivateEnrollmentOnInvoicePaid extends EventListener<InvoicePaidDomainEvent> {
  constructor(
    private readonly enrollments: EnrollmentRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  async handle(event: InvoicePaidDomainEvent): Promise<void> {
    const { enrollmentId } = ValueObjectBuilder.build({
      enrollmentId: () => new EnrollmentId(event.enrollmentId),
    });
    const enrollment = await this.enrollments.findById(enrollmentId);
    if (enrollment === null) {
      return;
    }
    enrollment.activateAfterPayment();
    await this.enrollments.save(enrollment);
    await this.events.publish(enrollment.pullDomainEvents());
  }
}
