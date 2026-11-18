# Where each class goes

Part of the `archi-code-ddd` skill: read it only when that skill routes here. It holds what every
change needs: layers, imports, folders, names, where each exception is thrown, how to use the code
of the guides and the mistakes of structure. The rules, code and mistakes of each kind of class are
in its own guide (`value-objects.md`, `aggregates.md`, `use-cases.md`…), listed in `SKILL.md`: read
only the ones of the classes you write.

## Layers and dependencies

| Class                                                                 | Layer                               | May depend on                                                                                                                                                                                                  | Never                                                                                                                                                                         |
| --------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Value object, composite                                               | domain                              | other value objects, `@archi-code/validation`, domain exceptions                                                                                                                                               | mutate, know about storage or transport                                                                                                                                       |
| Aggregate root (`extends AggregateRoot`)                              | domain                              | value objects, child entities, its events, its outcome enums, specifications; loaded data or the answer of a domain service as method argument | read a repository, publish, log, `new Date()`, a domain service in any way (received by constructor or as a method argument, instantiated, called or imported) |
| Child entity (`extends Entity`)                                       | domain                              | its local id, value objects                                                                                                                                                                                    | setters, events, being called from outside the root                                                                                                                           |
| Domain event (`OrderPaidDomainEvent`)                                 | domain                              | `EventBase` and nothing else: primitive fields typed inline | behavior, value objects, interfaces or data types of its own                                                                                                                  |
| Business error (`OrderNotCancellable`)                                | domain                              | `DomainException`                                                                                                                                                                                              | anything but a constructor                                                                                                                                                    |
| Specification (`FreeShippingEligible`) | domain | loaded aggregates and value objects, other specifications | a repository or any other dependency, guarding an invariant, a generic name (`FieldEquals`) |
| Domain service (`OrderPricing`) | domain                              | aggregates, value objects, the abstract repository of an aggregate (received by constructor); a domain service instantiates aggregates, calls their business methods and may persist them with the `save` of that repository | I/O code (a domain service reads and saves only through the abstract repository it received), transactions, publishing, `/application`, `/infrastructure`, a repository implementation (`IndexedDbCourseRepository`) or any adapter, as a type or instantiated; a domain service declared `abstract` or as an interface for infrastructure to implement (it is always a concrete class); a domain service executed by anything but a use case (never by an aggregate nor another domain service, which never instantiates one either); a "domain port": any `interface`, `abstract class` or `type` of the domain, outside `repository/`, that another layer implements (they do not exist) |
| Repository (`OrderRepository`, abstract)                              | domain                              | `AggregateRepository`, the roles of its verbs, the aggregate and its id, `Criteria`                                                                                                                            | an interface, code, verbs the business does not need, business queries                                                                                                        |
| User use case (`PlaceOrder`)                                          | application                         | domain, the aggregate's repository, application ports, domain services (instantiated inside `handle`), `EventBus`, `Logger` | instantiating, receiving or calling another use case or a listener, a domain service received by constructor, returning an aggregate                                          |
| Reaction use case (`MarkOrderPaidOnPaymentCaptured`)                  | application                         | the same as a user use case, and the event it listens to                                                                                                                                                       | authorization, `AggregateNotFoundException`, business errors, calling use cases                                                                                               |
| Copy of another context's event (`payment-captured-domain-event.ts`)  | application, next to its first reaction | `EventBase` and nothing else | importing the producer's class, a second copy in the same context                                                                                                             |
| Data type of the input (`MoneyData`, `AddressData`)                   | application, next to its use case   | other data types                                                                                                                                                                                               | living in `domain/`, being shared between contexts                                                                                                                            |
| Application port (`PetOwnerships`, `PaymentGateway`): every port | application, next to its first use case | data types, value objects | living in `domain/` (there are no domain ports), holding business rules |
| Read model (row, store and query ports, projection)                   | application (ports), infrastructure | data types, value objects                                                                                                                                                                                      | loading aggregates, repositories, business rules                                                                                                                              |
| Adapter (repository, store, port adapter, event channel)              | infrastructure                      | domain, application, `@archi-code/ddd/infrastructure`, `@archi-code/criteria-adapters/*`, drivers (IndexedDB only through `IndexedDbDatabase` and `IndexedDbSchema`); a repository extends the abstract one of its aggregate and is the only class that uses its database | business rules, extending or implementing a domain service, implementing anything of the domain except the abstract repository of an aggregate |
| Entry point (controller, consumer, scheduler, CLI)                    | interfaces                          | `/application`, its use cases and query ports, a protocol helper over `ExceptionClassifier`                                                                                                                    | business rules, repositories, catching errors one by one                                                                                                                      |
| Composition root (`composition.ts`, one per context)                  | context root                        | everything of its context and `@archi-code/ddd/*`                                                                                                                                                              | being imported by any layer, building a domain service                                                                                                                        |

- Import matrix: `domain` → `@archi-code/ddd/domain`, `@archi-code/validation`, its own `domain`,
  `shared-kernel`. `application` → adds `@archi-code/ddd/application` and its own
  `application`. `infrastructure` → `@archi-code/ddd/*`, `@archi-code/criteria-adapters/*`, its own
  `domain` and `application`. `interfaces` → `@archi-code/ddd/application`, its own `application`,
  the protocol helper (for HTTP, `platform/http/http.ts`) and, from
  `@archi-code/ddd/infrastructure`, only `ExceptionClassifier` and `ExceptionKind` (the helper
  and the controllers may import them; only the helper translates errors, a controller never
  catches nor maps them). `composition.ts` → anything of its context and `@archi-code/ddd/*`. The
  domain never imports `/application`.
- A context never imports another context. Only an explicit `shared-kernel/` (money) is shared;
  every other datum crosses contexts only as an event, and each context declares its own value
  objects even when another has a similar one (`Phone` in sales and in shipping).
- Imports are relative, point to the declaring file (never a folder nor an `index.ts`), use
  `import type` for types only, and split values and types of one module in two statements. A
  value from a file of the project goes in its own statement, also when the file declares several
  (`import { ShipmentStatus } from '../value-object/ShipmentStatusType';` and
  `import { ShipmentStatusType } from '../value-object/ShipmentStatusType';`); several names in
  one statement only for the package layers (`import { AggregateRoot, CreatedAt } from …`) and for
  types.
- Every file is formatted with the project's own formatter (its format script), never by hand: long
  generic parameters, decorator options and inline object types wrap as the formatter decides.
- Import from the layer, never from the package root (there is none): each exception comes from
  the subpath of its layer (`DomainException` from `/domain`, `AggregateNotFoundException` from
  `/application`, `InternalErrorException` from `/infrastructure`); there is no `/exceptions`.
  `imports.md` lists what each subpath exports.
- Check the direction with dependency-cruiser (`tsPreCompilationDeps: true`) and the suite's
  `ddd-skills/ddd-arquitectura/assets/dependency-cruiser.cjs`, which already allows the
  `@archi-code/ddd` layers above and forbids importing `composition.ts`.
- Logic two use cases share never goes in a use case: a business rule becomes a method of the
  aggregate or a domain service; a technical step becomes an application port. When an action must follow
  another, the first records an event and a reaction use case runs the second.

## Folder layout

`[Fuera de los libros: convención de @archi-code/ddd]`: inside each context the domain is split
into one folder per aggregate plus the reserved folder `shared/`, and each of those folders into
folders by kind of class (the books name modules after the ubiquitous language [IDDD ch. 9; PHP:
Modules]); the application is split by business action, which is the language.

`domain/` holds only aggregate folders (`domain/<aggregate>/`, kebab-case singular of the aggregate:
`order/`, `coupon/`) and one exception, `domain/shared/`: never a file nor a kind folder directly
under `domain/`. A domain file that one aggregate uses goes in `domain/<aggregate>/<kind>/` of that
aggregate. A domain file that more than one aggregate of the context uses goes in
`domain/shared/<kind>/`, with the same kind folders, and every aggregate imports it from there
(`../../shared/value-object/DiscountPercent` from `order/service/` and from `coupon/aggregate/`).

Three things never move to `shared/`, even when another aggregate uses them: the aggregate root,
its repository and its identity (`<Aggregate>Id`). They are imported from their aggregate
(`../../coupon/value-object/CouponId` and `../../coupon/repository/CouponRepository` from
`order/service/`). `shared` is a reserved name: no aggregate folder is called `shared`.
`domain/shared/` shares types between the aggregates of one context; `shared-kernel/` shares them
between contexts.

```
src/
  <app>.ts                                  the start file: opens one event channel and starts every context
  platform/<protocol>/<protocol>.ts         one helper per protocol the project speaks (error → status);
                                            for HTTP, platform/http/http.ts: HttpRequest, HttpResponse, Http
  contexts/
    shared-kernel/money/                    Money, Cents, CentsAmount, MoneyCurrency, CurrencyMismatch
    <context>/                              one folder per bounded context, named in its language
      domain/
        <aggregate>/                        one folder per aggregate (order/, coupon/)
          aggregate/       Order.ts, NewOrderLine.ts, outcome enums a method returns (CourseRetirement.ts)
          entity/          OrderLine.ts
          value-object/    OrderId.ts, Sku.ts, OrderStatusType.ts, ShippingAddress.ts
          event/           OrderCreatedDomainEvent.ts, OrderPaidDomainEvent.ts
          exception/       OrderNotCancellable.ts
          repository/      OrderRepository.ts (abstract: the only domain type infrastructure implements)
          service/         OrderPricing.ts (concrete classes only: never an interface nor an abstract class)
          specification/   FreeShippingEligible.ts
        shared/                             the only other folder under domain/: types more than one aggregate uses
          value-object/    DiscountPercent.ts, CouponCode.ts (same kind folders as an aggregate)
      application/
        place-order/                   place-order.ts, money-data.ts, address-data.ts
        mark-order-paid/               mark-order-paid-on-payment-captured.ts, payment-captured-domain-event.ts
        order-summaries/               order-summary.ts, order-summary-store.ts, order-summaries.ts,
                                       order-summary-projection.ts, mark-order-summary-paid/…-on-order-paid.ts
      infrastructure/
        persistence/     in-memory-order-repository.ts, in-memory-coupon-repository.ts (or mongo-…; IndexedDB:
                         indexeddb/shop.db.ts and indexeddb/orders/{order.schema,indexeddb-order-repository}.ts)
        read-model/      in-memory-order-summary-store.ts
        messaging/       rabbit-mq-event-channel.ts (when the channel is not in memory)
      interfaces/http/   orders-controller.ts
      composition.ts
test/                    specs mirroring src/ (or next to the code, where the project keeps its specs);
                         support/ holds fixtures, test doubles and repository contracts
docs/decisions/          decision records (NNNN-<title>.md) of the multi-aggregate use cases
                         (or the decision records folder the project already has)
```

The names inside the tree (orders, coupons, summaries) are an example: only the folders and the
shape of the file names are the standard. The contexts root is `src/contexts/`, or
`src/app/contexts/` in a project that keeps its code in `src/app/`; a project that already has a
contexts root keeps it. Everything from `<context>/` down is the same in every project.

## Names

| What                                     | Name                                                                                                                                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files in `domain/`, `shared-kernel/`     | PascalCase, the class name (`OrderNotModifiable.ts`)                                                                                                                                                       |
| Every other file                         | kebab-case of the main export (`confirm-transfer-received.ts`)                                                                                                                                             |
| Aggregate id                             | `<Aggregate>Id extends IdType<'<Aggregate>Id'>`                                                                                                                                                            |
| Reference to another context's aggregate | `<Other>Reference extends Required(UuidType)` (`OrderReference` in payments)                                                                                                                               |
| Enum value object                        | file `<Enum>Type.ts` with `enum <Enum>`, `<Enum>Option`, `<Enum>Type`; the one exception is money: `MoneyCurrency.ts` with `Currency`, `CurrencyOption`, `MoneyCurrency`                                   |
| Shape `create` receives                  | `New<Child>` (`NewOrderLine`), an interface of value objects                                                                                                                                               |
| Outcome a method returns                 | an enum named after the action (`CourseRetirement`) in `aggregate/`                                                                                                                                       |
| Domain event                             | `<Aggregate><PastAction>DomainEvent`, `eventName` `'<aggregate>.<past_action>'`                                                                                                                           |
| Business error                           | what went wrong, no `Exception` suffix (`OrderNotCancellable`), code `<CTX><NNN>`                                                                                                                          |
| User use case                            | the business action (`PlaceOrder`, `ConfirmTransferReceived`), never CRUD nor technical                                                                                                                    |
| Reaction use case                        | `<Action>On<Event>` (`MarkOrderPaidOnPaymentCaptured`), file `<action>-on-<event>.ts`                                                                                                                      |
| Consumer name                            | `'<context>.<action>-on-<event>'`: the context and the file name without `.ts`                                                                                                                             |
| Copy of a foreign event                  | the producer's class name, file `<event>-domain-event.ts` (`payment-captured-domain-event.ts`)                                                                                                             |
| Repository (domain)                      | `<Aggregate>Repository`, abstract, in `domain/<aggregate>/repository/` (`OrderRepository`)                                                                                                                             |
| Repository adapter                       | `<Technology><Aggregate>Repository extends <Aggregate>Repository` (`InMemoryOrderRepository`, `MongoOrderRepository`, `IndexedDbOrderRepository` over the table of its `IndexedDbDatabase`), one per aggregate and technology |
| Domain service                           | the business operation (`OrderPricing`, `CourseRegistration`), never `…Manager`, `…Helper`, `…Utils`                                                                                                             |
| Port adapter                             | `<Technology><Port>` (`InMemoryProductPricing`)                                                                                                                                                             |
| Read model                               | folder `<rows>/` (`order-summaries/`): `<Row>`, `<Row>Store`, `<Rows>` (query port), `<Row>Projection`                                                                                                     |
| Controller                               | `<Aggregates>Controller` (`OrdersController`), with `<Aggregates>UseCases` when it takes many                                                                                                              |
| Composition root                         | `<Context>Context` with `<Context>Settings`                                                                                                                                                                |
| Business error code                      | one prefix of three letters per context, taken from its name (`SAL` for sales; `MNY` for money), and the next free number                                                                                                                     |
| Log message                              | stable snake_case (`order_cancelled_for_rejected_payment`)                                                                                                                                                 |

## Using the code of the guides

Each code block of a guide is a file of a context (`src/contexts/<context>/…`, see the folder
layout above); replace the names and keep the shape. The blocks show the imports from the package;
the imports of project files are left out: write each one relative, to the declaring file, one
statement per value and `import type` for types. Format with the project's formatter.

## Where to throw each exception

- Domain (aggregates, VOs, domain services): a business error (`DomainException` subclass with its
  code); `ValidationException`, `TypePrimitiveException` and `RequiredValueException` come from
  the value objects (throw the last two yourself only inside the `filter` of a custom type).
- User use cases: `AggregateNotFoundException` when `findById` returns `null`,
  `NotAllowedException` for authorization, `ApplicationException` for other application errors.
  Reaction use cases throw none of them: they return.
- Adapters: only errors of the adapter, never a business error of the domain:
  `InternalErrorException` (or another `InfrastructureException`), always with
  `{ cause: error }` when wrapping another error, and `ConcurrencyException` from a repository
  that finds a version conflict. `ConcurrencyException` is an infrastructure error (the package
  exports it from `/application`, and a repository imports it from there): it says that another
  component already updated the aggregate, so the caller loads it again and retries the
  change.
- For logs or messages use `error.code` and the code enum of each layer (`DomainExceptionCode`,
  `ApplicationExceptionCode`, `InfrastructureExceptionCode`), or `instanceof`: the built-in
  exceptions are recognized across the CJS and ESM builds.

## What not to do

- Putting a class in the wrong layer: a repository implementation, a mapper or a driver in the
  domain; an event bus implementation in the domain; a use case importing `/infrastructure`;
  business rules in an adapter or a controller.
- Importing another context (its value objects, events, data types or use cases): only
  `shared-kernel/` is shared; data crosses contexts only as events, and each context declares its
  own value objects and its own copy of every foreign event it hears.
- Importing `@archi-code/ddd/infrastructure` or `/application` from domain code, or
  `ExceptionClassifier` anywhere but the entry points (the protocol helper and the controllers).
- Importing through a folder or an `index.ts`, or mixing values and types of one module in one
  `import` statement: import each symbol from its declaring file and use `import type` for types.
- Importing an exception from a subpath that does not export it: each layer exports its own
  (`ValidationException` from `/domain`, `AggregateNotFoundException` from `/application`,
  `InternalErrorException` from `/infrastructure`); there is no `/exceptions` subpath and the
  common base class is not exported.
- Importing the repository contracts from `@archi-code/ddd/application`: they live in `/domain`.
- A kind folder or a file directly under `domain/` (`domain/repository/OrderRepository.ts`):
  `domain/` holds only aggregate folders and `shared/`, and the file goes in
  `domain/<aggregate>/<kind>/` (`domain/order/repository/OrderRepository.ts`).
- A type of one aggregate imported by another aggregate (`order/` importing
  `../../coupon/value-object/DiscountPercent`): a type more than one aggregate uses goes in
  `domain/shared/<kind>/`. Only the root, the repository and the identity of an aggregate are
  imported from its folder.
- A type in `domain/shared/` that a single aggregate uses, or a second shared folder with another
  name (`common/`, `core/`, `models/`): it goes in its aggregate, and `shared/` is the only exception.
- Application folders named after patterns (`use-cases/`, `listeners/`, `commands/`, `dtos/`):
  one folder per business action, holding its use case, its data types and its event copies.
- Data types of the input (`MoneyData`) in `domain/`, or shared between contexts.
- A controller, consumer or CLI importing a repository or an adapter: entry points only call use
  cases and query ports; the composition root wires everything.
- Building repositories, adapters, use cases, reactions or controllers anywhere but
  `composition.ts`, or importing `composition.ts` from a layer. A domain service is the
  exception: it is built by the use case inside `handle`, never in `composition.ts`.
- Inventing API: there is no root `@archi-code/ddd` import, no `toPrimitives()` in the base
  classes, no generic `ValueObject` (a value object of several fields is `Composite({...})`), no
  `setNow()`, `addItem()`, `setItem()` or `removeItem()`, no `findOrFail` nor `saveAndPublish` in
  `UseCase`. When in doubt, read the installed README.
- Writing the package's base classes in the project (`domain/order/aggregate/AggregateRoot.ts`,
  `DomainEvent.ts`, `ValueObject.ts`, an `EventPublisher` port): they come from the package.
- Formatting by hand instead of running the project's formatter, or adding a second formatter,
  linter or test runner next to the one the project has.
- A spec where the project's test runner does not collect it, or a fixture, test double or
  repository contract inside a layer folder of a context instead of `test/support/`.
