---
name: archi-code-ddd
description: The single entry point for Domain-Driven Design with @archi-code/ddd. It routes every DDD question to the guide suite shipped in the package (contexts, architecture, value objects, aggregates, events, repositories, application services, CQRS, audits) and gives the conventions, patterns and common mistakes of code built on it - context folder layout and names, value objects and Composite, aggregates (public constructor, create, fromPrimitives/toPrimitives), events and business errors, repository roles, user use cases (UseCase) and reaction use cases (an EventListener with @ListensTo that is the use case), event copies between contexts, read models, the composition root, controllers and ExceptionClassifier. Use it whenever someone applies DDD, designs or reviews a domain model, writes or changes value objects, aggregates, events, use cases, reactions, read models, repositories, adapters, controllers or wiring, decides which layer a class belongs to, or the code imports @archi-code/ddd.
---

# archi-code-ddd

`@archi-code/ddd` is archi-code's Domain-Driven Design package for TypeScript, one entry point per
layer, each with the exceptions of its layer: `@archi-code/ddd/domain` (value objects, `Composite`,
`Specification`, `Entity`, `AggregateRoot`, `EventBase`, the repository contracts
`AggregateFinder`, `AggregateSaver`, `AggregateRemover`, and `DomainException`,
`ValidationException`…), `@archi-code/ddd/application` (`UseCase`, the event contract to listen,
`EventListener` and `@ListensTo`, and to publish, `EventBus`, the ports `Clock`, `Logger`, and
`AggregateNotFoundException`, `NotAllowedException`…) and `@archi-code/ddd/infrastructure` (the
event wiring `DomainEventBus`, `EventRegistry` and the `EventChannel` port, in-memory event
channel, clocks, loggers, `InternalErrorException`…). `@archi-code/ddd/infrastructure` also has
`ExceptionClassifier`, which gives every entry point (HTTP, gRPC, queue, CLI) the `ExceptionKind`
of an error.

## Full API

Before using a class, function, option or type that does not appear in this skill, read
`node_modules/@archi-code/ddd/README.md`: it matches the installed version. Do not assume
signatures, options or exports. If the package is not installed: `npm install @archi-code/ddd`
(and `npm install @archi-code/validation` if validations are declared with `@Validations`).

If that path does not exist (monorepo with workspaces, pnpm…), locate the package with
`node -p "require.resolve('@archi-code/ddd/package.json')"` and read the `README.md` in that
folder.

## The DDD guide suite

This is the **only skill to load** for Domain-Driven Design with this package. It brings a suite
of DDD guides (in Spanish, with the source of each rule: Vernon's _Implementing Domain-Driven
Design_ and _Domain-Driven Design Distilled_, and _DDD in PHP_) inside the package, in
`ddd-skills/`; never copy the suite into `.claude/skills/`: read it from the package when this
skill says so. Locate it as the README: `node_modules/@archi-code/ddd/ddd-skills/`, or the
`ddd-skills/` folder next to the `package.json` that
`node -p "require.resolve('@archi-code/ddd/package.json')"` prints (in this monorepo,
`packages/ddd/ddd-skills/`). Each guide is a folder with a `GUIA.md` (no skill frontmatter), its
`references/` and, when it has them, `assets/` (tool configuration) and `scripts/`: they are never loaded
on their own, only read when this skill routes to them. Paths inside the guides (`ddd-skills/ddd-agregados/GUIA.md`) are relative to the package
folder.

How to use it, for every design question or task:

1. **Start at `ddd-skills/ddd-orquestador/GUIA.md`**: it says which guide covers each coding task
   (integration between contexts, architecture, classes, aggregates, events, repositories, use
   cases) and holds the conventions of the suite; read it for every task that is not a quick code
   fix. Its `references/chuleta-reglas.md` has every essential rule with its source.
2. **Read the `GUIA.md` of the matching guide** before answering, and the `references/` it points
   to for the case at hand:

   | Situation                                                              | Read `ddd-skills/…/GUIA.md`     |
   | ---------------------------------------------------------------------- | ------------------------------- |
   | Unclear request, "where do I start", the essential rules               | `ddd-orquestador`               |
   | How contexts and external systems relate and integrate, ACL            | `ddd-context-mapping`           |
   | Folder structure, layers, dependencies, modules, composition root      | `ddd-arquitectura`              |
   | Value object or entity, ids, primitives, validation, Specification     | `ddd-value-objects-entidades`   |
   | What goes together, invariants, transactions, concurrency, factories   | `ddd-agregados`                 |
   | Events, messaging, outbox, idempotence, versions                       | `ddd-eventos-dominio`           |
   | Loading and saving aggregates, mappers, transactions, repository tests | `ddd-repositorios-persistencia` |
   | Domain services, use cases, where the logic goes, authorization        | `ddd-servicios-capa-aplicacion` |
   | Full history, read models, CQRS, Event Sourcing                        | `ddd-event-sourcing-cqrs`       |
   | Review or migrate existing code                                        | `ddd-auditoria-refactorizacion` |

   A new project follows the orchestrator's sequence (architecture → aggregates and value objects →
   events → repositories → use cases).

3. **Design with the suite, write the code with this package.** The suite decides the design
   (boundaries, what goes in one aggregate, invariants, which events exist); the code follows the
   package conventions of `ddd-skills/archi-code-ddd/`. The guides' examples are written with
   this package's API (the classes of its `src`): never write generic base classes
   (`ValueObject`, `Entity`, `AggregateRoot`, `DomainEvent`) of your own. Every guide but the
   orchestrator opens with a "Con @archi-code/ddd" box that lists where it diverges from the
   books, marked `[Fuera de los libros: convención de @archi-code/ddd]`. Where the shape of a
   guide's example differs from `ddd-skills/archi-code-ddd/` (folder layout and file names, event
   class names and `eventName`, the aggregate's constructor and `create`, a listener that calls a
   separate use case, business errors named `…Exception`, the in-memory repository only in
   `test/support/`), the package guides win: they are the convention this package is built and
   tested with. Any other disagreement on a DDD rule is a defect of the package: follow the guide.
4. **Audits of code built on this package** (`ddd-auditoria-refactorizacion`): apply its checklist
   and also every item of `ddd-skills/archi-code-ddd/what-not-to-do.md`. Its scanner needs Python 3:
   `python3 -I "$(dirname "$(node -p "require.resolve('@archi-code/ddd/package.json')")")/ddd-skills/ddd-auditoria-refactorizacion/scripts/scan_ddd_smells.py" <folder>`.
   It flags a use case that saves two aggregates (`this.orders.save(…)` and `this.invoices.save(…)`
   or `remove(…)`), transactions handled in the domain or the application (they belong to the
   repository), domain code importing `@archi-code/ddd/application` or `/infrastructure`, and
   `new Date()` in domain or application code; its findings are hints to confirm by reading the
   code, and a use case that saves through a helper still needs a manual check. Without Python, apply the checklist by hand. For
   the import direction, use `ddd-skills/ddd-arquitectura/assets/dependency-cruiser.cjs`.
5. Keep the suite's conventions: say which rule comes from which book and mark what does not come
   from them.

If they are installed in the project, use them together with this one:

- `archi-code-validation`: available validators, their options and `@Validations` rules.

## Rules and patterns of this package

The rules, patterns and common mistakes of `@archi-code/ddd` live next to the suite, in
`ddd-skills/archi-code-ddd/` (located like the suite). They are part of this skill: read the file
that matches the task before writing or reviewing code, and every file when unsure.

| Read `ddd-skills/archi-code-ddd/…` | When                                                                                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `imports.md`                       | Which entry point exports each class, function and type                                                                                               |
| `where-each-class-goes.md`         | The layer of each class, the import matrix, the folder layout of a context and every naming rule                                                      |
| `layers.md`                        | The rules of value objects, aggregates, events, errors, user and reaction use cases, read models, repositories, entry points and the composition root |
| `patterns.md`                      | Code to start from for each of them, and the tests                                                                                                    |
| `what-not-to-do.md`                | The common mistakes; also the checklist of every audit of code built on this package                                                                  |

## The essentials

The rules every file of a project built on this package follows; the guides above give the
details and the code.

- **One folder per bounded context** (`src/contexts/<context>/`) with `domain/` (split by kind:
  `aggregate/`, `entity/`, `value-object/`, `event/`, `exception/`, `service/`,
  `specification/`), `application/` (one folder per business action), `infrastructure/`,
  `interfaces/` and one `composition.ts`. A context never imports another one; only
  `shared-kernel/` is shared. Domain files are PascalCase, every other file kebab-case.
- **Value objects are always valid**: one named class per file, rules in `@Validations`,
  `Required(...)` when mandatory, built with `ValueObjectBuilder.build` so every field is reported.
  Several fields are a `Composite`; free-form JSON is a `JsonType`, never a composite.
- **Aggregates**: public constructor that only assigns; `static create(id, ...valueObjects, clock)`
  sets the initial state, checks the creation invariants and records
  `<Aggregate>CreatedDomainEvent`; `fromPrimitives`/`toPrimitives` cover every field; the id comes
  from the use case (`OrderId.generate()`, or derived: `PaymentId.forOrder(order)`). Methods a
  user asks for throw business errors; methods that register a fact (called by reactions) return
  silently when it does not apply.
- **Events** are `<Aggregate><PastAction>DomainEvent` with `eventName` `'<aggregate>.<past_action>'`,
  primitive `readonly` fields, one constructor object `{ …fields } & EventMetadata`, no types of
  their own, and no union type of an aggregate's events: `AggregateRoot<<Aggregate>Id>` and
  `EventBus` work with `EventBase`.
- **Business errors** are `<WhatWentWrong> extends DomainException` with a code per context
  (`SAL001`), no `Exception` suffix.
- **Two kinds of use case**: a user use case extends `UseCase` (`Input` and `Command` in its file,
  authorization, load or create, one business method, save once, publish); a **reaction use case**
  is one `EventListener` with `@ListensTo(Event, { consumer: '<context>.<action>-on-<event>' })`
  that builds its value objects, finds or creates, calls the reaction method, saves and publishes,
  with no `UseCase` behind it, never throwing business errors nor `AggregateNotFoundException`.
- **Between contexts** only events travel: the consumer keeps its own copy of each foreign event
  next to the reaction that hears it, with the producer's class name and `eventName`.
- **Read models** are a row, a store port, a query port, a projection that skips applied
  `eventId`s and one reaction per event; queries need no use case.
- **Repositories** implement the package roles, one per aggregate and technology, and check the
  version in a `WeakMap`; the repository owns transactions and persistence.
- **Entry points** check only the actor and the shape, call one use case and let one protocol
  helper translate every error with `ExceptionClassifier`; `composition.ts` builds and subscribes
  everything of its context.
