import { Money } from '../../../src/contexts/shared-kernel/money/Money';
import type { Currency } from '../../../src/contexts/shared-kernel/money/MoneyCurrency';
import { Invoice } from '../../../src/contexts/billing/domain/aggregate/Invoice';
import { EnrollmentReference } from '../../../src/contexts/billing/domain/value-object/EnrollmentReference';
import { InvoiceId } from '../../../src/contexts/billing/domain/value-object/InvoiceId';
import { StudentReference } from '../../../src/contexts/billing/domain/value-object/StudentReference';

export const laura = '6f1c2a9e-3b7d-4c51-9a8e-2d4f6b8c0e11';
export const marta = '0a7e5d3c-1f2b-4e6a-8c9d-7b5a3e1f2c44';

export function fee(cents = 4_900): Money {
  return Money.fromPrimitives({ amount: cents, currency: 'EUR' as Currency });
}

export function anOpenInvoice(enrollmentId: string = crypto.randomUUID()): Invoice {
  const enrollment = new EnrollmentReference(enrollmentId);
  const invoice = Invoice.create(
    InvoiceId.forEnrollment(enrollment),
    enrollment,
    new StudentReference(laura),
    fee(),
  );
  invoice.pullDomainEvents();
  return invoice;
}
