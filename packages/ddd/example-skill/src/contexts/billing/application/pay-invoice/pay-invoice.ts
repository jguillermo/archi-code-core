import {
  AggregateNotFoundException,
  UseCase,
  ValueObjectBuilder,
} from '@archi-code/ddd/application';
import type { EventBus } from '@archi-code/ddd/application';
import { Money } from '../../../shared-kernel/money/Money';
import type { Currency } from '../../../shared-kernel/money/MoneyCurrency';
import type { InvoiceRepository } from '../../domain/repository/InvoiceRepository';
import { InvoiceId } from '../../domain/value-object/InvoiceId';
import { StudentReference } from '../../domain/value-object/StudentReference';
import type { MoneyData } from './money-data';

export interface PayInvoiceInput {
  actorId: string;
  invoiceId: string;
  amount: MoneyData;
}

export interface PayInvoiceCommand {
  actorId: StudentReference;
  invoiceId: InvoiceId;
  amount: Money;
}

export class PayInvoice extends UseCase<PayInvoiceInput, PayInvoiceCommand, void> {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  protected toCommand(input: PayInvoiceInput): PayInvoiceCommand {
    return ValueObjectBuilder.build({
      actorId: () => new StudentReference(input.actorId),
      invoiceId: () => new InvoiceId(input.invoiceId),
      amount: () => Money.fromPrimitives(input.amount as { amount: number; currency: Currency }),
    });
  }

  protected async handle(command: PayInvoiceCommand): Promise<void> {
    const invoice = await this.invoices.findById(command.invoiceId);
    if (invoice === null) {
      throw new AggregateNotFoundException('Invoice', command.invoiceId.value);
    }
    invoice.requestPayment(command.actorId, command.amount);
    await this.invoices.save(invoice);
    await this.events.publish(invoice.pullDomainEvents());
  }
}
