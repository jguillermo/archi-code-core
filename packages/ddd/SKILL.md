---
name: archi-code-ddd
description: The single entry point for Domain-Driven Design with @archi-code/ddd. It routes every DDD question to the guide suite shipped in the package (integration between contexts, architecture, value objects and entities, aggregates, domain events, repositories, application services, event sourcing and CQRS, audits) and gives the rules, patterns and common mistakes for TypeScript code with @archi-code/ddd - where each class goes and what it may import, value objects, Composite, Specification, Entity, AggregateRoot, EventBase, repository roles, exceptions, UseCase, the event contract (EventListener, @ListensTo, DomainEventBus, event channels), ports, persistence owned by the repository and ExceptionClassifier. Use it whenever someone applies DDD, designs or reviews a domain model, integrates contexts, writes or changes value objects, aggregates, events, use cases, listeners, repositories or adapters, decides which layer a class belongs to, or whenever the code imports @archi-code/ddd.
---

# archi-code-ddd

`@archi-code/ddd` is archi-code's Domain-Driven Design package for TypeScript, one entry point per
layer: `@archi-code/ddd/exceptions` (the exceptions every layer throws), `@archi-code/ddd/domain`
(value objects, `Composite`, `Specification`, `Entity`, `AggregateRoot`, `EventBase`
and the repository contracts `AggregateFinder`, `AggregateSaver`, `AggregateRemover`),
`@archi-code/ddd/application` (`UseCase`, the event contract to listen, `EventListener` and
`@ListensTo`, and to publish, `EventBus`, and the ports `Clock`, `Logger`) and
`@archi-code/ddd/infrastructure` (aggregate mapper for your repositories, the
event wiring `DomainEventBus`, `EventRegistry` and the `EventChannel` port, in-memory event
channel, clocks, loggers). `@archi-code/ddd/exceptions` also has `ExceptionClassifier`, which
gives every entry point (HTTP, gRPC, queue, CLI) the `ExceptionKind` of an error.

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

3. **Design with the suite, write the code with this package.** The guides' examples are already
   written with this package's API (the classes of its `src`): copy them as they are, never write
   generic base classes (`ValueObject`, `Entity`, `AggregateRoot`, `DomainEvent`) of your own.
   Every guide but the orchestrator opens with a "Con @archi-code/ddd" box that lists where it
   diverges from the books, marked `[Fuera de los libros: convención de @archi-code/ddd]`. The
   guides are the source of truth: the package departs from them only where that mark says so,
   and then the package rule wins. Any other disagreement between a guide and this package
   (`ddd-skills/archi-code-ddd/` or its code) is a defect of the package: follow the guide.
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

| Read `ddd-skills/archi-code-ddd/…` | When                                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| `imports.md`                       | Which entry point exports each class, function and type                                  |
| `where-each-class-goes.md`         | The layer of each class, what it may import, the folder layout and the names             |
| `layers.md`                        | The rules of value objects, aggregates, events, use cases, listeners, ports and adapters |
| `patterns.md`                      | Code to start from: value objects, aggregates, use cases, listeners, repositories, tests |
| `what-not-to-do.md`                | The common mistakes; also the checklist of every audit of code built on this package     |
