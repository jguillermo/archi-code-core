import { NotAllowedException, UseCase, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { EventBus } from '@archi-code/ddd/application';
import { Money } from '../../../shared-kernel/money/Money';
import type { Currency } from '../../../shared-kernel/money/MoneyCurrency';
import { Course } from '../../domain/aggregate/Course';
import type { NewLesson } from '../../domain/aggregate/NewLesson';
import type { CourseRepository } from '../../domain/repository/CourseRepository';
import { CourseFinder } from '../../domain/service/CourseFinder';
import { ActorRole, ActorRoleType } from '../../domain/value-object/ActorRoleType';
import { CourseId } from '../../domain/value-object/CourseId';
import { CourseTitle } from '../../domain/value-object/CourseTitle';
import { LessonDuration } from '../../domain/value-object/LessonDuration';
import { LessonTitle } from '../../domain/value-object/LessonTitle';
import type { LessonData } from './lesson-data';
import type { MoneyData } from './money-data';

export interface CreateCourseInput {
  actorRole: string;
  courseId: string;
  title: string;
  price: MoneyData;
  lessons: LessonData[];
}

export interface CreateCourseCommand {
  actorRole: ActorRoleType;
  courseId: CourseId;
  title: CourseTitle;
  price: Money;
  lessons: NewLesson[];
}

export class CreateCourse extends UseCase<CreateCourseInput, CreateCourseCommand, string> {
  constructor(
    private readonly courses: CourseRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  protected toCommand(input: CreateCourseInput): CreateCourseCommand {
    return ValueObjectBuilder.build({
      actorRole: () => new ActorRoleType(input.actorRole as ActorRole),
      courseId: () => new CourseId(input.courseId),
      title: () => new CourseTitle(input.title),
      price: () => Money.fromPrimitives(input.price as { amount: number; currency: Currency }),
      lessons: () =>
        ValueObjectBuilder.buildList(input.lessons, (lesson) =>
          ValueObjectBuilder.build({
            title: () => new LessonTitle(lesson.title),
            duration: () => new LessonDuration(lesson.durationMinutes),
          }),
        ),
    });
  }

  protected async handle(command: CreateCourseCommand): Promise<string> {
    if (command.actorRole.value !== ActorRole.EDITOR) {
      throw new NotAllowedException(`The role ${command.actorRole.value} may not create courses`);
    }
    await new CourseFinder(this.courses).assertDoesNotExist(command.courseId);
    const course = Course.create(command.courseId, command.title, command.price, command.lessons);
    await this.courses.save(course);
    await this.events.publish(course.pullDomainEvents());
    return course.id.value;
  }
}
