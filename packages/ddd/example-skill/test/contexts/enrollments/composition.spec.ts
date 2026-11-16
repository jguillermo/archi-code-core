import { describe, expect, it } from 'vitest';
import { InMemoryEventChannel, InMemoryLogger } from '@archi-code/ddd/infrastructure';
import { EnrollmentsContext } from '../../../src/contexts/enrollments/composition';
import { laura, marta, weldingCourse } from '../../support/enrollments/enrollment-fixtures';
import { aSerializedEvent } from '../../support/serialized-event';

const asLaura = { userId: laura, role: 'student' };
const asMarta = { userId: marta, role: 'student' };
const asTeacher = { userId: crypto.randomUUID(), role: 'teacher' };

function coursePublished(occurredOn = '2026-03-01T09:00:00.000Z') {
  return aSerializedEvent(
    'course.published',
    { courseId: weldingCourse, title: 'MIG welding', price: { amount: 4_900, currency: 'EUR' } },
    occurredOn,
  );
}

function courseArchived(occurredOn = '2026-03-05T09:00:00.000Z') {
  return aSerializedEvent('course.archived', { courseId: weldingCourse }, occurredOn);
}

async function enrollments() {
  const channel = new InMemoryEventChannel();
  const logger = new InMemoryLogger();
  const context = await EnrollmentsContext.start({ channel, logger });
  return { channel, logger, controller: context.controller, context };
}

function sentNamed(channel: InMemoryEventChannel, eventName: string) {
  return channel.sent.filter((event) => event.eventName === eventName);
}

describe('EnrollmentsContext', () => {
  it('opens a published course once, even when the event arrives twice', async () => {
    const { channel, controller } = await enrollments();
    const published = coursePublished();
    await channel.send([published, published]);
    const catalog = await controller.openCatalog();
    expect(catalog.body).toMatchObject([
      { courseId: weldingCourse, title: 'MIG welding', price: { amount: 4_900 } },
    ]);
  });

  it('keeps a course closed when its archive arrives before its publication', async () => {
    const { channel, controller } = await enrollments();
    await channel.send([courseArchived(), coursePublished()]);
    expect((await controller.openCatalog()).body).toEqual([]);
    const response = await controller.enroll({ auth: asLaura, body: { courseId: weldingCourse } });
    expect(response).toMatchObject({ status: 422, body: { code: 'ENR001' } });
  });

  it('charges the discounted price when the discount arrives before the publication', async () => {
    const { channel, controller } = await enrollments();
    await channel.send([
      aSerializedEvent(
        'course.discounted',
        { courseId: weldingCourse, price: { amount: 4_410, currency: 'EUR' } },
        '2026-03-02T09:00:00.000Z',
      ),
      coursePublished('2026-03-01T09:00:00.000Z'),
    ]);
    await controller.enroll({ auth: asLaura, body: { courseId: weldingCourse } });
    expect((await controller.mine({ auth: asLaura })).body).toMatchObject([
      { fee: { amount: 4_410, currency: 'EUR' } },
    ]);
  });

  it('a student enrolls once, and again after cancelling', async () => {
    const { channel, controller } = await enrollments();
    await channel.send([coursePublished()]);
    const first = await controller.enroll({ auth: asLaura, body: { courseId: weldingCourse } });
    expect(first.status).toBe(201);
    const twice = await controller.enroll({ auth: asLaura, body: { courseId: weldingCourse } });
    expect(twice).toMatchObject({ status: 422, body: { code: 'ENR002' } });

    const enrollmentId = (first.body as { id: string }).id;
    const cancelled = await controller.cancel({ auth: asLaura, params: { enrollmentId } });
    expect(cancelled.status).toBe(204);
    const again = await controller.enroll({ auth: asLaura, body: { courseId: weldingCourse } });
    expect(again.status).toBe(201);
    expect((await controller.mine({ auth: asLaura })).body).toHaveLength(2);
  });

  it('only the owner cancels, and only while pending payment or active', async () => {
    const { channel, controller } = await enrollments();
    await channel.send([coursePublished()]);
    const enrolled = await controller.enroll({ auth: asLaura, body: { courseId: weldingCourse } });
    const enrollmentId = (enrolled.body as { id: string }).id;

    expect(await controller.cancel({ auth: asMarta, params: { enrollmentId } })).toMatchObject({
      status: 422,
      body: { code: 'ENR004' },
    });
    await channel.send([
      aSerializedEvent('invoice.paid', { invoiceId: crypto.randomUUID(), enrollmentId }),
    ]);
    expect(await controller.complete({ auth: asLaura, params: { enrollmentId } })).toMatchObject({
      status: 403,
    });
    expect((await controller.complete({ auth: asTeacher, params: { enrollmentId } })).status).toBe(
      204,
    );
    expect(await controller.cancel({ auth: asLaura, params: { enrollmentId } })).toMatchObject({
      status: 422,
      body: { code: 'ENR005' },
    });
    expect(
      await controller.cancel({ auth: asLaura, params: { enrollmentId: crypto.randomUUID() } }),
    ).toMatchObject({ status: 404, body: { code: 'ENR003' } });
  });

  it('activates an enrollment once when its invoice is paid twice', async () => {
    const { channel, controller } = await enrollments();
    await channel.send([coursePublished()]);
    const enrolled = await controller.enroll({ auth: asLaura, body: { courseId: weldingCourse } });
    const paid = aSerializedEvent('invoice.paid', {
      invoiceId: crypto.randomUUID(),
      enrollmentId: (enrolled.body as { id: string }).id,
    });
    await channel.send([paid]);
    await channel.send([paid]);
    expect(sentNamed(channel, 'enrollment.activated')).toHaveLength(1);
    expect((await controller.mine({ auth: asLaura })).body).toMatchObject([{ activated: true }]);
  });

  it('cancels every open enrollment of an archived course once, and logs it', async () => {
    const { channel, logger, controller } = await enrollments();
    await channel.send([coursePublished()]);
    await controller.enroll({ auth: asLaura, body: { courseId: weldingCourse } });
    await controller.enroll({ auth: asMarta, body: { courseId: weldingCourse } });

    const archived = courseArchived();
    await channel.send([archived]);
    await channel.send([archived]);

    expect(sentNamed(channel, 'enrollment.cancelled')).toMatchObject([
      { reason: 'course_archived' },
      { reason: 'course_archived' },
    ]);
    expect((await controller.mine({ auth: asMarta })).body).toMatchObject([{ cancelled: true }]);
    expect(
      logger.entries.filter((entry) => entry.message === 'course_enrollments_cancelled'),
    ).toMatchObject([{ level: 'info', context: { courseId: weldingCourse, cancelled: 2 } }]);
  });

  it('asks for a session before enrolling', async () => {
    const { controller } = await enrollments();
    expect((await controller.enroll({ body: { courseId: weldingCourse } })).status).toBe(401);
    expect((await controller.enroll({ auth: asLaura, body: [] })).status).toBe(400);
  });
});
