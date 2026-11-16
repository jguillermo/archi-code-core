import type { PrimitiveTypes } from '@archi-code/ddd/domain';
import { ConcurrencyException } from '@archi-code/ddd/application';
import { Invoice } from '../../domain/aggregate/Invoice';
import { InvoiceRepository } from '../../domain/repository/InvoiceRepository';
import type { InvoiceId } from '../../domain/value-object/InvoiceId';

interface InvoiceRow {
  version: number;
  primitives: PrimitiveTypes<Invoice>;
}

export class InMemoryInvoiceRepository extends InvoiceRepository {
  private readonly rows = new Map<string, InvoiceRow>();
  private readonly versions = new WeakMap<Invoice, number>();

  async findById(id: InvoiceId): Promise<Invoice | null> {
    const row = this.rows.get(id.value);
    if (row === undefined) {
      return null;
    }
    const invoice = Invoice.fromPrimitives(structuredClone(row.primitives));
    this.versions.set(invoice, row.version);
    return invoice;
  }

  async save(invoice: Invoice): Promise<void> {
    const key = invoice.id.value;
    const version = this.versions.get(invoice) ?? 0;
    if ((this.rows.get(key)?.version ?? 0) !== version) {
      throw new ConcurrencyException('Invoice', key, version);
    }
    this.rows.set(key, {
      version: version + 1,
      primitives: structuredClone(invoice.toPrimitives()),
    });
    this.versions.set(invoice, version + 1);
  }
}
