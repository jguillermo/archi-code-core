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
    `ImportCourse` both register a course: `CourseRegistration`); never one use case calling
    another;
  - or a business rule that one use case needs does not fit in one aggregate nor value object,
    because it needs several aggregates or a domain port (`OrderPricing` with `CouponCatalog`,
    used only by `PlaceOrder`). A use case holds no business rule, so the rule never stays in
    its `handle`.

  Anything else is not a domain service: a rule of one aggregate is a method of the aggregate
  (also a rule between who asks and the aggregate's state: `order.cancel(requester)` throws
  when the requester is not its customer), a calculation over values is a method of the value
  object, a named yes/no criterion is a `Specification`, authorizing, publishing and loading
  or saving with no business rule around it is the use case, and a port call with no rule around
  it is not a service either: the use case or reaction calls the port directly. A bare shared
  `findById` is not a service, and neither is a lookup that only turns `null` into a not-found
  error (a `CourseFinder.find(id)` that throws `CourseNotFound`): each use case keeps its own
  lookup with `AggregateNotFoundException`. A lookup belongs to a domain service only as a step
  of a business rule the service holds (`CourseRegistration` checks the course does not exist
  before creating it).
- **Always a concrete class, never implemented in infrastructure** (user rule, strict, no
  exceptions). A domain service is a non-abstract class of the domain that holds business logic
  and runs it itself. It is never an `abstract class`, never an `interface` nor a `type`, and it
  never has abstract methods: nothing in `infrastructure` extends or implements a domain service,
  and no domain service is declared so that an adapter completes it. What infrastructure
  implements is a **domain port** (form 3 below), which is not a domain service: the port is an
  interface with no business rule, and the rule around it stays in the concrete domain service
  that receives it. When the logic needs technology, split it: the technical step is a port, the
  business rule is the service.
- **How.** A plain class (no base class, no state) named after the business operation
  (`OrderPricing`, `CourseRegistration`; never `…Manager`, `…Helper`, `…Utils`); it works with
  value objects and aggregates, throws business errors of its context (never
  `AggregateNotFoundException`, which is `/application`) and never removes, opens
  transactions, publishes, logs nor checks authorization [IDDD ch. 7]. It may persist an
  aggregate with the `save` of the abstract repository it received (rule "A domain service may
  persist an aggregate" below; `[Fuera de los libros: convención de @archi-code/ddd]`, IDDD
  ch. 7 leaves saving to the application service). Three forms, in this order of preference:
  1. **Loaded aggregates as arguments, no dependencies**: the use case already holds what the
     rule needs and passes it to the method
     (`new ShippingCostCalculator().costFor(order, zone)`).
  2. **The abstract repository of an aggregate** by constructor, to read with `findById` and
     to persist with `save` (`constructor(private readonly courses: CourseRepository) {}`): never
     the repository implementation (`IndexedDbCourseRepository`), as a type nor instantiated.
  3. **A domain port** by constructor (`constructor(private readonly catalog: CouponCatalog) {}`):
     an interface in `service/<Port>.ts` whose methods speak value objects
     (`discountOf(code: CouponCode): Promise<DiscountPercent | null>`), implemented in
     infrastructure by its own adapter (never by a repository nor a read-model store).
- **Only use cases execute domain services** (user rule, strict, no exceptions). A domain service
  is executed only from the `handle` of a use case (user or reaction). The use case declares in
  its own constructor the repository the domain service needs (typed with the abstract repository
  of the domain, or the domain port), and hands it to the service when it builds it. Nothing else
  executes a domain service: not an aggregate, a child entity, a value object nor a
  specification, not another domain service, not a controller, an adapter, a projection nor
  `composition.ts`.
- **A domain service never instantiates, receives nor calls another domain service** (user rule,
  strict, no exceptions): no `new OtherService(…)` inside a service and no service in its
  constructor or method arguments. When a use case needs two services, it builds and executes
  both in `handle` and passes the answer of one to the other as value objects or aggregates.
- **An aggregate never calls nor uses a domain service** (user rule, strict, no exceptions): it
  never receives one by constructor nor as a method argument, never instantiates one and never
  imports one. The direction is the opposite one: the use case executes the domain service, and
  the aggregate receives only value objects and loaded data, such as the answer of the service
  (`Order.create(…, discount)`).
- **A domain service instantiates and modifies aggregates** (user rule). Through the service the
  use case validates (the service throws a business error and nothing is saved:
  `CourseAlreadyExists`) or changes the model: the service may create an aggregate
  (`Aggregate.create(…)`) and call the business methods of the aggregates it loaded or was
  given, and it returns them to the use case.
- **A domain service may persist an aggregate** (user rule). The service that received the
  abstract repository of an aggregate by constructor may call its `save` after applying the
  business rule (`await this.courses.save(course)`). It can because the repository instance comes
  from the use case: the use case holds it in its own constructor, instantiates the service with
  it and executes the service, so the adapter is still built only in `composition.ts` and the
  service still depends only on the abstract repository of the domain. The aggregate is saved
  once per use case, by the service or by the use case, never by both; the service returns the
  aggregate it saved and the use case publishes `pullDomainEvents()` after it. The service never
  publishes, opens transactions nor removes. Code below, in "Logic two use cases
  share".
- **Instantiated inside the use case, never injected** (user rule): the domain never instantiates
  a repository nor an adapter and never imports `/infrastructure`; the concrete adapter
  (`IndexedDbCourseRepository`, `InMemoryCouponCatalog`) is built only in `composition.ts` and
  injected into the use case. The use case (user or reaction) receives those dependencies in its
  own constructor, typed with the abstract repository or the port, and builds the service inside
  `handle`, passing them
  (`await new CourseRegistration(this.courses).register(command.courseId, command.title)`,
  `await new OrderPricing(this.coupons).discountFor(command.couponCodes)`). No constructor of a
  use case or a reaction receives a domain service and `composition.ts` never builds one. A
  reaction keeps its own rules: it calls only methods whose business errors it does not let out.
- **Testing**: a unit spec with real domain objects; its dependencies (the abstract repository, a
  port) are stubs with `vi.fn()` (`findById` resolving the aggregate or `null`, `save`
  resolving). Code below, in "Logic two use cases share".

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

`CreateCourse` and `ImportCourse` both register a course: check that it does not exist yet, create
it and save it. Neither uses the other (no `new CreateCourse(...)`, no use case in a constructor,
no `execute` of another use case): the whole registration is the shared business logic, so it
moves to one domain service that each use case instantiates. The service receives the abstract
repository by constructor, reads with `findById` and persists with `save`, and returns the
aggregate it saved so the use case can publish its events.

A lookup alone is not this case: `PublishCourse` keeps its own `findById` and throws
`AggregateNotFoundException('Course', id.value)` when it is `null`; it does not share a
`CourseFinder` with other use cases.

`domain/exception/CourseAlreadyExists.ts`:

```ts
import { DomainException } from '@archi-code/ddd/domain';

export class CourseAlreadyExists extends DomainException {
  constructor(courseId: string) {
    super(`Course ${courseId} already exists`, ['CRS002']);
  }
}
```

`domain/service/CourseRegistration.ts`: its dependency, the abstract repository, goes in its
constructor:

```ts
export class CourseRegistration {
  constructor(private readonly courses: CourseRepository) {}

  async register(id: CourseId, title: CourseTitle): Promise<Course> {
    if ((await this.courses.findById(id)) !== null) {
      throw new CourseAlreadyExists(id.value);
    }
    const course = Course.create(id, title);
    await this.courses.save(course);
    return course;
  }
}
```

Each use case holds the repository in its own constructor, instantiates the service with it
inside `handle` and executes it. It does not save again: it only publishes what the saved
aggregate recorded.

```ts
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
    });
  }

  protected async handle(command: CreateCourseCommand): Promise<string> {
    if (command.actorRole.value !== ActorRole.EDITOR) {
      throw new NotAllowedException(`The role ${command.actorRole.value} may not create courses`);
    }
    const course = await new CourseRegistration(this.courses).register(
      command.courseId,
      command.title,
    );
    await this.events.publish(course.pullDomainEvents());
    return course.id.value;
  }
}

export class ImportCourse extends UseCase<ImportCourseInput, ImportCourseCommand, string> {
  constructor(
    private readonly courses: CourseRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  protected toCommand(input: ImportCourseInput): ImportCourseCommand {
    return ValueObjectBuilder.build({
      courseId: () => new CourseId(input.courseId),
      title: () => new CourseTitle(input.title),
    });
  }

  protected async handle(command: ImportCourseCommand): Promise<string> {
    const course = await new CourseRegistration(this.courses).register(
      command.courseId,
      command.title,
    );
    await this.events.publish(course.pullDomainEvents());
    return course.id.value;
  }
}
```

`composition.ts` builds `new CreateCourse(courses, bus)` and `new ImportCourse(courses, bus)`: it
never builds `CourseRegistration`, and no use case receives another one. `CourseAlreadyExists` is
a business error (`ExceptionKind.Invalid`, 422). The service never publishes, opens a transaction
nor calls `remove`.

The domain service has its own unit spec: real domain objects, and its dependency, the abstract
repository, stubbed with `vi.fn()`. It checks what was saved and that a refusal saves nothing:

```ts
import { describe, expect, it, vi } from 'vitest';

function coursesFinding(course: Course | null): CourseRepository {
  return {
    findById: vi.fn().mockResolvedValue(course),
    save: vi.fn().mockResolvedValue(undefined),
  } as unknown as CourseRepository;
}

describe('CourseRegistration', () => {
  const courseId = new CourseId('3f0c9a52-6f7e-4d4b-9a51-0d2f1c3e8b7a');
  const title = new CourseTitle('Domain-Driven Design');

  it('registers a course that is not in the catalog and saves it once', async () => {
    const courses = coursesFinding(null);
    const course = await new CourseRegistration(courses).register(courseId, title);
    expect(courses.save).toHaveBeenCalledTimes(1);
    expect(courses.save).toHaveBeenCalledWith(course);
  });

  it('a course already in the catalog is not registered again nor saved', async () => {
    const courses = coursesFinding(Course.create(courseId, title));
    await expect(new CourseRegistration(courses).register(courseId, title)).rejects.toBeInstanceOf(
      CourseAlreadyExists,
    );
    expect(courses.save).not.toHaveBeenCalled();
  });
});
```

## What not to do

- A specification that loads data through a repository, a generic one without a business name
  (`FieldEquals`), or one used instead of the aggregate to protect an invariant.
- A domain service declared as an `abstract class` or an `interface`, or with abstract methods, so
  that infrastructure implements it (`abstract class OrderPricing` in the domain and
  `class HttpOrderPricing extends OrderPricing` in infrastructure): a domain service is always a
  concrete class with its business logic inside; only a domain port is implemented in
  infrastructure.
- A class in `infrastructure` that extends or implements a domain service, or that is named or
  used as one.
- A domain service executed from anywhere but the `handle` of a use case or a reaction (another
  domain service, a controller, `composition.ts`, an adapter, a projection), or a use case that
  builds one without holding in its own constructor the repository or port the service needs.
- A domain service that instantiates, receives or calls another domain service
  (`new CourseRegistration(this.courses)` inside `OrderPricing`): the use case executes each one and
  passes the answer along.
- An aggregate, a child entity, a value object or a specification that calls, instantiates,
  imports or receives a domain service, by constructor or as a method argument
  (`order.applyDiscount(pricing)`): the use case executes the service and passes its answer
  (`order.applyDiscount(discount)`).
- A domain service injected into a use case or a reaction, or built in `composition.ts`
  (`new PlaceOrder(orders, new OrderPricing(catalog), bus)`): the use case receives the
  service's dependencies (`CourseRepository`, `CouponCatalog`) and instantiates the service
  inside `handle`.
- A domain service that instantiates its repository or an adapter (`new IndexedDbCourseRepository()`),
  imports `/infrastructure`, or types its dependency with an adapter instead of the abstract
  repository of the domain: it receives `CourseRepository` by constructor from the use case.
- An aggregate saved twice in one use case, by the domain service and again by the use case; or a
  domain service that publishes events, opens a transaction or calls `remove`.
- A domain service for a rule that one aggregate or value object can hold, for a named yes/no
  criterion (a `Specification`), for coordination with no business rule (load, save, publish,
  authorize), for a bare shared `findById` or a lookup that only throws a not-found error
  (`CourseFinder`), or that only wraps a port call (the use case or reaction calls the port); or
  a `…Manager`, `…Helper`, `…Utils` class.
- A domain service that receives a repository or a port when the use case already holds the
  loaded aggregates: pass them as arguments.
- A domain service that throws `AggregateNotFoundException` (it lives in `/application`): it
  throws a business error of its context (`CourseNotFound extends DomainException`).
