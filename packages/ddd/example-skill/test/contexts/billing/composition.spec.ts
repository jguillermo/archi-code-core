import { describe, expect, it } from 'vitest';
import { InMemoryEventChannel, InMemoryLogger } from '@archi-code/ddd/infrastructure';
import { BillingContext } from '../../../src/contexts/billing/composition';
import { EnrollmentReference } from '../../../src/contexts/billing/domain/value-object/EnrollmentReference';
import { InvoiceId } from '../../../src/contexts/billing/domain/value-object/InvoiceId';
import { laura, marta } from '../../support/billing/invoice-fixtures';
import { aSerializedEvent } from '../../support/serialized-event';

const fee = { amount: 4_900, currency: 'EUR' };

function enrollmentEvent(eventName: string, enrollmentId: string) {
  return aSerializedEvent(eventName, {
    enrollmentId,
    studentId: laura,
    courseId: crypto.randomUUID(),
    fee,
    reason: 'student_request',
  });
}

async function billing(declineAboveCents: number | null = null) {
  const channel = new InMemoryEventChannel();
  const logger = new InMemoryLogger();
  const context = await BillingContext.start({ channel, logger, declineAboveCents });
  const enrollmentId = crypto.randomUUID();
  const invoiceId = InvoiceId.forEnrollment(new EnrollmentReference(enrollmentId)).value;
  const pay = (userId: string, amount = fee) =>
    context.controller.pay({
      auth: { userId, role: 'student' },
      params: { invoiceId },
      body: { amount },
    });
  return { channel, logger, enrollmentId, invoiceId, pay };
}

function names(channel: InMemoryEventChannel): string[] {
  return channel.sent.map((event) => event.eventName);
}

describe('BillingContext', () => {
  it('issues one invoice per enrollment, even when the event arrives twice', async () => {
    const { channel, enrollmentId, invoiceId } = await billing();
    const created = enrollmentEvent('enrollment.created', enrollmentId);
    await channel.send([created]);
    await channel.send([created]);
    expect(channel.sent.filter((event) => event.eventName === 'invoice.created')).toMatchObject([
      { invoiceId, enrollmentId, amount: fee },
    ]);
  });

  it('voids the invoice of an enrollment cancelled before its creation arrived', async () => {
    const { channel, enrollmentId, pay } = await billing();
    await channel.send([enrollmentEvent('enrollment.cancelled', enrollmentId)]);
    await channel.send([enrollmentEvent('enrollment.created', enrollmentId)]);
    expect(names(channel)).not.toContain('invoice.created');
    expect(names(channel)).toContain('invoice.voided');
    expect(await pay(laura)).toMatchObject({ status: 422, body: { code: 'BIL002' } });
  });

  it('charges the student through the gateway and reports the invoice paid', async () => {
    const { channel, logger, enrollmentId, pay } = await billing();
    await channel.send([enrollmentEvent('enrollment.created', enrollmentId)]);
    expect(await pay(marta)).toMatchObject({ status: 422, body: { code: 'BIL001' } });
    expect(await pay(laura, { amount: 100, currency: 'EUR' })).toMatchObject({
      status: 422,
      body: { code: 'BIL003' },
    });
    expect((await pay(laura)).status).toBe(204);
    expect(names(channel)).toEqual([
      'enrollment.created',
      'invoice.created',
      'invoice.payment_requested',
      'invoice.paid',
    ]);
    expect(
      logger.entries.filter((entry) => entry.message === 'invoice_charge_settled'),
    ).toMatchObject([{ context: { status: 'paid' } }]);
  });

  it('refunds a paid invoice when the enrollment is cancelled, once', async () => {
    const { channel, enrollmentId, pay } = await billing();
    await channel.send([enrollmentEvent('enrollment.created', enrollmentId)]);
    await pay(laura);
    const cancelled = enrollmentEvent('enrollment.cancelled', enrollmentId);
    await channel.send([cancelled]);
    await channel.send([cancelled]);
    expect(names(channel).slice(4)).toEqual([
      'enrollment.cancelled',
      'invoice.refund_requested',
      'invoice.refunded',
      'enrollment.cancelled',
    ]);
  });

  it('keeps the invoice payable when the gateway declines the charge', async () => {
    const { channel, enrollmentId, pay } = await billing(1_000);
    await channel.send([enrollmentEvent('enrollment.created', enrollmentId)]);
    expect((await pay(laura)).status).toBe(204);
    expect(names(channel)).toContain('invoice.payment_declined');
    expect((await pay(laura)).status).toBe(204);
  });

  it('answers 404 for an unknown invoice', async () => {
    const { pay } = await billing();
    expect(await pay(laura)).toMatchObject({ status: 404, body: { code: 'APP002' } });
  });
});
