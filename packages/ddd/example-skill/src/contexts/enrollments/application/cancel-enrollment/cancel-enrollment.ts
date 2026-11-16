import { UseCase, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { EventBus } from '@archi-code/ddd/application';
import type { EnrollmentRepository } from '../../domain/repository/EnrollmentRepository';
import { EnrollmentFinder } from '../../domain/service/EnrollmentFinder';
import { EnrollmentId } from '../../domain/value-object/EnrollmentId';
import { StudentReference } from '../../domain/value-object/StudentReference';

export interface CancelEnrollmentInput {
  actorId: string;
  enrollmentId: string;
}

export interface CancelEnrollmentCommand {
  actorId: StudentReference;
  enrollmentId: EnrollmentId;
}

export class CancelEnrollment extends UseCase<
  CancelEnrollmentInput,
  CancelEnrollmentCommand,
  void
> {
  constructor(
    private readonly enrollments: EnrollmentRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  protected toCommand(input: CancelEnrollmentInput): CancelEnrollmentCommand {
    return ValueObjectBuilder.build({
      actorId: () => new StudentReference(input.actorId),
      enrollmentId: () => new EnrollmentId(input.enrollmentId),
    });
  }

  protected async handle(command: CancelEnrollmentCommand): Promise<void> {
    const enrollment = await new EnrollmentFinder(this.enrollments).find(command.enrollmentId);
    enrollment.cancel(command.actorId);
    await this.enrollments.save(enrollment);
    await this.events.publish(enrollment.pullDomainEvents());
  }
}
