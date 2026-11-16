import { describe, expect, it } from 'vitest';
import { InMemoryEventChannel, InMemoryLogger } from '@archi-code/ddd/infrastructure';
import { BillingContext } from '../src/contexts/billing/composition';
import { EnrollmentReference } from '../src/contexts/billing/domain/value-object/EnrollmentReference';
import { InvoiceId } from '../src/contexts/billing/domain/value-object/InvoiceId';
import { EnrollmentsContext } from '../src/contexts/enrollments/composition';
import { aSerializedEvent } from './support/serialized-event';

const student = { userId: '6f1c2a9e-3b7d-4c51-9a8e-2d4f6b8c0e11', role: 'student' };
const courseId = 'c3d2e1f0-9a8b-4c7d-8e6f-5a4b3c2d1e00';

describe('Enrollments and billing on one channel', () => {
  it('a student enrolls, pays, becomes active and is refunded after cancelling', async () => {
    const channel = new InMemoryEventChannel({ delivery: 'serial' });
    const logger = new InMemoryLogger();
    const enrollments = await EnrollmentsContext.start({ channel, logger });
    const billing = await BillingContext.start({ channel, logger, declineAboveCents: null });
    await channel.send([
      aSerializedEvent('course.published', {
        courseId,
        title: 'MIG welding',
        price: { amount: 4_900, currency: 'EUR' },
      }),
    ]);

    const enrolled = await enrollments.controller.enroll({ auth: student, body: { courseId } });
    const enrollmentId = (enrolled.body as { id: string }).id;
    const invoiceId = InvoiceId.forEnrollment(new EnrollmentReference(enrollmentId)).value;
    const paid = await billing.controller.pay({
      auth: student,
      params: { invoiceId },
      body: { amount: { amount: 4_900, currency: 'EUR' } },
    });
    expect(paid.status).toBe(204);
    expect((await enrollments.controller.mine({ auth: student })).body).toMatchObject([
      { enrollmentId, activated: true, cancelled: false },
    ]);

    await enrollments.controller.cancel({ auth: student, params: { enrollmentId } });
    expect(channel.sent.map((event) => event.eventName)).toContain('invoice.refunded');

    await billing.stop();
    await enrollments.stop();
  });
});
