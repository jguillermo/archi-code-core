import { expect, it } from 'vitest';
import { ConcurrencyException } from '@archi-code/ddd/application';
import type { Invoice } from '../../../src/contexts/billing/domain/aggregate/Invoice';
import type { InvoiceRepository } from '../../../src/contexts/billing/domain/repository/InvoiceRepository';
import { InvoiceStatus } from '../../../src/contexts/billing/domain/value-object/InvoiceStatusType';
import { StudentReference } from '../../../src/contexts/billing/domain/value-object/StudentReference';
import { anOpenInvoice, fee, laura } from './invoice-fixtures';

async function loaded(invoices: InvoiceRepository, invoice: Invoice): Promise<Invoice> {
  const found = await invoices.findById(invoice.id);
  expect(found).not.toBeNull();
  return found as Invoice;
}

export function invoiceRepositoryContract(make: () => Promise<InvoiceRepository>): void {
  it('loads the invoice it saved', async () => {
    const invoices = await make();
    const invoice = anOpenInvoice();
    await invoices.save(invoice);
    expect((await invoices.findById(invoice.id))?.toPrimitives()).toEqual(invoice.toPrimitives());
  });

  it('saves the same invoice twice', async () => {
    const invoices = await make();
    const invoice = anOpenInvoice();
    await invoices.save(invoice);
    invoice.requestPayment(new StudentReference(laura), fee());
    await invoices.save(invoice);
    expect((await invoices.findById(invoice.id))?.status.value).toBe(
      InvoiceStatus.PAYMENT_REQUESTED,
    );
  });

  it('refuses a stale save', async () => {
    const invoices = await make();
    const invoice = anOpenInvoice();
    await invoices.save(invoice);
    const first = await loaded(invoices, invoice);
    const second = await loaded(invoices, invoice);
    first.settleForCancelledEnrollment();
    await invoices.save(first);
    second.requestPayment(new StudentReference(laura), fee());
    await expect(invoices.save(second)).rejects.toBeInstanceOf(ConcurrencyException);
  });

  it('refuses a new invoice whose id is taken', async () => {
    const invoices = await make();
    const enrollmentId = crypto.randomUUID();
    await invoices.save(anOpenInvoice(enrollmentId));
    await expect(invoices.save(anOpenInvoice(enrollmentId))).rejects.toBeInstanceOf(
      ConcurrencyException,
    );
  });
}
