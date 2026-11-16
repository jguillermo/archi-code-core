import { NotAllowedException, UseCase, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { EventBus } from '@archi-code/ddd/application';
import type { CourseRepository } from '../../domain/repository/CourseRepository';
import { CourseFinder } from '../../domain/service/CourseFinder';
import { ActorRole, ActorRoleType } from '../../domain/value-object/ActorRoleType';
import { CourseId } from '../../domain/value-object/CourseId';
import { LessonNumber } from '../../domain/value-object/LessonNumber';
import { LessonTitle } from '../../domain/value-object/LessonTitle';

export interface RenameLessonInput {
  actorRole: string;
  courseId: string;
  lessonNumber: number;
  title: string;
}

export interface RenameLessonCommand {
  actorRole: ActorRoleType;
  courseId: CourseId;
  lessonNumber: LessonNumber;
  title: LessonTitle;
}

export class RenameLesson extends UseCase<RenameLessonInput, RenameLessonCommand, void> {
  constructor(
    private readonly courses: CourseRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  protected toCommand(input: RenameLessonInput): RenameLessonCommand {
    return ValueObjectBuilder.build({
      actorRole: () => new ActorRoleType(input.actorRole as ActorRole),
      courseId: () => new CourseId(input.courseId),
      lessonNumber: () => new LessonNumber(input.lessonNumber),
      title: () => new LessonTitle(input.title),
    });
  }

  protected async handle(command: RenameLessonCommand): Promise<void> {
    if (command.actorRole.value !== ActorRole.EDITOR) {
      throw new NotAllowedException(`The role ${command.actorRole.value} may not rename lessons`);
    }
    const course = await new CourseFinder(this.courses).find(command.courseId);
    course.renameLesson(command.lessonNumber, command.title);
    await this.courses.save(course);
    await this.events.publish(course.pullDomainEvents());
  }
}
