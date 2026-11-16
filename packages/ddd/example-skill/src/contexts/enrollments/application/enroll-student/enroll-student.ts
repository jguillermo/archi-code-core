import { Criteria } from '@archi-code/ddd/domain';
import { UseCase, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { EventBus } from '@archi-code/ddd/application';
import { Enrollment } from '../../domain/aggregate/Enrollment';
import type { EnrollmentRepository } from '../../domain/repository/EnrollmentRepository';
import type { CourseCatalog } from '../../domain/service/CourseCatalog';
import { EnrollmentAdmission } from '../../domain/service/EnrollmentAdmission';
import { CourseReference } from '../../domain/value-object/CourseReference';
import { EnrollmentId } from '../../domain/value-object/EnrollmentId';
import {
  EnrollmentStatus,
  EnrollmentStatusType,
} from '../../domain/value-object/EnrollmentStatusType';
import { StudentReference } from '../../domain/value-object/StudentReference';

export interface EnrollStudentInput {
  actorId: string;
  courseId: string;
}

export interface EnrollStudentCommand {
  student: StudentReference;
  course: CourseReference;
}

export class EnrollStudent extends UseCase<EnrollStudentInput, EnrollStudentCommand, string> {
  constructor(
    private readonly enrollments: EnrollmentRepository,
    private readonly catalog: CourseCatalog,
    private readonly events: EventBus,
  ) {
    super();
  }

  protected toCommand(input: EnrollStudentInput): EnrollStudentCommand {
    return ValueObjectBuilder.build({
      student: () => new StudentReference(input.actorId),
      course: () => new CourseReference(input.courseId),
    });
  }

  protected async handle(command: EnrollStudentCommand): Promise<string> {
    const { items } = await this.enrollments.search(
      Criteria.create<Enrollment>({
        where: {
          student: command.student,
          course: command.course,
          status: { ne: new EnrollmentStatusType(EnrollmentStatus.CANCELLED) },
        },
        limit: 1,
      }),
    );
    const fee = await new EnrollmentAdmission(this.catalog).feeToAdmit(
      command.student,
      command.course,
      items,
    );
    const enrollment = Enrollment.create(
      EnrollmentId.generate(),
      command.student,
      command.course,
      fee,
    );
    await this.enrollments.save(enrollment);
    await this.events.publish(enrollment.pullDomainEvents());
    return enrollment.id.value;
  }
}
