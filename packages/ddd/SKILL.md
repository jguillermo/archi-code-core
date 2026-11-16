---
name: archi-code-ddd
description: The single entry point for Domain-Driven Design with @archi-code/ddd. It generates, reviews and explains code built on the package - bounded contexts and folders, value objects and Composite, aggregates (public constructor, create, fromPrimitives/toPrimitives), child entities, events and business errors, the abstract repository per aggregate and its adapters (in memory, IndexedDB over IndexedDbTable, MongoDB), user use cases (UseCase) and reaction use cases (EventListener with @ListensTo), domain services and ports, read models, Criteria, the composition root, controllers and ExceptionClassifier - and routes design questions to the DDD guide suite shipped in the package. Use it whenever someone applies DDD, designs or reviews a domain model, writes or changes any of those classes, decides which layer a class belongs to, or the code imports @archi-code/ddd.
---

# archi-code-ddd

`@archi-code/ddd`: Domain-Driven Design for TypeScript, one entry point per layer, each with the
exceptions of its layer: `@archi-code/ddd/domain`, `@archi-code/ddd/application` and
`@archi-code/ddd/infrastructure` (there is no root import). This skill holds the essential rules
and the workflow; the rules of every class, the code to copy and the common mistakes are in the
package guides it lists, and design questions go to the DDD guide suite.

## Full API

Before using a class, function, option or type this skill and its guides do not show, read
`node_modules/@archi-code/ddd/README.md` (elsewhere, the `README.md` in the package folder below):
it matches the installed version. Never assume signatures, options nor exports.

## Where the guides are

Every path below that starts with `ddd-skills/` is relative to the **package folder**, never to
this skill's folder (this `SKILL.md` is a link and has no guides next to it):

- a project that uses the package: `node_modules/@archi-code/ddd/` (so the guides are in
  `node_modules/@archi-code/ddd/ddd-skills/`);
- workspaces, pnpm or any other layout: the folder of the file that
  `node -p "require.resolve('@archi-code/ddd/package.json')"` prints;
- this monorepo: `packages/ddd/`.

If the package is not installed, stop and ask the user to install `@archi-code/ddd` (and
`@archi-code/validation` for `@Validations`); do not write code against an API you cannot read.

## Generating code

Follow these steps for every request that creates or changes code (a context, an aggregate, a use
case, a reaction, an adapter, an endpoint). A one-line fix may skip step 1 and step 3.

**Load only what the request needs, when you need it.** Never read every guide up front: read
`where-each-class-goes.md` once, then the guide of each kind of class just before you write that
kind of class (table "Package guides" below). A request that adds a value object reads
`value-objects.md` and nothing else; a new context reads the guides one by one as step 4 reaches
them.

1. **Understand the business before writing.** Name the bounded context, its ubiquitous language,
   the aggregates and their invariants, which actions users ask for (commands, which may be
   refused) and which facts arrive from elsewhere (events, never refused), who may do each action
   (actor and role) and the persistence technology. Read what the project already has
   (`src/contexts/`, `composition.ts`, existing value objects) and follow it. When a rule, a name,
   an invariant or a permission is not in the request nor in the code, **ask** before inventing
   it.
2. **Read `where-each-class-goes.md`** (layers, imports, folders, names, where each exception is
   thrown, the mistakes of structure). Only for a design decision (boundaries, what goes in one
   aggregate, events between contexts, read models) also read the matching `GUIA.md` of the suite
   (table "The DDD guide suite").
3. **Write a short design and show it**: the aggregates with their value objects and invariants,
   each use case (user or reaction) with the aggregate it saves, the events (name, fields, who
   hears them), the read models and their queries, the repositories and adapters, and the
   assumptions you made. When the design has open questions or assumptions about business rules,
   names or permissions, **stop and wait for the answers** before step 4; otherwise continue. A
   use case that must save more than one aggregate needs a decision record in
   `docs/decisions/NNNN-<title>.md` before the code.
4. **Generate in this order**, one class per file, at the path and with the name
   `where-each-class-goes.md` gives, copying the shape of the "Code" of the guide named in each
   step. Skip the steps the request does not touch, and open each guide only when you reach its
   step:
   1. shared kernel types (money in `shared-kernel/money/`) when they appear and do not exist yet,
      and value objects, ids and references → `value-objects.md`;
   2. domain events and business errors → `events-and-errors.md`;
   3. child entities, `New<Child>` shapes, outcome enums and the aggregate → `aggregates.md`;
   4. the abstract repository → `repositories.md`; domain ports, domain services and
      specifications → `domain-services.md`;
   5. user use cases with their `Input`, `Command` and data types → `use-cases.md`;
   6. copies of foreign events and reaction use cases → `reactions.md` (with `use-cases.md`);
   7. read models: row, store, query port, projection, one reaction per event → `read-models.md`;
   8. adapters: one repository per technology, port adapters, read-model stores →
      `repositories.md`; `search` with a `Criteria` → `criteria.md`;
   9. `composition.ts`, the top-level start file, the protocol helper and the controllers →
      `composition-and-entry-points.md`;
   10. tests mirroring `src/`: the round trip and behavior of every aggregate, every use case with
       its refusals, every reaction delivered twice, the domain services with stubs, and one
       repository contract that every adapter runs → `tests.md`.

   Read `imports.md` when you write the import lines and are unsure which subpath exports a name.

5. **Check before finishing.**
   1. Type-check and format the files with the project's own tools: `npx tsc --noEmit` (with the
      project's `tsconfig.json`) and the project's Prettier (its format script, or
      `npx prettier --write <files>`). Fix every error; never silence one with a cast, `any` or
      `@ts-ignore`. If a tool is not installed, say so and skip it; never install anything.
   2. Go through the "What not to do" of `where-each-class-goes.md` and of every guide you read
      in step 4 against the generated files and fix what fails: layer and imports of each file,
      names, the package tool used for each need (table below), no own base classes nor invented
      API.
   3. Running the tests is not part of this step unless the user asks for it.
6. **Report**: the files written, the design decisions, the assumptions you made, the result of
   step 5 and the questions still open.

### Package tools for each need

Generated code always uses these tools of the package; never a hand-written replacement.

| Need                                              | Tool                                                                                                                                           |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Text, number, boolean, date, id, enum, list, JSON | `StringType`, `NumberType`, `BooleanType`, `DateType`, `IdType`, `UuidType`, `EnumType`, `ArrayType`, `JsonType` + `Required(...)` (`/domain`) |
| Validation rules of a value object                | `@Validations` of `@archi-code/validation`                                                                                                     |
| Value object of several fields, money             | `Composite({...})` (`/domain`)                                                                                                                 |
| Cleaning one-line text, slugs                     | `StringSanitizer.singleLine`, `StringSanitizer.slug`, `vo.slug()` (`/domain`)                                                                  |
| Creation and change dates                         | `CreatedAt.now()`, `UpdatedAt.now()` (`/domain`)                                                                                               |
| Aggregate, child entity, event, business rule     | `AggregateRoot`, `Entity`, `EventBase`, `Specification` (`/domain`)                                                                            |
| Business errors and their codes                   | `DomainException` (`/domain`)                                                                                                                  |
| Repository contract                               | `AggregateRepository` + `AggregateFinder`/`AggregateSaver`/`AggregateRemover`/`AggregateSearcher` (`/domain`)                                  |
| Searching aggregates                              | `Criteria`, `defineCriteriaSchema` (`/domain`); adapters of `@archi-code/criteria-adapters`                                                    |
| Building the value objects of an input            | `ValueObjectBuilder.build` / `buildList` (`/application`)                                                                                      |
| User use case, reaction use case                  | `UseCase`; `EventListener` + `@ListensTo` (`/application`)                                                                                     |
| Not found, not allowed, conflict                  | `AggregateNotFoundException`, `NotAllowedException`, `ConcurrencyException` (`/application`)                                                   |
| Publishing events, logging                        | `EventBus`, `Logger` ports (`/application`)                                                                                                    |
| Event wiring and transport                        | `DomainEventBus`, `EventRegistry`, `EventChannel`, `InMemoryEventChannel` (`/infrastructure`)                                                  |
| IndexedDB persistence                             | `IndexedDbTable` (`/infrastructure`)                                                                                                           |
| Errors of adapters                                | `InternalErrorException` (`/infrastructure`)                                                                                                   |
| Error → protocol status                           | `ExceptionClassifier`, `ExceptionKind` (`/infrastructure`)                                                                                     |
| Logger implementations                            | `ConsoleLogger`, `InMemoryLogger`, `SilentLogger` (`/infrastructure`)                                                                          |

## Rules

### DDD rules (from the books)

- **Bounded context** = one ubiquitous language; code names come from it. Split by language, never
  by technology or team; modules inside [IDDD ch. 1, 2, 9].
- **Integration**: consumers depend on the published event, never on the producer's classes; ACL
  in front of legacy or external systems; at-least-once delivery, idempotent receivers, no
  blocking synchronous chains [Distilled ch. 4; IDDD ch. 13].
- **Domain free of technology**, dependencies pointing inward (hexagonal); thin application
  services with no business rules; the model is never exposed through REST [IDDD ch. 4, 14].
- **Prefer value objects**: immutable, equal by value, side-effect free [IDDD ch. 6].
  **Entities**: stable identity assigned early, business behavior, no setters [IDDD ch. 5].
- **Aggregates**: small, only true invariants inside, other aggregates by id, eventual consistency
  between them; one transaction changes one aggregate; "whose job is it?" breaks ties; no
  repositories nor services injected [IDDD ch. 10; Distilled ch. 5].
- **Domain events**: past-tense facts carrying what consumers need, stored with the aggregate
  and published after; a fact from another context is never refused, it is recorded or compensated
  [Distilled ch. 6; IDDD ch. 8].
- **Repository**: one per aggregate, declared in the domain, collection-like, not a DAO
  [IDDD ch. 12]. **Domain service**: only an operation that fits no entity or value, stateless
  [IDDD ch. 7]. **Specification**: a named, combinable business rule [IDDD ch. 5, 6].
- CQRS and Event Sourcing only for a concrete risk; without business rules a well encapsulated
  CRUD is enough [IDDD ch. 1, 4].

### Package rules

Marked `[Fuera de los libros: convención de @archi-code/ddd]` where they leave the books. Each
one is developed, with its code and its mistakes, in the guide named after the arrow.

- **Contexts**: `src/contexts/<context>/` with `domain/` split by kind (`aggregate/`, `entity/`,
  `value-object/`, `event/`, `exception/`, `repository/`, `service/`, `specification/`),
  `application/` one folder per business action, `infrastructure/`, `interfaces/` and one
  `composition.ts`. Contexts never import each other (only `shared-kernel/`); data crosses only as
  events, with one local copy of each foreign event per context. Domain files PascalCase, the rest
  kebab-case. → `where-each-class-goes.md`
- **Value objects are always valid**: one named class per file, rules in `@Validations`,
  `Required(...)` when mandatory, built with `ValueObjectBuilder.build` so every field is reported;
  several fields = `Composite`, free-form JSON = `JsonType`; derived values are methods; one-line
  text cleaned in the VO's `filter` with `StringSanitizer.singleLine`, slugs with `slug()`. →
  `value-objects.md`
- **Aggregates**: public constructor that only assigns; `static create(id, ...)` sets the initial
  state, stamps `CreatedAt.now()`/`UpdatedAt.now()`, checks the creation invariants and records
  `<Aggregate>CreatedDomainEvent`; the use case passes the id (`XId.generate()` or derived);
  `fromPrimitives`/`toPrimitives` cover every field, with a round-trip test. Methods a user asks for
  check the requester and throw business errors; methods reactions call return silently. The
  aggregate decides: an outcome that changes what the use case does is returned as an enum. →
  `aggregates.md`
- **Events** `<Aggregate><PastAction>DomainEvent`, `'<aggregate>.<past_action>'`, `readonly`
  primitive fields, one constructor object `{ …fields } & EventMetadata`, no union types. **Business
  errors** `<WhatWentWrong> extends DomainException`, code `<CTX><NNN>`. → `events-and-errors.md`
- **Use cases**: a user use case extends `UseCase` (authorize the role, create or load, one business
  method, save once, publish); a reaction use case is one `EventListener` with `@ListensTo(Event, {
consumer: '<context>.<action>-on-<event>' })` (build VOs, derived id, find or create, reaction
  method, save, publish; idempotent, never throws business errors). One business action, one
  aggregate saved once; **never uses another use case**; never branches on the aggregate's state;
  retries a conflict only when repeat-safe; external effects only from a reaction after `save`, with
  the asking `eventId` as idempotency key; uniqueness is a derived id; a closing fact that arrives
  first creates the aggregate already closed. Queries go to read-model query ports, never a use
  case. → `use-cases.md`, `reactions.md`
- **Domain service** only when two or more use cases share business logic or a rule needs several
  aggregates or a domain port (a bare port call is not one); built inside `handle`, never injected.
  → `domain-services.md`
- **Repositories**: abstract `<Aggregate>Repository extends AggregateRepository<X>` with only the
  needed verbs (`findById`, `search`, `save`, `remove`); one adapter per technology, the only code
  touching the database, owning the transaction and the version check (`ConcurrencyException`);
  IndexedDB only through `IndexedDbTable`; outbox when events must not be lost. → `repositories.md`
- **Read models**: row with one flag per fact, store port, query port, a projection that skips
  applied `eventId`s, one reaction per event. → `read-models.md`
- **Entry points** check only actor and shape, call one use case or query port, never catch; one
  protocol helper maps errors with `ExceptionClassifier`. `composition.ts` alone builds and
  subscribes everything and never builds a domain service. → `composition-and-entry-points.md`
- **Time** only via `CreatedAt.now()`/`UpdatedAt.now()` inside aggregates; logging only through the
  `Logger` port, never in the domain. Never write your own base classes (`ValueObject`, `Entity`,
  `AggregateRoot`, `DomainEvent`) nor invent API. → `aggregates.md`,
  `composition-and-entry-points.md`

## Package guides

In `ddd-skills/archi-code-ddd/` (located as above). They are part of this skill. Each guide of a
kind of class has three parts: `Rules` (with the reason and the book), `Code` (the shape to copy)
and `What not to do` (the mistakes to check before finishing and in audits). Read a guide only
when the request writes, changes or reviews that kind of class.

| You write or review                                                            | Read                              |
| ------------------------------------------------------------------------------ | --------------------------------- |
| Anything (once per request): layers, imports, folders, names, exceptions       | `where-each-class-goes.md`        |
| Value objects, ids, references, enums, lists, JSON, `Composite`, money         | `value-objects.md`                |
| Aggregates, child entities, `fromPrimitives`/`toPrimitives`, time              | `aggregates.md`                   |
| Domain events, business errors                                                 | `events-and-errors.md`            |
| Domain services, domain ports, specifications, logic two use cases share       | `domain-services.md`              |
| User use cases (and the rules every use case follows)                          | `use-cases.md`                    |
| Reaction use cases, copies of foreign events, external side effects            | `reactions.md`                    |
| Read models: rows, stores, query ports, projections                            | `read-models.md`                  |
| Abstract repository, repository adapters (memory, IndexedDB, …), port adapters | `repositories.md`                 |
| Composition root, event bus and channels, controllers, protocol helper, logs   | `composition-and-entry-points.md` |
| Tests of all of the above                                                      | `tests.md`                        |
| Searching aggregates with `Criteria`: schemas for request input, URL text      | `criteria.md`                     |
| Which entry point exports each class, function and type                        | `imports.md`                      |

## The DDD guide suite

This is the **only skill to load** for DDD with this package. The suite (Spanish, each rule with
its book: Vernon's _Implementing Domain-Driven Design_ and _Domain-Driven Design Distilled_, and
_DDD in PHP_) lives in the package's `ddd-skills/`; never copy the suite into `.claude/skills/`:
read it from the package. Each guide is a folder with a `GUIA.md` and the `references/` it points
to; read the `GUIA.md` of the situation and only the references the case needs. The essential
rules with their source are in `ddd-skills/ddd-orquestador/references/chuleta-reglas.md`.

| Situation                                                   | `ddd-skills/…/GUIA.md`          |
| ----------------------------------------------------------- | ------------------------------- |
| Unclear request, where to start, a new project              | `ddd-orquestador`               |
| How contexts and external systems integrate, ACL            | `ddd-context-mapping`           |
| Folders, layers, dependencies, composition root             | `ddd-arquitectura`              |
| Value object or entity, ids, validation, Specification      | `ddd-value-objects-entidades`   |
| Aggregate boundaries, invariants, concurrency, factories    | `ddd-agregados`                 |
| Events, messaging, outbox, idempotence                      | `ddd-eventos-dominio`           |
| Loading and saving aggregates, repository tests             | `ddd-repositorios-persistencia` |
| Domain services, use cases, where logic goes, authorization | `ddd-servicios-capa-aplicacion` |
| Read models, CQRS, Event Sourcing                           | `ddd-event-sourcing-cqrs`       |
| Review or migrate existing code                             | `ddd-auditoria-refactorizacion` |

- **Precedence**: the suite decides the design (boundaries, what goes in one aggregate,
  invariants, which events exist); the code follows `ddd-skills/archi-code-ddd/`, which wins on code
  shape (folders, names, constructors, events, use cases) where a suite example differs. Any
  other disagreement on a DDD rule is a package defect: follow the suite and say so.
- **Gaps**: when neither the guides nor the suite cover something, use standard DDD and say so;
  never invent concepts nor practices.
- **Audits** of code built on this package: the suite's `ddd-auditoria-refactorizacion` checklist
  plus the "What not to do" of `where-each-class-goes.md` and of the guide of each kind of
  class audited. Its scanner (Python 3; its findings are hints to confirm
  by reading the code):

  ```bash
  python3 -I "$(dirname "$(node -p "require.resolve('@archi-code/ddd/package.json')")")/ddd-skills/ddd-auditoria-refactorizacion/scripts/scan_ddd_smells.py" <folder>
  ```

## Related skills

Use them together with this one when they are installed:

- `archi-code-validation`: the validators, their options and `@Validations` rules.
- `archi-code-criteria-adapters`: runs a `Criteria` in memory or turns it into a MongoDB or
  IndexedDB query, for the `search` of repository adapters.

When one is not installed, read the `README.md` of its package instead
(`node_modules/@archi-code/validation/`, `node_modules/@archi-code/criteria-adapters/`); when the
package itself is missing, stop and ask the user to install it, as for this one.
