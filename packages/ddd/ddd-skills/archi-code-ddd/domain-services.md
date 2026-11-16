# Domain services and specifications

Part of the `archi-code-ddd` skill: read it only when that skill routes here. Logic shared by
several use cases, rules over several aggregates or a domain port, and named business rules.

## Rules

- **A named business rule that selects, validates or combines is a `Specification<T>`**
  (`specification/<Rule>.ts`): it implements `isSatisfiedBy(x): boolean`, receives its parameters
  by constructor (then `super()`), and a composed rule keeps
  `private readonly rule = new A(…).or(new B(…)).and(new C().not())` and returns
  `this.rule.isSatisfiedBy(x)`; `and`/`or` accept any `SatisfiedBy<T>` [IDDD ch. 5]. It has a
  business name (never a generic `FieldEquals`), receives loaded data only, never a repository, and
  answers a question; it never guards an invariant (its answer is data, such as `freeShipping` in
  `OrderCreatedDomainEvent`).

- **When** (user rule; `[Fuera de los libros: convención de @archi-code/ddd]`, IDDD ch. 7 is
  broader). A domain service (`service/<Service>.ts`) exists only when:
  - two or more use cases (user or reaction) share business logic (`CreateCourse` and
    `PublishCourse` both look the course up: `CourseFinder`); never one use case calling another;
  - or a business rule that one use case needs does not fit in one aggregate nor value object,
    because it needs several aggregates or a domain port (`OrderPricing` with `CouponCatalog`,
    used only by `PlaceOrder`). A use case holds no business rule, so the rule never stays in
    its `handle`.

  Anything else is not a domain service: a rule of one aggregate is a method of the aggregate
  (also a rule between who asks and the aggregate's state: `order.cancel(requester)` throws
  when the requester is not its customer), a calculation over values is a method of the value
  object, a named yes/no criterion is a `Specification`, loading, authorizing, saving and
  publishing is the use case, and a port call with no rule around it is not a service either: the
  use case or reaction calls the port directly. A bare shared `findById` is not a service: each use
  case keeps its own lookup with `AggregateNotFoundException`.
- **How.** A plain class (no base class, no state) named after the business operation
  (`OrderPricing`, `CourseFinder`; never `…Manager`, `…Helper`, `…Utils`); it works with value
  objects and aggregates, throws business errors of its context (never
  `AggregateNotFoundException`, which is `/application`) and never saves, removes, opens
  transactions, publishes, logs nor checks authorization [IDDD ch. 7]. Three forms, in this order
  of preference:
  1. **Loaded aggregates as arguments, no dependencies**: the use case already holds what the
     rule needs and passes it to the method
     (`new ShippingCostCalculator().costFor(order, zone)`).
  2. **The abstract repository of an aggregate** by constructor, only to read with `findById`
     (`constructor(private readonly courses: CourseRepository) {}`): never the repository
     implementation (`IndexedDbCourseRepository`), as a type nor instantiated.
  3. **A domain port** by constructor (`constructor(private readonly catalog: CouponCatalog) {}`):
     an interface in `service/<Port>.ts` whose methods speak value objects
     (`discountOf(code: CouponCode): Promise<DiscountPercent | null>`), implemented in
     infrastructure by its own adapter (never by a repository nor a read-model store).
- **Instantiated inside the use case, never injected** (user rule): the domain never instantiates
  a repository nor an adapter and never imports `/infrastructure`; the concrete adapter
  (`IndexedDbCourseRepository`, `InMemoryCouponCatalog`) is built only in `composition.ts` and
  injected into the use case. The use case (user or reaction) receives those dependencies in its
  own constructor, typed with the abstract repository or the port, and builds the service inside
  `handle`, passing them (`await new CourseFinder(this.courses).find(command.courseId)`,
  `await new OrderPricing(this.coupons).discountFor(command.couponCodes)`). No constructor of a
  use case or a reaction receives a domain service and `composition.ts` never builds one. A
  reaction keeps its own rules: it calls only methods whose business errors it does not let out.
- **Testing**: a unit spec with real domain objects; its dependencies (the abstract repository, a
  port) are stubs with `vi.fn()` (`findById` resolving the aggregate or `null`). Code below, in
  "Logic two use cases share".

## Code

### Specifications and domain services

```ts
import { Specification } from '@archi-code/ddd/domain';

export class SubtotalAtLeast extends Specification<Order> {
  constructor(private readonly cents: number) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.subtotal().isAtLeast(this.cents);
  }
}

export class FreeShippingEligible extends Specification<Order> {
  private readonly rule = new SubtotalAtLeast(5000)
    .or(new ContainsSku(new Sku('PREMIUM-PASS')))
    .and(new ContainsSku(new Sku('GIFT-CARD')).not());

  isSatisfiedBy(order: Order): boolean {
    return this.rule.isSatisfiedBy(order);
  }
}
```

A domain service with its domain port (`service/CouponCatalog.ts` and `service/OrderPricing.ts`),
used only by `PlaceOrder`, which receives `CouponCatalog` by constructor and does
`new OrderPricing(this.coupons)` in `handle`:

```ts
export interface CouponCatalog {
  discountOf(code: CouponCode): Promise<DiscountPercent | null>;
}

export class OrderPricing {
  private static readonly MAX_DISCOUNT = 50;

  constructor(private readonly catalog: CouponCatalog) {}

  async discountFor(codes: CouponCodes): Promise<DiscountPercent> {
    let percent = 0;
    for (const code of codes.items) {
      const discount = await this.catalog.discountOf(code);
      if (discount === null) {
        throw new UnknownCoupon(code.value);
      }
      percent += discount.value;
    }
    return new DiscountPercent(Math.min(percent, OrderPricing.MAX_DISCOUNT));
  }
}
```

### Logic two use cases share: a domain service, never another use case

`PublishCourse` loads a course and fails when it does not exist; `CreateCourse` must check that
the course does not exist yet. Both look the course up in its repository. Neither uses the other
(no `new PublishCourse(...)`, no use case in a constructor, no `execute` of another use case): the
lookup moves to a domain service and each use case instantiates it.

`domain/exception/CourseNotFound.ts` and `domain/exception/CourseAlreadyExists.ts`:

```ts
import { DomainException } from '@archi-code/ddd/domain';

export class CourseNotFound extends DomainException {
  constructor(courseId: string) {
    super(`Course ${courseId} does not exist`, ['CRS001']);
  }
}

export class CourseAlreadyExists extends DomainException {
  constructor(courseId: string) {
    super(`Course ${courseId} already exists`, ['CRS002']);
  }
}
```

`domain/service/CourseFinder.ts`: its dependency, the abstract repository, goes in its
constructor:

```ts
export class CourseFinder {
  constructor(private readonly courses: CourseRepository) {}

  async find(id: CourseId): Promise<Course> {
    const course = await this.courses.findById(id);
    if (course === null) {
      throw new CourseNotFound(id.value);
    }
    return course;
  }

  async assertDoesNotExist(id: CourseId): Promise<void> {
    if ((await this.courses.findById(id)) !== null) {
      throw new CourseAlreadyExists(id.value);
    }
  }
}
```

Each use case receives the repository by constructor and builds the service inside `handle`:

```ts
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

export class CreateCourse extends UseCase<CreateCourseInput, CreateCourseCommand, string> {
  constructor(
    private readonly courses: CourseRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  protected toCommand(input: CreateCourseInput): CreateCourseCommand {
    return ValueObjectBuilder.build({
      courseId: () => new CourseId(input.courseId),
      title: () => new CourseTitle(input.title),
    });
  }

  protected async handle(command: CreateCourseCommand): Promise<string> {
    await new CourseFinder(this.courses).assertDoesNotExist(command.courseId);
    const course = Course.create(command.courseId, command.title);
    await this.courses.save(course);
    await this.events.publish(course.pullDomainEvents());
    return course.id.value;
  }
}
```

`composition.ts` builds `new PublishCourse(courses, bus)` and `new CreateCourse(courses, bus)`: it
never builds `CourseFinder`, and no use case receives another one. `CourseNotFound` and
`CourseAlreadyExists` are business errors (`ExceptionKind.Invalid`, 422); the protocol helper
lists `CRS001` in `NOT_FOUND_CODES` to answer 404.

The domain service has its own unit spec: real domain objects, and its dependency, the abstract
repository, stubbed with `vi.fn()`:

```ts
import { describe, expect, it, vi } from 'vitest';

function coursesFinding(course: Course | null): CourseRepository {
  return { findById: vi.fn().mockResolvedValue(course) } as unknown as CourseRepository;
}

describe('CourseFinder', () => {
  const courseId = new CourseId('3f0c9a52-6f7e-4d4b-9a51-0d2f1c3e8b7a');

  it('returns the course of the catalog', async () => {
    const course = Course.create(courseId, new CourseTitle('Domain-Driven Design'));
    await expect(new CourseFinder(coursesFinding(course)).find(courseId)).resolves.toBe(course);
  });

  it('a course that is not in the catalog cannot be found', async () => {
    await expect(new CourseFinder(coursesFinding(null)).find(courseId)).rejects.toBeInstanceOf(
      CourseNotFound,
    );
  });

  it('a course already in the catalog cannot be created again', async () => {
    const course = Course.create(courseId, new CourseTitle('Domain-Driven Design'));
    await expect(
      new CourseFinder(coursesFinding(course)).assertDoesNotExist(courseId),
    ).rejects.toBeInstanceOf(CourseAlreadyExists);
  });
});
```

## What not to do

- A specification that loads data through a repository, a generic one without a business name
  (`FieldEquals`), or one used instead of the aggregate to protect an invariant.
- A domain service injected into a use case or a reaction, or built in `composition.ts`
  (`new PlaceOrder(orders, new OrderPricing(catalog), bus)`): the use case receives the
  service's dependencies (`CourseRepository`, `CouponCatalog`) and instantiates the service
  inside `handle`.
- A domain service that instantiates its repository or an adapter (`new IndexedDbCourseRepository()`),
  imports `/infrastructure`, or types its dependency with an adapter instead of the abstract
  repository of the domain: it receives `CourseRepository` by constructor from the use case.
- A domain service for a rule that one aggregate or value object can hold, for a named yes/no
  criterion (a `Specification`), for coordination (load, save, publish, authorize), for a bare
  shared `findById`, or that only wraps a port call (the use case or reaction calls the port); or a
  `…Manager`, `…Helper`, `…Utils` class.
- A domain service that receives a repository or a port when the use case already holds the
  loaded aggregates: pass them as arguments.
- A domain service that throws `AggregateNotFoundException` (it lives in `/application`): it
  throws a business error of its context (`CourseNotFound extends DomainException`).
