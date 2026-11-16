---
name: archi-code-ddd
description: The single entry point for Domain-Driven Design with @archi-code/ddd. Routes DDD questions to the guide suite in the package and gives the package conventions for value objects, aggregates, events, business errors, repositories, use cases and reactions, domain services, read models, Criteria, composition and controllers. Use it whenever someone applies DDD, designs or reviews a domain model, writes any of those classes or their adapters (IndexedDB included), decides which layer a class belongs to, or the code imports @archi-code/ddd.
---

# archi-code-ddd

`@archi-code/ddd`: DDD for TypeScript, one entry point per layer with its own exceptions:
`/domain` (value objects, `Composite`, `Specification`, `Entity`, `AggregateRoot`, `EventBase`,
`Criteria`, `AggregateRepository`), `/application` (`UseCase`, `EventListener`, `@ListensTo`,
`EventBus`, `Logger`, `ValueObjectBuilder`), `/infrastructure` (`DomainEventBus`,
`EventRegistry`, `EventChannel`, loggers, `IndexedDbTable`, `ExceptionClassifier`).

## Full API

Before using anything this skill does not show, read `node_modules/@archi-code/ddd/README.md` (the
installed version); never assume signatures. Elsewhere (workspaces, pnpm):
`node -p "require.resolve('@archi-code/ddd/package.json')"`.

## The DDD guide suite

This is the **only skill to load** for DDD with this package. The suite (Spanish, from Vernon's
IDDD and _Distilled_ and _DDD in PHP_) lives in the package's `ddd-skills/` folder (in this
monorepo `packages/ddd/ddd-skills/`); never copy the suite into `.claude/skills/`. Each guide is a
`GUIA.md` plus `references/`, `assets/`, `scripts/`, read only when routed; its paths are relative
to the package folder.

1. Any task beyond a quick fix starts at `ddd-skills/ddd-orquestador/GUIA.md`; its
   `references/chuleta-reglas.md` has every essential rule with its source. A new project goes
   architecture → aggregates and value objects → events → repositories → use cases.
2. Then the matching guide:

   | Situation                                                   | `ddd-skills/…/GUIA.md`          |
   | ----------------------------------------------------------- | ------------------------------- |
   | Unclear request, where to start                             | `ddd-orquestador`               |
   | How contexts integrate, ACL                                 | `ddd-context-mapping`           |
   | Folders, layers, dependencies, composition root             | `ddd-arquitectura`              |
   | Value object or entity, ids, validation, Specification      | `ddd-value-objects-entidades`   |
   | Aggregate boundaries, invariants, concurrency, factories    | `ddd-agregados`                 |
   | Events, messaging, outbox, idempotence                      | `ddd-eventos-dominio`           |
   | Loading and saving aggregates, repository tests             | `ddd-repositorios-persistencia` |
   | Domain services, use cases, where logic goes, authorization | `ddd-servicios-capa-aplicacion` |
   | Read models, CQRS, Event Sourcing                           | `ddd-event-sourcing-cqrs`       |
   | Review or migrate existing code                             | `ddd-auditoria-refactorizacion` |

3. **Design with the suite, code with the package**: never write your own base classes
   (`ValueObject`, `Entity`, `AggregateRoot`, `DomainEvent`). Divergences from the books are marked
   `[Fuera de los libros: convención de @archi-code/ddd]`. Where a guide's code shape differs from
   `ddd-skills/archi-code-ddd/`, the package guides win; a disagreement on a DDD rule is a package
   defect: follow the guide. Say which book each rule comes from.
4. **Audits**: the `ddd-auditoria-refactorizacion` checklist plus
   `ddd-skills/archi-code-ddd/what-not-to-do.md`. Hints scanner (Python 3, confirm by reading):
   `python3 -I "$(dirname "$(node -p "require.resolve('@archi-code/ddd/package.json')")")/ddd-skills/ddd-auditoria-refactorizacion/scripts/scan_ddd_smells.py" <folder>`.
   Import direction: `ddd-skills/ddd-arquitectura/assets/dependency-cruiser.cjs`.

Related skills: `archi-code-validation` (`@Validations`) and `archi-code-criteria-adapters`.

## Rules and patterns of this package

In `ddd-skills/archi-code-ddd/`; read the file matching the task (all of them when unsure).

| File                       | When                                                     |
| -------------------------- | -------------------------------------------------------- |
| `imports.md`               | Which entry point exports each symbol                    |
| `where-each-class-goes.md` | Layer of each class, import matrix, folder layout, names |
| `layers.md`                | The rules of every kind of class                         |
| `patterns.md`              | Code to start from, and the tests                        |
| `what-not-to-do.md`        | Audit checklist and the most common mistakes             |
| `criteria.md`              | Searching aggregates with `Criteria`                     |

## The essentials

- **Contexts**: `src/contexts/<context>/` with `domain/` (by kind), `application/` (one folder per
  business action), `infrastructure/`, `interfaces/`, `composition.ts`. Contexts never import each
  other (only `shared-kernel/`); data crosses only as events, one local copy per foreign event.
- **Value objects are always valid**: one named class per file, `@Validations`, `Required(...)`,
  built with `ValueObjectBuilder.build` (every field reported); several fields = `Composite`;
  derived values are methods; text through `slug()`/`StringSanitizer`, never own regexes.
- **Aggregates**: public constructor that only assigns; `static create(id, ...)` stamps
  `CreatedAt.now()`/`UpdatedAt.now()`, checks invariants, records `<Aggregate>CreatedDomainEvent`;
  the use case passes the id; `fromPrimitives`/`toPrimitives` with a round-trip test. User commands
  throw business errors; methods reactions call return silently.
- **Events** `<Aggregate><PastAction>DomainEvent`, `'<aggregate>.<past_action>'`, primitive fields
  only. **Business errors** `<WhatWentWrong> extends DomainException`, code `<CTX><NNN>`.
- **Use cases**: `UseCase` (user) or `EventListener` + `@ListensTo` (reaction, idempotent, never
  throws); one business action, one aggregate saved once, then publish. Never uses another use
  case, never branches on the aggregate's state, retries a conflict only when repeat-safe, runs
  external effects only from a reaction after `save`. Queries go to read-model ports, never a use
  case.
- **Domain service** only when two+ use cases share business logic or a rule needs several
  aggregates or a domain port; built inside `handle`, never injected.
- **Repositories**: one abstract `<Aggregate>Repository` in the domain with only the needed verbs
  (`findById`, `search`, `save`, `remove`); one adapter per technology, the only code touching the
  database, with a version check (`ConcurrencyException`) and its own transaction.
- **Entry points** check actor and shape, call one use case and never catch; one protocol helper
  maps errors with `ExceptionClassifier`. `composition.ts` builds and subscribes everything.
- **Time** only via `CreatedAt.now()`/`UpdatedAt.now()`; logging only through the `Logger` port,
  never in the domain.
