import { AggregateRepository } from '@archi-code/ddd/domain';
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import type { Invoice } from '../aggregate/Invoice';
import type { InvoiceId } from '../value-object/InvoiceId';

export abstract class InvoiceRepository
  extends AggregateRepository<Invoice>
  implements AggregateFinder<Invoice>, AggregateSaver<Invoice>
{
  abstract findById(id: InvoiceId): Promise<Invoice | null>;
  abstract save(invoice: Invoice): Promise<void>;
}
