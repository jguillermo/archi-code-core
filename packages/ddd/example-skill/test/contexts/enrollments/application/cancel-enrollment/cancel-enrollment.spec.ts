import { describe, expect, it } from 'vitest';
import {
  DomainEventBus,
  EventRegistry,
  InMemoryEventChannel,
} from '@archi-code/ddd/infrastructure';
import { CancelEnrollment } from '../../../../../src/contexts/enrollments/application/cancel-enrollment/cancel-enrollment';
import { EnrollmentNotFound } from '../../../../../src/contexts/enrollments/domain/exception/EnrollmentNotFound';
import { NotTheStudentOfEnrollment } from '../../../../../src/contexts/enrollments/domain/exception/NotTheStudentOfEnrollment';
import { EnrollmentStatus } from '../../../../../src/contexts/enrollments/domain/value-object/EnrollmentStatusType';
import { InMemoryEnrollmentRepository } from '../../../../../src/contexts/enrollments/infrastructure/persistence/in-memory-enrollment-repository';
import {
  aPendingEnrollment,
  laura,
  marta,
} from '../../../../support/enrollments/enrollment-fixtures';

function enrollmentsContext() {
  const enrollments = new InMemoryEnrollmentRepository();
  const channel = new InMemoryEventChannel();
  const cancel = new CancelEnrollment(
    enrollments,
    new DomainEventBus(channel, new EventRegistry()),
  );
  return { enrollments, channel, cancel };
}

describe('CancelEnrollment', () => {
  it('the student cancels their own enrollment', async () => {
    const { enrollments, channel, cancel } = enrollmentsContext();
    const enrollment = aPendingEnrollment(laura);
    await enrollments.save(enrollment);
    await cancel.execute({ actorId: laura, enrollmentId: enrollment.id.value });
    expect((await enrollments.findById(enrollment.id))?.status.value).toBe(
      EnrollmentStatus.CANCELLED,
    );
    expect(channel.sent.map((event) => event.eventName)).toEqual(['enrollment.cancelled']);
  });

  it('another student may not cancel it', async () => {
    const { enrollments, channel, cancel } = enrollmentsContext();
    const enrollment = aPendingEnrollment(laura);
    await enrollments.save(enrollment);
    await expect(
      cancel.execute({ actorId: marta, enrollmentId: enrollment.id.value }),
    ).rejects.toBeInstanceOf(NotTheStudentOfEnrollment);
    expect(channel.sent).toEqual([]);
  });

  it('an unknown enrollment cannot be cancelled', async () => {
    const { cancel } = enrollmentsContext();
    await expect(
      cancel.execute({ actorId: laura, enrollmentId: crypto.randomUUID() }),
    ).rejects.toBeInstanceOf(EnrollmentNotFound);
  });
});
