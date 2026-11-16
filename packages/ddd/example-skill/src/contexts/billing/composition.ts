import type { Logger } from '@archi-code/ddd/application';
import { DomainEventBus, EventRegistry } from '@archi-code/ddd/infrastructure';
import type { EventChannel, Subscription } from '@archi-code/ddd/infrastructure';
import { ChargeInvoiceOnInvoicePaymentRequested } from './application/charge-invoice/charge-invoice-on-invoice-payment-requested';
import { EnrollmentCreatedDomainEvent } from './application/issue-invoice/enrollment-created-domain-event';
import { IssueInvoiceOnEnrollmentCreated } from './application/issue-invoice/issue-invoice-on-enrollment-created';
import type { MoneyData } from './application/pay-invoice/money-data';
import { PayInvoice } from './application/pay-invoice/pay-invoice';
import { RefundInvoiceOnInvoiceRefundRequested } from './application/refund-invoice/refund-invoice-on-invoice-refund-requested';
import { EnrollmentCancelledDomainEvent } from './application/settle-invoice/enrollment-cancelled-domain-event';
import { SettleInvoiceOnEnrollmentCancelled } from './application/settle-invoice/settle-invoice-on-enrollment-cancelled';
import { InvoicePaymentRequestedDomainEvent } from './domain/event/InvoicePaymentRequestedDomainEvent';
import { InvoiceRefundRequestedDomainEvent } from './domain/event/InvoiceRefundRequestedDomainEvent';
import { InMemoryPaymentGateway } from './infrastructure/payment/in-memory-payment-gateway';
import { InMemoryInvoiceRepository } from './infrastructure/persistence/in-memory-invoice-repository';
import { InvoicesController } from './interfaces/http/invoices-controller';

export interface BillingSettings {
  channel: EventChannel;
  logger: Logger;
  declineAboveCents: number | null;
}

export class BillingContext {
  private constructor(
    readonly controller: InvoicesController,
    private readonly subscriptions: Subscription[],
  ) {}

  static async start({
    channel,
    logger,
    declineAboveCents,
  }: BillingSettings): Promise<BillingContext> {
    const bus = new DomainEventBus(channel, BillingContext.registry(), logger);
    const invoices = new InMemoryInvoiceRepository();
    const gateway = new InMemoryPaymentGateway({ declineAboveCents });
    const subscriptions = [
      await bus.subscribe(new IssueInvoiceOnEnrollmentCreated(invoices, bus)),
      await bus.subscribe(new SettleInvoiceOnEnrollmentCancelled(invoices, bus)),
      await bus.subscribe(
        new ChargeInvoiceOnInvoicePaymentRequested(invoices, gateway, bus, logger),
      ),
      await bus.subscribe(new RefundInvoiceOnInvoiceRefundRequested(invoices, gateway, bus)),
    ];
    const controller = new InvoicesController(new PayInvoice(invoices, bus), logger);
    return new BillingContext(controller, subscriptions);
  }

  async stop(): Promise<void> {
    for (const subscription of this.subscriptions.splice(0)) {
      await subscription.unsubscribe();
    }
  }

  private static registry(): EventRegistry {
    return new EventRegistry()
      .register(
        EnrollmentCreatedDomainEvent,
        (json) =>
          new EnrollmentCreatedDomainEvent({
            enrollmentId: json.enrollmentId as string,
            studentId: json.studentId as string,
            fee: json.fee as MoneyData,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        EnrollmentCancelledDomainEvent,
        (json) =>
          new EnrollmentCancelledDomainEvent({
            enrollmentId: json.enrollmentId as string,
            studentId: json.studentId as string,
            fee: json.fee as MoneyData,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        InvoicePaymentRequestedDomainEvent,
        (json) =>
          new InvoicePaymentRequestedDomainEvent({
            invoiceId: json.invoiceId as string,
            amount: json.amount as MoneyData,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        InvoiceRefundRequestedDomainEvent,
        (json) =>
          new InvoiceRefundRequestedDomainEvent({
            invoiceId: json.invoiceId as string,
            amount: json.amount as MoneyData,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      );
  }
}
