# Where each class goes

Part of the `archi-code-ddd` skill: read it only when that skill routes here.

## Layers and dependencies

| Class                                                                 | Layer                             | May depend on                                                                                   | Never                                                                          |
| --------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Value object, composite                                               | domain                            | other value objects, `@archi-code/validation`, domain exceptions                                | mutate, know about storage or transport                                        |
| Aggregate root (`extends AggregateRoot`)                              | domain                            | value objects, child entities, its events, specifications; loaded data as method argument       | read a repository, publish, log, `new Date()`, services received by constructor |
| Child entity (`extends Entity`)                                       | domain                            | its local id, value objects                                                                     | setters, events, a clock, being called from outside the root                   |
| Domain event (`OrderPaidDomainEvent`)                                 | domain                            | nothing: primitive fields typed inline                                                          | behavior, value objects, interfaces or data types of its own                   |
| Business error (`OrderNotCancellable`)                                | domain                            | `DomainException`                                                                               | anything but a constructor                                                     |
| Specification, domain service, domain port                            | domain                            | aggregates, value objects, domain ports                                                         | I/O code, transactions, publishing                                             |
| Repository (`OrderRepository`, abstract)                              | domain                            | `AggregateRepository`, the roles of its verbs, the aggregate and its id                         | an interface, code, verbs the business does not need, business queries         |
| User use case (`PlaceOrder`)                                          | application                       | domain, the aggregate's repository, domain services, `EventBus`, `Clock`, `Logger`              | importing another use case or a listener, returning an aggregate               |
| Reaction use case (`MarkOrderPaidOnPaymentCaptured`)                  | application                       | the same as a user use case, and the event it listens to                                        | authorization, `AggregateNotFoundException`, business errors, calling use cases |
| Copy of another context's event (`payment-captured-domain-event.ts`)  | application, next to its reaction | nothing                                                                                         | importing the producer's class                                                 |
| Data type of the input (`MoneyData`, `AddressData`)                   | application, next to its use case | other data types                                                                                | living in `domain/`, being shared between contexts                             |
| Read model (row, store and query ports, projection)                   | application (ports), infrastructure | data types, value objects                                                                     | loading aggregates, repositories, business rules                               |
| Adapter (repository, store, port adapter, event channel)              | infrastructure                    | domain, application, `@archi-code/ddd/infrastructure`, drivers; a repository extends the abstract one of its aggregate | business rules                                                                 |
| Entry point (controller, consumer, scheduler, CLI)                    | interfaces                        | `/application`, its use cases and query ports, a protocol helper over `ExceptionClassifier`     | business rules, repositories, catching errors one by one                       |
| Composition root (`composition.ts`, one per context)                  | context root                      | everything of its context and `@archi-code/ddd/*`                                               | being imported by any layer                                                    |

- Import matrix: `domain` → `@archi-code/ddd/domain`, `@archi-code/validation`, its own `domain`,
  `shared-kernel`. `application` → adds `@archi-code/ddd/application` and its own
  `application`. `infrastructure` → `@archi-code/ddd/*`, its own `domain` and `application`.
  `interfaces` → `@archi-code/ddd/application`, its own `application`, the protocol helper (for
  HTTP, `platform/http/http.ts`, the only file that imports `ExceptionClassifier`).
  `composition.ts` → anything of its context and `@archi-code/ddd/*`. The domain never imports
  `/application`, so an aggregate declares its own `interface Clock { now(): Date }`.
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
- Every file is formatted with the project's Prettier (`npm run fix:format`), never by hand: long
  generic parameters, decorator options and inline object types wrap as Prettier decides.
- Import from the layer, never from the package root (there is none): each exception comes from
  the subpath of its layer (`DomainException` from `/domain`, `AggregateNotFoundException` from
  `/application`, `InternalErrorException` from `/infrastructure`); there is no `/exceptions`.
- Check the direction with dependency-cruiser (`tsPreCompilationDeps: true`) and the suite's
  `ddd-skills/ddd-arquitectura/assets/dependency-cruiser.cjs`, which already allows the
  `@archi-code/ddd` layers above and forbids importing `composition.ts`.

## Folder layout

`[Fuera de los libros: convención de @archi-code/ddd]`: inside each context the domain is split
into folders by kind of class (the books name modules after the ubiquitous language [IDDD ch. 9;
PHP: Modules]); the application is split by business action, which is the language.

```
src/
  shop.ts                                   opens one event channel and starts every context
  platform/http/http.ts                     HttpRequest, HttpResponse, Http (error → status)
  contexts/
    shared-kernel/money/                    Money, Cents, CentsAmount, MoneyCurrency, CurrencyMismatch
    <context>/                              sales | payments | shipping
      domain/
        aggregate/       Order.ts, NewOrderLine.ts
        entity/          OrderLine.ts
        value-object/    OrderId.ts, Sku.ts, OrderStatusType.ts, ShippingAddress.ts
        event/           OrderCreatedDomainEvent.ts, OrderPaidDomainEvent.ts
        exception/       OrderNotCancellable.ts
        repository/      OrderRepository.ts (abstract)
        service/         OrderPricing.ts, CouponCatalog.ts (port)
        specification/   FreeShippingEligible.ts
      application/
        place-order/                   place-order.ts, money-data.ts, address-data.ts
        mark-order-paid/               mark-order-paid-on-payment-captured.ts, payment-captured-domain-event.ts
        order-summaries/               order-summary.ts, order-summary-store.ts, order-summaries.ts,
                                       order-summary-projection.ts, mark-order-summary-paid/…-on-order-paid.ts
      infrastructure/
        persistence/     in-memory-order-repository.ts
        coupon/          in-memory-coupon-catalog.ts
        read-model/      in-memory-order-summary-store.ts
      interfaces/http/   orders-controller.ts
      composition.ts
```

## Names

| What                         | Name                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| Files in `domain/`, `shared-kernel/` | PascalCase, the class name (`OrderNotModifiable.ts`)                               |
| Every other file             | kebab-case of the main export (`confirm-transfer-received.ts`)                             |
| Aggregate id                 | `<Aggregate>Id extends IdType<'<Aggregate>Id'>`                                            |
| Reference to another context's aggregate | `<Other>Reference extends Required(UuidType)` (`OrderReference` in payments)   |
| Enum value object            | file `<Enum>Type.ts` with `enum <Enum>`, `<Enum>Option`, `<Enum>Type`; the one exception is money: `MoneyCurrency.ts` with `Currency`, `CurrencyOption`, `MoneyCurrency` |
| Shape `create` receives      | `New<Child>` (`NewOrderLine`), an interface of value objects                               |
| Domain event                 | `<Aggregate><PastAction>DomainEvent`, `eventName` `'<aggregate>.<past_action>'`           |
| Business error               | what went wrong, no `Exception` suffix (`OrderNotCancellable`), code `<CTX><NNN>`          |
| User use case                | the business action (`PlaceOrder`, `ConfirmTransferReceived`), never CRUD nor technical    |
| Reaction use case            | `<Action>On<Event>` (`MarkOrderPaidOnPaymentCaptured`), file `<action>-on-<event>.ts`      |
| Consumer name                | `'<context>.<action>-on-<event>'`: the context and the file name without `.ts`             |
| Repository (domain)          | `<Aggregate>Repository`, abstract, in `domain/repository/` (`OrderRepository`)             |
| Repository adapter           | `<Technology><Aggregate>Repository extends <Aggregate>Repository` (`InMemoryOrderRepository`, `MongoOrderRepository`) |
| Port adapter                 | `<Technology><Port>` (`InMemoryCouponCatalog`)                                             |
| Controller                   | `<Aggregates>Controller` (`OrdersController`)                                              |
| Composition root             | `<Context>Context` with `<Context>Settings`                                                |
| Log message                  | stable snake_case (`order_cancelled_for_rejected_payment`)                                 |

- Logic two use cases share never goes in a use case: a business rule becomes a method of the
  aggregate or a domain service; a technical step becomes a port. When an action must follow
  another, the first records an event and a reaction use case runs the second.
