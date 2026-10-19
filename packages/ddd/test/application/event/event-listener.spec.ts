import { describe, expect, expectTypeOf, it } from 'vitest';
import { EventListener } from '../../../src/application/event/event-listener';
import { ListensTo } from '../../../src/application/event/listens-to';
import { UseCase } from '../../../src/application/use-case/use-case';
import { EventBase, IdType } from '../../../src/domain/index';

class InvoiceIssued extends EventBase {
  static readonly eventName = 'InvoiceIssued';

  constructor(
    invoiceId: string,
    readonly customerEmail: string,
  ) {
    super(invoiceId);
  }
}

class InvoiceId extends IdType {}

class SendInvoice extends UseCase<{ invoiceId: string; to: string }, InvoiceId, string> {
  readonly sent: string[] = [];

  protected toCommand(input: { invoiceId: string; to: string }): InvoiceId {
    this.sent.push(input.to);
    return new InvoiceId(input.invoiceId);
  }

  protected handle(invoiceId: InvoiceId): string {
    return invoiceId.value;
  }
}

@ListensTo(InvoiceIssued, { consumer: 'send-invoice-on-invoice-issued' })
class SendInvoiceOnInvoiceIssued extends EventListener<InvoiceIssued> {
  constructor(private readonly sendInvoice: SendInvoice) {
    super();
  }

  async handle(event: InvoiceIssued): Promise<void> {
    await this.sendInvoice.execute({ invoiceId: event.aggregateId, to: event.customerEmail });
  }
}

const invoiceId = '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d';

describe('EventListener: what the application does when an event happens', () => {
  it('translates the event into the input of one use case and runs it', async () => {
    const sendInvoice = new SendInvoice();
    await new SendInvoiceOnInvoiceIssued(sendInvoice).handle(
      new InvoiceIssued(invoiceId, 'ana@example.com'),
    );
    expect(sendInvoice.sent).toEqual(['ana@example.com']);
  });

  it('is typed by the event it listens to', () => {
    expectTypeOf<SendInvoiceOnInvoiceIssued['handle']>().toEqualTypeOf<
      (event: InvoiceIssued) => Promise<void>
    >();
    expectTypeOf<EventListener['handle']>().toEqualTypeOf<
      (event: EventBase) => Promise<void> | void
    >();
  });

  it('adds nothing to the class but the handle the listener writes', () => {
    expect(Object.getOwnPropertyNames(EventListener.prototype)).toEqual(['constructor']);
  });
});
