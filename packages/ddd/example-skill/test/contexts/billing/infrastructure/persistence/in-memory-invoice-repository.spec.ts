import { describe } from 'vitest';
import { InMemoryInvoiceRepository } from '../../../../../src/contexts/billing/infrastructure/persistence/in-memory-invoice-repository';
import { invoiceRepositoryContract } from '../../../../support/billing/invoice-repository-contract';

describe('InMemoryInvoiceRepository', () =>
  invoiceRepositoryContract(async () => new InMemoryInvoiceRepository()));
