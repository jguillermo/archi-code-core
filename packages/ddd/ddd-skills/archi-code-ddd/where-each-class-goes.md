# Where each class goes

Part of the `archi-code-ddd` skill: read it only when that skill routes here.

## Layers and dependencies

What each class must never do is in `layers.md`.

| Class                                              | Layer                               | May depend on                                                                                        |
| -------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Value object, composite                            | domain                              | VOs, `@archi-code/validation`, domain exceptions                                                     |
| Aggregate root                                     | domain                              | VOs, child entities, its events, specifications; loaded data as argument                             |
| Child entity                                       | domain                              | its local id, VOs                                                                                    |
| Domain event                                       | domain                              | nothing (inline primitive fields)                                                                    |
| Business error                                     | domain                              | `DomainException`                                                                                    |
| Specification, domain service, domain port         | domain                              | aggregates, VOs; services only: domain ports, the abstract repository (by ctor)                      |
| Repository (abstract)                              | domain                              | `AggregateRepository`, its roles, the aggregate and id                                               |
| User use case                                      | application                         | domain, its repository, `EventBus`, `Logger`; domain services built in `handle`                      |
| Reaction use case                                  | application                         | same as user use case, plus its event                                                                |
| Copy of a foreign event                            | application, next to its reaction   | nothing                                                                                              |
| Input data type (`MoneyData`)                      | application, next to its use case   | other data types                                                                                     |
| Read model (row, ports, projection)                | application (ports), infrastructure | data types, VOs                                                                                      |
| Adapter (repository, store, port adapter, channel) | infrastructure                      | domain, application, `@archi-code/ddd/infrastructure`, drivers (IndexedDB only via `IndexedDbTable`) |
| Entry point (controller, consumer, scheduler, CLI) | interfaces                          | `/application`, use cases, query ports, protocol helper                                              |
| Composition root (`composition.ts`)                | context root                        | everything of its context, `@archi-code/ddd/*`                                                       |

- Import matrix: `domain` → `/domain`, `@archi-code/validation`, own `domain`, `shared-kernel`.
  `application` → adds `/application`, own `application`. `infrastructure` → `@archi-code/ddd/*`,
  `@archi-code/criteria-adapters/*`, own `domain` and `application`. `interfaces` → `/application`, own `application`, the protocol
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
        aggregate/ (+ New<Child>, outcome enums an aggregate method returns: `CourseRetirement.ts`) entity/ value-object/ event/ exception/
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

Class names (ids, enums, events, errors, use cases, repositories, services) are in `layers.md`.

| What                                 | Name                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| Files in `domain/`, `shared-kernel/` | PascalCase class name                                                                 |
| Every other file                     | kebab-case of the main export                                                         |
| `create` input shape                 | `New<Child>` (interface of VOs)                                                       |
| Port adapter                         | `<Technology><Port>`                                                                  |
| Controller                           | `<Aggregates>Controller`                                                              |
| Composition root                     | `<Context>Context` with `<Context>Settings`                                           |
