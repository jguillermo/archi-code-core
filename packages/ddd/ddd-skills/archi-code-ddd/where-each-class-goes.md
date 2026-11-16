# Where each class goes

Part of the `archi-code-ddd` skill: read it only when that skill routes here.

## Layers and dependencies

| Class                                                      | Layer                               | May depend on                                                                    | Never                                                                     |
| ---------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Value object, composite                                    | domain                              | VOs, `@archi-code/validation`, domain exceptions                                 | mutate, storage, transport                                                |
| Aggregate root                                             | domain                              | VOs, child entities, its events, specifications; loaded data as argument         | repository, publish, log, `new Date()`, services by constructor           |
| Child entity                                               | domain                              | its local id, VOs                                                                | setters, events, callers outside the root                                 |
| Domain event                                               | domain                              | nothing (inline primitive fields)                                                | behavior, VOs, own types                                                  |
| Business error                                             | domain                              | `DomainException`                                                                | anything but a constructor                                                |
| Specification, domain service, domain port                 | domain                              | aggregates, VOs; services only: domain ports, the abstract repository (by ctor)  | I/O, transactions, publishing, `/application`, `/infrastructure`, adapters |
| Repository (abstract)                                      | domain                              | `AggregateRepository`, its roles, the aggregate and id                           | interface, code, unneeded verbs, business queries                         |
| User use case                                              | application                         | domain, its repository, `EventBus`, `Logger`; domain services built in `handle`  | other use cases or listeners, injected services, returning an aggregate   |
| Reaction use case                                          | application                         | same as user use case, plus its event                                            | authorization, `AggregateNotFoundException`, business errors, use cases   |
| Copy of a foreign event                                    | application, next to its reaction   | nothing                                                                          | importing the producer's class                                            |
| Input data type (`MoneyData`)                              | application, next to its use case   | other data types                                                                 | `domain/`, sharing between contexts                                       |
| Read model (row, ports, projection)                        | application (ports), infrastructure | data types, VOs                                                                  | aggregates, repositories, business rules                                  |
| Adapter (repository, store, port adapter, channel)         | infrastructure                      | domain, application, `@archi-code/ddd/infrastructure`, drivers (IndexedDB only via `IndexedDbTable`) | business rules; database code in any other class                          |
| Entry point (controller, consumer, scheduler, CLI)         | interfaces                          | `/application`, use cases, query ports, protocol helper                          | rules, repositories, catching errors                                      |
| Composition root (`composition.ts`)                        | context root                        | everything of its context, `@archi-code/ddd/*`                                   | being imported by a layer                                                 |

- Import matrix: `domain` → `/domain`, `@archi-code/validation`, own `domain`, `shared-kernel`.
  `application` → adds `/application`, own `application`. `infrastructure` → `@archi-code/ddd/*`,
  own `domain` and `application`. `interfaces` → `/application`, own `application`, the protocol
  helper (only file importing `ExceptionClassifier`). `composition.ts` → anything of its context.
- A context never imports another; only `shared-kernel/` (money) is shared; data crosses only as
  events; each context declares its own VOs even when another has a similar one (`Phone`).
- Imports: relative, to the declaring file, `import type` for types, values and types in separate
  statements; one statement per project-file value (several names only for package layers and
  types). Each exception from its layer subpath; no package root nor `/exceptions`.
- Format with the project's Prettier (`npm run fix:format`), never by hand.
- Check the direction with dependency-cruiser (`tsPreCompilationDeps: true`) and
  `ddd-skills/ddd-arquitectura/assets/dependency-cruiser.cjs` (allows the `@archi-code/ddd` layers,
  forbids importing `composition.ts`).
- Logic two use cases share never goes in a use case: a rule → aggregate method or domain service;
  a technical step → a port; an action that must follow another → an event and a reaction.

## Folder layout

`[Fuera de los libros: convención de @archi-code/ddd]`: domain split by kind, application by
business action (the books name modules after the ubiquitous language [IDDD ch. 9; PHP: Modules]).

```
src/
  shop.ts                     opens one channel, starts every context
  platform/http/http.ts       protocol helper (error → status)
  contexts/
    shared-kernel/money/
    <context>/
      domain/
        aggregate/ (+ New<Child>) entity/ value-object/ event/ exception/
        repository/ (abstract) service/ (services, ports) specification/
      application/
        place-order/          place-order.ts, money-data.ts
        mark-order-paid/      mark-order-paid-on-payment-captured.ts, payment-captured-domain-event.ts
        order-summaries/      row, store, query port, projection, one folder per reaction
      infrastructure/
        persistence/          in-memory-order-repository.ts, indexeddb-order-repository.ts
        coupon/ read-model/
      interfaces/http/        orders-controller.ts
      composition.ts
```

## Names

| What                                 | Name                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| Files in `domain/`, `shared-kernel/` | PascalCase class name                                                                 |
| Every other file                     | kebab-case of the main export                                                         |
| Aggregate id                         | `<Aggregate>Id extends IdType<'<Aggregate>Id'>`                                       |
| Foreign reference                    | `<Other>Reference extends Required(UuidType)`                                         |
| Enum                                 | `<Enum>Type.ts`: `<Enum>`, `<Enum>Option`, `<Enum>Type` (money: `MoneyCurrency.ts`)   |
| `create` input shape                 | `New<Child>` (interface of VOs)                                                       |
| Domain event                         | `<Aggregate><PastAction>DomainEvent`, `'<aggregate>.<past_action>'`                   |
| Business error                       | what went wrong, no `Exception` suffix, code `<CTX><NNN>`                             |
| User use case                        | the business action (`PlaceOrder`), never CRUD nor technical                          |
| Reaction use case                    | `<Action>On<Event>`, file `<action>-on-<event>.ts`                                    |
| Consumer                             | `'<context>.<action>-on-<event>'`                                                     |
| Repository (domain)                  | `<Aggregate>Repository`, abstract                                                     |
| Repository adapter                   | `<Technology><Aggregate>Repository extends <Aggregate>Repository`, one per technology |
| Port adapter                         | `<Technology><Port>`                                                                  |
| Domain service                       | the business operation (`CourseFinder`), never `…Manager`/`…Helper`/`…Utils`          |
| Controller                           | `<Aggregates>Controller`                                                              |
| Composition root                     | `<Context>Context` with `<Context>Settings`                                           |
| Log message                          | stable snake_case                                                                     |
