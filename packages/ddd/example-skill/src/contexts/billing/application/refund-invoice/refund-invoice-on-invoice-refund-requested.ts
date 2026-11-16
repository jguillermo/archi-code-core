import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { EventBus } from '@archi-code/ddd/application';
import { InvoiceRefundRequestedDomainEvent } from '../../domain/event/InvoiceRefundRequestedDomainEvent';
import type { InvoiceRepository } from '../../domain/repository/InvoiceRepository';
import { InvoiceCharging } from '../../domain/service/InvoiceCharging';
import type { PaymentGateway } from '../../domain/service/PaymentGateway';
import { InvoiceId } from '../../domain/value-object/InvoiceId';

@ListensTo(InvoiceRefundRequestedDomainEvent, {
  consumer: 'billing.refund-invoice-on-invoice-refund-requested',
})
export class RefundInvoiceOnInvoiceRefundRequested extends EventListener<InvoiceRefundRequestedDomainEvent> {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly gateway: PaymentGateway,
    private readonly events: EventBus,
  ) {
    super();
  }

  async handle(event: InvoiceRefundRequestedDomainEvent): Promise<void> {
    const { invoiceId } = ValueObjectBuilder.build({
      invoiceId: () => new InvoiceId(event.invoiceId),
    });
    const invoice = await this.invoices.findById(invoiceId);
    if (invoice === null) {
      return;
    }
    await new InvoiceCharging(this.gateway).refund(invoice);
    await this.invoices.save(invoice);
    await this.events.publish(invoice.pullDomainEvents());
  }
}
