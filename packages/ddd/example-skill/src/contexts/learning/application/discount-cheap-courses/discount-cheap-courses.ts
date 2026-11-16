import { Criteria } from '@archi-code/ddd/domain';
import { NotAllowedException, UseCase, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { EventBus, Logger } from '@archi-code/ddd/application';
import { Money } from '../../../shared-kernel/money/Money';
import type { Currency } from '../../../shared-kernel/money/MoneyCurrency';
import type { Course } from '../../domain/aggregate/Course';
import type { CourseRepository } from '../../domain/repository/CourseRepository';
import { ActorRole, ActorRoleType } from '../../domain/value-object/ActorRoleType';
import type { CourseId } from '../../domain/value-object/CourseId';
import { CourseStatus, CourseStatusType } from '../../domain/value-object/CourseStatusType';
import type { MoneyData } from '../create-course/money-data';

export interface DiscountCheapCoursesInput {
  actorRole: string;
  below: MoneyData;
}

export interface DiscountCheapCoursesCommand {
  actorRole: ActorRoleType;
  below: Money;
}

export class DiscountCheapCourses extends UseCase<
  DiscountCheapCoursesInput,
  DiscountCheapCoursesCommand,
  void
> {
  private static readonly PAGE_SIZE = 50;

  constructor(
    private readonly courses: CourseRepository,
    private readonly events: EventBus,
    private readonly logger: Logger,
  ) {
    super();
  }

  protected toCommand(input: DiscountCheapCoursesInput): DiscountCheapCoursesCommand {
    return ValueObjectBuilder.build({
      actorRole: () => new ActorRoleType(input.actorRole as ActorRole),
      below: () => Money.fromPrimitives(input.below as { amount: number; currency: Currency }),
    });
  }

  // Saves every selected course on its own: docs/decisions/0001-discount-cheap-courses-in-one-request.md
  protected async handle(command: DiscountCheapCoursesCommand): Promise<void> {
    if (command.actorRole.value !== ActorRole.EDITOR) {
      throw new NotAllowedException(`The role ${command.actorRole.value} may not discount courses`);
    }
    let discounted = 0;
    let after: CourseId | undefined;
    for (;;) {
      const { items } = await this.courses.search(
        Criteria.create<Course>({
          where: {
            status: new CourseStatusType(CourseStatus.PUBLISHED),
            'price.currency': command.below.currency,
            'price.amount': { lt: command.below.amount },
            id: { gt: after },
          },
          orderBy: { id: 'asc' },
          limit: DiscountCheapCourses.PAGE_SIZE,
        }),
      );
      if (items.length === 0) {
        break;
      }
      for (const course of items) {
        course.discountAsCheaperThan(command.below);
        await this.courses.save(course);
        await this.events.publish(course.pullDomainEvents());
        discounted += 1;
      }
      after = items[items.length - 1].id;
    }
    this.logger.info('cheap_courses_discounted', {
      below: command.below.toPrimitives(),
      discounted,
    });
  }
}
