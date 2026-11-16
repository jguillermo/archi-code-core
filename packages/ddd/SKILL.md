---
name: archi-code-ddd
description: The single entry point for Domain-Driven Design with @archi-code/ddd. Holds the essential DDD and package rules, routes deeper questions to the guide suite in the package, and covers value objects, aggregates, events, business errors, repositories, use cases and reactions, domain services, read models, Criteria, composition and controllers. Use it whenever someone applies DDD, designs or reviews a domain model, writes any of those classes or their adapters (IndexedDB included), decides which layer a class belongs to, or the code imports @archi-code/ddd.
---

# archi-code-ddd

`@archi-code/ddd`: DDD for TypeScript, one entry point per layer with its own exceptions:
`/domain`, `/application`, `/infrastructure`. Before using anything this skill does not show, read
`node_modules/@archi-code/ddd/README.md` (elsewhere:
`node -p "require.resolve('@archi-code/ddd/package.json')"`); never assume signatures.

## DDD rules (from the books)

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
- **Domain events**: past-tense facts carrying only what consumers need, stored with the aggregate
  and published after; a fact from another context is never refused, it is recorded or compensated
  [Distilled ch. 6; IDDD ch. 8].
- **Repository**: one per aggregate, declared in the domain, collection-like, not a DAO
  [IDDD ch. 12]. **Domain service**: only an operation that fits no entity or value, stateless
  [IDDD ch. 7]. **Specification**: a named, combinable business rule [IDDD ch. 5, 6].
- CQRS and Event Sourcing only for a concrete risk [IDDD ch. 4].

## Package rules

Marked `[Fuera de los libros: convención de @archi-code/ddd]` where they leave the books.

- **Contexts**: `src/contexts/<context>/` with `domain/` by kind, `application/` one folder per
  business action, `infrastructure/`, `interfaces/`, `composition.ts`; never import each other
  (only `shared-kernel/`); one local copy per foreign event.
- **Value objects always valid**: one named class per file, `@Validations`, `Required(...)`, built
  with `ValueObjectBuilder.build` (every field reported); several fields = `Composite`; derived
  values are methods; text through `slug()`/`StringSanitizer`.
- **Aggregates**: public constructor that only assigns; `static create(id, ...)` stamps
  `CreatedAt.now()`/`UpdatedAt.now()`, checks invariants, records `<Aggregate>CreatedDomainEvent`;
  the use case passes the id; `fromPrimitives`/`toPrimitives` with a round-trip test. A rule over
  its state (only the buyer cancels) is its method. User commands throw business errors; methods
  reactions call return silently.
- **Events** `<Aggregate><PastAction>DomainEvent`, `'<aggregate>.<past_action>'`, primitive
  fields. **Business errors** `<WhatWentWrong> extends DomainException`, code `<CTX><NNN>`.
- **Use cases**: `UseCase` (user) or `EventListener` + `@ListensTo` (reaction: idempotent, never
  throws); one business action, one aggregate saved once, then publish. Never uses another use
  case nor branches on the aggregate's state; retries a conflict only when repeat-safe; external
  effects only from a reaction after `save`, with an idempotency key; uniqueness is a derived id.
  Queries go to read-model ports, never a use case.
- **Domain service** only when two+ use cases share business logic or a rule needs several
  aggregates or a domain port; built inside `handle`, never injected.
- **Repositories**: abstract `<Aggregate>Repository` with only the needed verbs (`findById`,
  `search`, `save`, `remove`); one adapter per technology, the only code touching the database,
  owning the transaction and the version check (`ConcurrencyException`); outbox when events must
  not be lost.
- **Entry points** check actor and shape, call one use case, never catch; one protocol helper maps
  errors with `ExceptionClassifier`. `composition.ts` builds and subscribes everything.
- **Time** only via `CreatedAt.now()`/`UpdatedAt.now()`; logging only through the `Logger` port,
  never in the domain. Never write your own base classes (`ValueObject`, `Entity`,
  `AggregateRoot`, `DomainEvent`).

## Package guides

In `ddd-skills/archi-code-ddd/`; read the one matching the task (all when unsure).

| File                       | When                                                     |
| -------------------------- | -------------------------------------------------------- |
| `imports.md`               | Which entry point exports each symbol                    |
| `where-each-class-goes.md` | Layer of each class, import matrix, folder layout, names |
| `layers.md`                | The rules of every kind of class; the audit checklist    |
| `patterns.md`              | Code to start from, and the tests                        |
| `criteria.md`              | Searching aggregates with `Criteria`                     |

## The DDD guide suite

This is the **only skill to load** for DDD with this package. Design questions go deeper in the
suite (Spanish, each rule with its book) in the package's `ddd-skills/` (this monorepo:
`packages/ddd/ddd-skills/`); never copy the suite into `.claude/skills/`. Start at
`ddd-skills/ddd-orquestador/GUIA.md` (rule sheet: `references/chuleta-reglas.md`), then:

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

The suite decides boundaries and invariants; the code follows `ddd-skills/archi-code-ddd/`, which
wins on code shape. A disagreement on a DDD rule is a package defect: follow the suite. Audits add
`layers.md` and the scanner (Python 3, hints to confirm):
`python3 -I "$(dirname "$(node -p "require.resolve('@archi-code/ddd/package.json')")")/ddd-skills/ddd-auditoria-refactorizacion/scripts/scan_ddd_smells.py" <folder>`;
import direction: `ddd-skills/ddd-arquitectura/assets/dependency-cruiser.cjs`.

Related skills: `archi-code-validation` and `archi-code-criteria-adapters`.
