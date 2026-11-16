import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { EventBus, Logger } from '@archi-code/ddd/application';
import { InvoicePaymentRequestedDomainEvent } from '../../domain/event/InvoicePaymentRequestedDomainEvent';
import type { InvoiceRepository } from '../../domain/repository/InvoiceRepository';
import { InvoiceCharging } from '../../domain/service/InvoiceCharging';
import type { PaymentGateway } from '../../domain/service/PaymentGateway';
import { InvoiceId } from '../../domain/value-object/InvoiceId';

@ListensTo(InvoicePaymentRequestedDomainEvent, {
  consumer: 'billing.charge-invoice-on-invoice-payment-requested',
})
export class ChargeInvoiceOnInvoicePaymentRequested extends EventListener<InvoicePaymentRequestedDomainEvent> {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly gateway: PaymentGateway,
    private readonly events: EventBus,
    private readonly logger: Logger,
  ) {
    super();
  }

  async handle(event: InvoicePaymentRequestedDomainEvent): Promise<void> {
    const { invoiceId } = ValueObjectBuilder.build({
      invoiceId: () => new InvoiceId(event.invoiceId),
    });
    const invoice = await this.invoices.findById(invoiceId);
    if (invoice === null) {
      return;
    }
    await new InvoiceCharging(this.gateway).charge(invoice);
    await this.invoices.save(invoice);
    const recorded = invoice.pullDomainEvents();
    await this.events.publish(recorded);
    if (recorded.length > 0) {
      this.logger.info('invoice_charge_settled', {
        invoiceId: invoiceId.value,
        status: invoice.status.value,
      });
    }
  }
}
