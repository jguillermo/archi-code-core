import { NotAllowedException, UseCase, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { EventBus } from '@archi-code/ddd/application';
import { CourseRetirement } from '../../domain/aggregate/CourseRetirement';
import type { CourseRepository } from '../../domain/repository/CourseRepository';
import { CourseFinder } from '../../domain/service/CourseFinder';
import { ActorRole, ActorRoleType } from '../../domain/value-object/ActorRoleType';
import { CourseId } from '../../domain/value-object/CourseId';

export interface RetireCourseInput {
  actorRole: string;
  courseId: string;
}

export interface RetireCourseCommand {
  actorRole: ActorRoleType;
  courseId: CourseId;
}

export class RetireCourse extends UseCase<RetireCourseInput, RetireCourseCommand, void> {
  constructor(
    private readonly courses: CourseRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  protected toCommand(input: RetireCourseInput): RetireCourseCommand {
    return ValueObjectBuilder.build({
      actorRole: () => new ActorRoleType(input.actorRole as ActorRole),
      courseId: () => new CourseId(input.courseId),
    });
  }

  protected async handle(command: RetireCourseCommand): Promise<void> {
    if (command.actorRole.value !== ActorRole.EDITOR) {
      throw new NotAllowedException(`The role ${command.actorRole.value} may not retire courses`);
    }
    const course = await new CourseFinder(this.courses).find(command.courseId);
    if (course.retire() === CourseRetirement.DISCARDED) {
      await this.courses.remove(course);
    } else {
      await this.courses.save(course);
    }
    await this.events.publish(course.pullDomainEvents());
  }
}
