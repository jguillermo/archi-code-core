import { NotAllowedException, UseCase, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { EventBus } from '@archi-code/ddd/application';
import type { EnrollmentRepository } from '../../domain/repository/EnrollmentRepository';
import { EnrollmentFinder } from '../../domain/service/EnrollmentFinder';
import { ActorRole, ActorRoleType } from '../../domain/value-object/ActorRoleType';
import { EnrollmentId } from '../../domain/value-object/EnrollmentId';

export interface CompleteEnrollmentInput {
  actorRole: string;
  enrollmentId: string;
}

export interface CompleteEnrollmentCommand {
  actorRole: ActorRoleType;
  enrollmentId: EnrollmentId;
}

export class CompleteEnrollment extends UseCase<
  CompleteEnrollmentInput,
  CompleteEnrollmentCommand,
  void
> {
  constructor(
    private readonly enrollments: EnrollmentRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  protected toCommand(input: CompleteEnrollmentInput): CompleteEnrollmentCommand {
    return ValueObjectBuilder.build({
      actorRole: () => new ActorRoleType(input.actorRole as ActorRole),
      enrollmentId: () => new EnrollmentId(input.enrollmentId),
    });
  }

  protected async handle(command: CompleteEnrollmentCommand): Promise<void> {
    if (command.actorRole.value !== ActorRole.TEACHER) {
      throw new NotAllowedException(
        `The role ${command.actorRole.value} may not complete enrollments`,
      );
    }
    const enrollment = await new EnrollmentFinder(this.enrollments).find(command.enrollmentId);
    enrollment.complete();
    await this.enrollments.save(enrollment);
    await this.events.publish(enrollment.pullDomainEvents());
  }
}
