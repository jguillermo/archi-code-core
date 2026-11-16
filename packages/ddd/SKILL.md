---
name: archi-code-ddd
description: The single entry point for Domain-Driven Design with @archi-code/ddd. Routes DDD questions to the guide suite in the package (contexts, architecture, value objects, aggregates, events, repositories, application services, CQRS, audits) and gives the package conventions - context folders and names, value objects and Composite, aggregates (create, fromPrimitives/toPrimitives), events, business errors, abstract repository per aggregate, user use cases (UseCase) and reaction use cases (EventListener with @ListensTo), domain services, read models, Criteria, composition root, controllers and ExceptionClassifier. Use it whenever someone applies DDD, designs or reviews a domain model, writes value objects, aggregates, events, use cases, reactions, read models, repositories, adapters (IndexedDB repositories over IndexedDbTable included), controllers or wiring, decides which layer a class belongs to, or the code imports @archi-code/ddd.
---

# archi-code-ddd

`@archi-code/ddd`: DDD for TypeScript, one entry point per layer, each with its own exceptions:
`/domain` (value objects, `Composite`, `Specification`, `Entity`, `AggregateRoot`, `EventBase`,
`Criteria`, `AggregateRepository` and its roles), `/application` (`UseCase`, `EventListener`,
`@ListensTo`, `EventBus`, `Logger`, `ValueObjectBuilder`) and `/infrastructure` (`DomainEventBus`,
`EventRegistry`, `EventChannel`, loggers, `IndexedDbTable`, `IndexedDbInspector`,
`ExceptionClassifier`).

## Full API

Before using anything this skill does not show, read `node_modules/@archi-code/ddd/README.md` (the
installed version); never assume signatures. Elsewhere (workspaces, pnpm):
`node -p "require.resolve('@archi-code/ddd/package.json')"`. Not installed:
`npm install @archi-code/ddd` (plus `@archi-code/validation` for `@Validations`).

## The DDD guide suite

This is the **only skill to load** for DDD with this package. The suite (Spanish, sourced from
Vernon's IDDD and _Distilled_, and _DDD in PHP_) lives in the package's `ddd-skills/` folder
(located like the README; in this monorepo `packages/ddd/ddd-skills/`);
never copy the suite into `.claude/skills/`. Each guide is a folder with `GUIA.md` (no skill frontmatter) and its
`references/`, `assets/`, `scripts/`, read only when routed here. Paths inside the guides are
relative to the package folder.

1. **Start at `ddd-skills/ddd-orquestador/GUIA.md`** for any task beyond a quick fix; its
   `references/chuleta-reglas.md` has every essential rule with its source.
2. **Read the matching `GUIA.md`** and the references it points to:

   | Situation                                                   | Read `ddd-skills/…/GUIA.md`     |
   | ----------------------------------------------------------- | ------------------------------- |
   | Unclear request, where to start, essential rules            | `ddd-orquestador`               |
   | How contexts integrate, ACL                                 | `ddd-context-mapping`           |
   | Folders, layers, dependencies, composition root             | `ddd-arquitectura`              |
   | Value object or entity, ids, validation, Specification      | `ddd-value-objects-entidades`   |
   | Aggregate boundaries, invariants, concurrency, factories    | `ddd-agregados`                 |
   | Events, messaging, outbox, idempotence                      | `ddd-eventos-dominio`           |
   | Loading and saving aggregates, repository tests             | `ddd-repositorios-persistencia` |
   | Domain services, use cases, where logic goes, authorization | `ddd-servicios-capa-aplicacion` |
   | Read models, CQRS, Event Sourcing                           | `ddd-event-sourcing-cqrs`       |
   | Review or migrate existing code                             | `ddd-auditoria-refactorizacion` |

   A new project follows the orchestrator's sequence: architecture → aggregates and value objects
   → events → repositories → use cases.

3. **Design with the suite, code with the package.** The suite decides boundaries, aggregates,
   invariants and events; the code follows `ddd-skills/archi-code-ddd/`. Never write your own
   generic base classes (`ValueObject`, `Entity`, `AggregateRoot`, `DomainEvent`). Every guide but
   the orchestrator opens with a "Con @archi-code/ddd" box listing its divergences from the books,
   marked `[Fuera de los libros: convención de @archi-code/ddd]`. Where a guide's example shape
   differs from `ddd-skills/archi-code-ddd/` (folders and file names, event names, the aggregate
   constructor and `create`, a listener calling a separate use case, `…Exception` business errors,
   the in-memory repository only in `test/support/`), the package guides win; any other
   disagreement on a DDD rule is a package defect: follow the guide.
4. **Audits** (`ddd-auditoria-refactorizacion`): its checklist plus every item of
   `ddd-skills/archi-code-ddd/what-not-to-do.md`. Scanner (Python 3; hints to confirm by reading):
   `python3 -I "$(dirname "$(node -p "require.resolve('@archi-code/ddd/package.json')")")/ddd-skills/ddd-auditoria-refactorizacion/scripts/scan_ddd_smells.py" <folder>`.
   It flags a use case saving two aggregates, transactions in domain or application, domain
   importing `/application` or `/infrastructure`, and `new Date()` in domain or application; a use
   case saving through a helper still needs a manual check. Without Python, apply the checklist by
   hand. Import direction: `ddd-skills/ddd-arquitectura/assets/dependency-cruiser.cjs`.
5. Say which book each rule comes from and mark what does not.

Related skills, if installed: `archi-code-validation` (validators, `@Validations`) and
`archi-code-criteria-adapters` (runs a `Criteria` in memory, MongoDB or IndexedDB).

## Rules and patterns of this package

In `ddd-skills/archi-code-ddd/`; read the file matching the task (all of them when unsure).

| File                       | When                                                     |
| -------------------------- | -------------------------------------------------------- |
| `imports.md`               | Which entry point exports each symbol                    |
| `where-each-class-goes.md` | Layer of each class, import matrix, folder layout, names |
| `layers.md`                | The rules of every kind of class                         |
| `patterns.md`              | Code to start from, and the tests                        |
| `what-not-to-do.md`        | Common mistakes; the audit checklist                     |
| `criteria.md`              | Searching aggregates with `Criteria`                     |

## The essentials

- **One folder per context** (`src/contexts/<context>/`: `domain/` by kind, `application/` by
  business action, `infrastructure/`, `interfaces/`, `composition.ts`). Contexts never import each
  other; only `shared-kernel/` is shared; data crosses only as events (each consumer keeps its own
  event copy).
- **Value objects are always valid**: named class per file, `@Validations`, `Required(...)`, built
  with `ValueObjectBuilder.build`; several fields = `Composite`; `slug()` and
  `StringSanitizer`, never own regexes.
- **Aggregates**: public assigning constructor; `static create(id, ...)` with
  `CreatedAt.now()`/`UpdatedAt.now()`, invariants and `<Aggregate>CreatedDomainEvent`; id from the
  use case; `fromPrimitives`/`toPrimitives`. User commands throw business errors; reaction methods
  return silently.
- **Events** `<Aggregate><PastAction>DomainEvent`, `'<aggregate>.<past_action>'`, primitive fields,
  no union types. **Business errors** `<WhatWentWrong> extends DomainException`, code per context.
- **Use cases**: `UseCase` (user) or `EventListener` + `@ListensTo` (reaction); one action, one
  save. **A use case never instantiates, receives, imports, extends nor calls another use case**.
  It never branches on the aggregate's state (one aggregate method decides), retries a conflict
  only when the command is repeat-safe (never a relative change like a discount), and records a
  multi-aggregate exception in a decision record.
- **Domain service** only when two+ use cases share business logic or a rule needs several
  aggregates or a domain port; built inside `handle` (`new CourseFinder(this.courses)`), never
  injected nor built in `composition.ts`; depends on loaded aggregates, the abstract repository
  (`findById`) or a domain port.
- **Repositories**: one abstract `<Aggregate>Repository` in the domain with only the needed verbs
  (`findById`, `search`, `save`, `remove`); one adapter per technology, the only place the database
  is used (IndexedDB: `IndexedDb<Aggregate>Repository` over `IndexedDbTable`). Business queries: a
  `Criteria` when the use case changes the aggregates, a read model when it only lists. Read-model
  rows survive late or repeated events (one flag per fact). A domain port has its own adapter.
- **Entry points** check actor and shape, call one use case; one protocol helper maps errors with
  `ExceptionClassifier`. `composition.ts` builds and subscribes everything.
