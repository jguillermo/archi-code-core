import { describe, expect, it } from 'vitest';
import { Invoice } from '../../../../../src/contexts/billing/domain/aggregate/Invoice';
import { InvoiceNotPayable } from '../../../../../src/contexts/billing/domain/exception/InvoiceNotPayable';
import { NotTheStudentOfInvoice } from '../../../../../src/contexts/billing/domain/exception/NotTheStudentOfInvoice';
import { PaymentAmountMismatch } from '../../../../../src/contexts/billing/domain/exception/PaymentAmountMismatch';
import { ChargeOutcome } from '../../../../../src/contexts/billing/domain/value-object/ChargeOutcome';
import { InvoiceStatus } from '../../../../../src/contexts/billing/domain/value-object/InvoiceStatusType';
import { StudentReference } from '../../../../../src/contexts/billing/domain/value-object/StudentReference';
import { anOpenInvoice, fee, laura, marta } from '../../../../support/billing/invoice-fixtures';

const charged = () => ChargeOutcome.fromPrimitives({ chargeId: 'ch_1', declineReason: null });
const declined = () =>
  ChargeOutcome.fromPrimitives({ chargeId: null, declineReason: 'insufficient_funds' });

function aRequestedInvoice(): Invoice {
  const invoice = anOpenInvoice();
  invoice.requestPayment(new StudentReference(laura), fee());
  invoice.pullDomainEvents();
  return invoice;
}

describe('Invoice', () => {
  it('keeps every field when stored and loaded', () => {
    const invoice = aRequestedInvoice();
    invoice.recordChargeOutcome(charged());
    expect(Invoice.fromPrimitives(invoice.toPrimitives()).toPrimitives()).toEqual(
      invoice.toPrimitives(),
    );
  });

  it('only its student pays it, for its exact amount, while it is open', () => {
    expect(() => anOpenInvoice().requestPayment(new StudentReference(marta), fee())).toThrow(
      NotTheStudentOfInvoice,
    );
    expect(() => anOpenInvoice().requestPayment(new StudentReference(laura), fee(100))).toThrow(
      PaymentAmountMismatch,
    );
    expect(() => aRequestedInvoice().requestPayment(new StudentReference(laura), fee())).toThrow(
      InvoiceNotPayable,
    );
  });

  it('is paid once when the charge succeeds, and opens again when it is declined', () => {
    const paid = aRequestedInvoice();
    paid.recordChargeOutcome(charged());
    paid.recordChargeOutcome(charged());
    expect(paid.status.value).toBe(InvoiceStatus.PAID);
    expect(paid.pullDomainEvents().map((event) => event.eventName)).toEqual(['invoice.paid']);
    const refused = aRequestedInvoice();
    refused.recordChargeOutcome(declined());
    expect(refused.status.value).toBe(InvoiceStatus.OPEN);
  });

  it('is voided when the enrollment is cancelled before payment, and refunded after it', () => {
    const open = anOpenInvoice();
    open.settleForCancelledEnrollment();
    open.settleForCancelledEnrollment();
    expect(open.status.value).toBe(InvoiceStatus.VOIDED);
    expect(open.pullDomainEvents().map((event) => event.eventName)).toEqual(['invoice.voided']);

    const paid = aRequestedInvoice();
    paid.recordChargeOutcome(charged());
    paid.settleForCancelledEnrollment();
    paid.recordRefund();
    expect(paid.status.value).toBe(InvoiceStatus.REFUNDED);
  });

  it('refunds a charge that succeeds after the enrollment was cancelled', () => {
    const invoice = aRequestedInvoice();
    invoice.settleForCancelledEnrollment();
    invoice.recordChargeOutcome(charged());
    expect(invoice.status.value).toBe(InvoiceStatus.REFUND_REQUESTED);
    expect(invoice.pullDomainEvents().map((event) => event.eventName)).toEqual([
      'invoice.paid',
      'invoice.refund_requested',
    ]);
  });
});
