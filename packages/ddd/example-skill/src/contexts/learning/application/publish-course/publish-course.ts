import { NotAllowedException, UseCase, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { EventBus } from '@archi-code/ddd/application';
import type { CourseRepository } from '../../domain/repository/CourseRepository';
import { CourseFinder } from '../../domain/service/CourseFinder';
import { ActorRole, ActorRoleType } from '../../domain/value-object/ActorRoleType';
import { CourseId } from '../../domain/value-object/CourseId';

export interface PublishCourseInput {
  actorRole: string;
  courseId: string;
}

export interface PublishCourseCommand {
  actorRole: ActorRoleType;
  courseId: CourseId;
}

export class PublishCourse extends UseCase<PublishCourseInput, PublishCourseCommand, void> {
  constructor(
    private readonly courses: CourseRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  protected toCommand(input: PublishCourseInput): PublishCourseCommand {
    return ValueObjectBuilder.build({
      actorRole: () => new ActorRoleType(input.actorRole as ActorRole),
      courseId: () => new CourseId(input.courseId),
    });
  }

  protected async handle(command: PublishCourseCommand): Promise<void> {
    if (command.actorRole.value !== ActorRole.EDITOR) {
      throw new NotAllowedException(`The role ${command.actorRole.value} may not publish courses`);
    }
    const course = await new CourseFinder(this.courses).find(command.courseId);
    course.publish();
    await this.courses.save(course);
    await this.events.publish(course.pullDomainEvents());
  }
}
