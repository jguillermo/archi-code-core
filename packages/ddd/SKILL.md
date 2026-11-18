---
name: archi-code-ddd
description: Use it whenever someone applies Domain-Driven Design with @archi-code/ddd - designs or reviews a domain model, writes or changes any class built on the package, decides which layer a class belongs to, or the code imports @archi-code/ddd. It is the single entry point - it generates, reviews and explains bounded contexts and folders, value objects and Composite, aggregates (public constructor, create, fromPrimitives/toPrimitives), child entities, events and business errors, the abstract repository per aggregate and its adapters (in memory, IndexedDB over IndexedDbDatabase and IndexedDbSchema, MongoDB), user use cases (UseCase) and reaction use cases (EventListener with @ListensTo), domain services and ports, read models, Criteria, the composition root, controllers and ExceptionClassifier - and routes design questions to the DDD guide suite shipped in the package.
---

# archi-code-ddd

`@archi-code/ddd`: Domain-Driven Design for TypeScript, one entry point per layer, each with the
exceptions of its layer: `@archi-code/ddd/domain`, `@archi-code/ddd/application` and
`@archi-code/ddd/infrastructure` (there is no root import). This skill holds the workflow, its
gates and the rules no request may break; the rules of every class, the code to copy and the common mistakes are in the
package guides it lists, and design questions go to the DDD guide suite.

## Full API

Before using a class, function, option or type this skill and its guides do not show, look it up
in `node_modules/@archi-code/ddd/README.md` (elsewhere, the `README.md` in the package folder
below): it matches the installed version. The file is long: search it for the name
(`grep -n "<Name>" <package folder>/README.md`) and read only the sections the search finds,
never the whole file, and never skip the lookup. Never assume signatures, options nor exports.

## Where the guides are

Every path below that starts with `ddd-skills/` is relative to the **package folder**, never to
this skill's folder (this `SKILL.md` is a link and has no guides next to it):

- a project that uses the package: `node_modules/@archi-code/ddd/` (so the guides are in
  `node_modules/@archi-code/ddd/ddd-skills/`);
- workspaces, pnpm or any other layout: the folder that
  `node -p "require('path').dirname(require.resolve('@archi-code/ddd/package.json'))"` prints
  (it works in every shell);
- this monorepo: `packages/ddd/`.

`<package folder>` in the commands of this skill is that folder.

If the package is not installed, stop and ask the user to install `@archi-code/ddd` (and
`@archi-code/validation` for `@Validations`, and `@archi-code/criteria-adapters` when a repository
adapter has `search`); do not write code against an API you cannot read.

## Existing projects

The standard and the project each decide different things; neither is negotiated per request.

- **The project decides its tooling and its roots**: the contexts root it already has
  (`src/contexts/`, or `src/app/contexts/` when its code lives in `src/app/`; a project with
  neither gets `src/contexts/`), its `tsconfig.json`, its formatter, its linter, its test runner,
  where its specs live (the place its test runner already collects them: next to the code as
  `<file>.spec.ts`, or a `test/` root that mirrors `src/`; a project with no specs yet gets
  `test/`), its decision records folder (a project with none gets `docs/decisions/`) and the
  protocols it speaks (HTTP, IPC, a queue, a CLI). Use them as they are; never
  add a second tool next to the one the project has, and never change their configuration on
  your own.
- **The standard decides everything inside a context**: folders, layers, imports, names, the shape
  of every class and the package tool used for each need. A habit of the project that differs
  (use cases in a `use-cases/` folder, another event name format, own base classes, another file
  case) is **not** followed in new code, even when the neighbouring files do it.
- **The language of the names** is the one the code of the project already uses for its business
  words; a project with no code yet is asked (step 1). The parts of a name the standard fixes
  stay as the guides write them in any language (`Id`, `Type`, `Option`, `Reference`, `New`,
  `DomainEvent`, `On`, `Repository`, `Store`, `Projection`, `Controller`, `Context`, `Settings`),
  and an `eventName` uses the same business words as its class.
- **Existing code that breaks the standard** is never rewritten on your own. New files follow the
  standard; a file the request changes keeps its shape apart from the change asked; every
  violation you met in the files you read goes in the report (file, rule, fix), and is fixed only
  when the user asks.
- **Code that is not in a context yet** (a project that adopts the package): ask which bounded
  context the request belongs to and where the contexts root goes before writing; migrating what
  exists is a separate request (`ddd-auditoria-refactorizacion` of the suite).

## Package tools for each need

Generated code always uses these tools of the package; never a hand-written replacement. The
table names the tool of each need, not the whole API: `imports.md` lists every export.

| Need                                              | Tool                                                                                                                                           |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Text, number, boolean, date, id, enum, list, JSON | `StringType`, `NumberType`, `BooleanType`, `DateType`, `IdType`, `UuidType`, `EnumType`, `ArrayType`, `JsonType` + `Required(...)` (`/domain`) |
| Validation rules of a value object                | `@Validations` of `@archi-code/validation`                                                                                                     |
| Value object of several fields, money             | `Composite({...})` (`/domain`)                                                                                                                 |
| Cleaning one-line text, slugs                     | `StringSanitizer.singleLine`, `StringSanitizer.slug`, `vo.slug()` (`/domain`)                                                                  |
| Creation and change dates                         | `CreatedAt.now()`, `UpdatedAt.now()` (`/domain`)                                                                                               |
| Types of `fromPrimitives`, ids and searches       | `PrimitiveTypes`, `EntityId`, `SearchResult`, `SearchOptions` (`/domain`)                                                                      |
| Aggregate, child entity, event, business rule     | `AggregateRoot`, `Entity`, `EventBase`, `Specification` (`/domain`)                                                                            |
| Business errors and their codes                   | `DomainException` (`/domain`)                                                                                                                  |
| Repository contract                               | `AggregateRepository` + `AggregateFinder`/`AggregateSaver`/`AggregateRemover`/`AggregateSearcher` (`/domain`)                                  |
| Searching aggregates                              | `Criteria`, `defineCriteriaSchema` (`/domain`); adapters of `@archi-code/criteria-adapters`                                                    |
| Building the value objects of an input            | `ValueObjectBuilder.build` / `buildList` (`/application`)                                                                                      |
| User use case, reaction use case                  | `UseCase`; `EventListener` + `@ListensTo` (`/application`)                                                                                     |
| Not found, not allowed, conflict                  | `AggregateNotFoundException`, `NotAllowedException`, `ConcurrencyException` (`/application`)                                                   |
| Publishing events, logging                        | `EventBus`, `Logger` ports (`/application`)                                                                                                    |
| Event wiring and transport                        | `DomainEventBus`, `EventRegistry`, `EventChannel`, `InMemoryEventChannel` (`/infrastructure`)                                                  |
| IndexedDB persistence                             | `IndexedDbDatabase`, `IndexedDbSchema` (`/infrastructure`)                                                                                     |
| Errors of adapters                                | `InternalErrorException` (`/infrastructure`)                                                                                                   |
| Error → protocol status                           | `ExceptionClassifier`, `ExceptionKind` (`/infrastructure`)                                                                                     |
| Logger implementations                            | `ConsoleLogger`, `InMemoryLogger`, `SilentLogger` (`/infrastructure`)                                                                          |

## Generating code

Follow these steps for every request that creates or changes code (a context, an aggregate, a use
case, a reaction, an adapter, an endpoint). Only a **small change** may skip step 3: one that
edits existing files and adds no class, no file, no public method, no field, no event and no
exception code. Nothing skips steps 1, 2, 5 and 6, and every change adds or updates the tests of
the behavior it touches (row 10 of "Package guides").

**Load only what the request needs, when you need it.** Never read every guide up front: read
`where-each-class-goes.md` once, then the guide of each kind of class just before you write that
kind of class (table "Package guides" below). A request that adds a value object reads
`value-objects.md` and nothing else; a new context reads the guides one by one as step 4 reaches
them.

1. **Understand the business before writing.** Name the bounded context, its ubiquitous language,
   the aggregates and their invariants, which actions users ask for (commands, which may be
   refused) and which facts arrive from elsewhere (events, never refused), who may do each action
   (actor and role) and the persistence technology. Read what the project already has (the
   contexts root, `composition.ts`, existing value objects, its scripts and test runner) and apply
   "Existing projects". Check its `tsconfig.json` too: `@Validations` and `@ListensTo` work with
   standard decorators (TypeScript 5+ without `experimentalDecorators`) and with legacy ones
   (`"experimentalDecorators": true`), and need neither `emitDecoratorMetadata` nor
   `reflect-metadata`; a project on an older TypeScript without `experimentalDecorators` cannot
   compile them: stop and tell the user. These are **never assumed**; when one is not in the
   request nor in the code, **ask** before writing anything:
   - the bounded context a class belongs to, and whether it is a new one;
   - an invariant, a business rule, a limit or the states of an aggregate and their transitions;
   - who may do an action (actor and role);
   - the name of an aggregate, a business action, an event or a business error (the ubiquitous
     language is the user's), and the language of the names in a project with no code yet;
   - which events cross to another context and what they carry;
   - the persistence technology of an aggregate or a read model;
   - a use case that would save more than one aggregate.
2. **Read `where-each-class-goes.md`** (layers, imports, folders, names, where each exception is
   thrown, the mistakes of structure). Only for a design decision (boundaries, what goes in one
   aggregate, events between contexts, read models) also read the matching `GUIA.md` of the suite
   (table "The DDD guide suite").
3. **Write a short design and show it**: the aggregates with their value objects and invariants,
   each use case (user or reaction) with the aggregate it saves, the events (name, fields, who
   hears them), the read models and their queries, the repositories and adapters, the files to
   write with their paths, and what you assumed. **Stop and wait for the user's approval** when
   the design holds anything of the list of step 1 that the user did not state, or when it adds a
   context or an aggregate; continue without waiting only when everything in it comes from the
   request or from the code. A use case that must save more than one aggregate needs a decision
   record (`NNNN-<title>.md` in the project's decision records folder) before the code.
4. **Generate in the order of the table "Package guides"** (below), row by row, one class per
   file, at the path and with the name `where-each-class-goes.md` gives, copying the shape of the
   "Code" of the guide of each row. Skip the rows the request does not touch, and open each guide
   only when you reach its row. Tests (row 10) go where the project's specs live ("Existing
   projects"). The summary under "Rules" is never
   enough to write a class: the shape comes from the guide of its row.
5. **Pass every gate before finishing.** Run them in this order, from the project root, with the
   project's own tools, and fix what fails in the files you wrote or changed. When a fix changes a
   file, start again from gate 1: the step ends only with one whole pass, first gate to last, in
   which nothing had to be fixed. A failure that was already there in a file the request does not
   touch is not yours to fix ("Existing projects"): leave the file as it is and report the failure
   with its count. Never silence a failure (a cast, `any`, `@ts-ignore`, a disabled lint rule, a
   skipped or deleted test, a loosened assertion, a changed tool configuration). Never install
   anything: `npx` always with `--no-install`; a gate whose tool is missing is reported as
   **not run** with the reason, never as passed.
   1. **Types**: `npx --no-install tsc --noEmit -p <tsconfig>` with every tsconfig of the project
      that includes a file you wrote or changed, specs included (a project with `tsconfig.app.json`
      and `tsconfig.spec.json` runs both; one that has a type-check script runs that script). It
      passes with no error in a file you wrote or changed and no error elsewhere that names
      something you changed. Errors in files you did not touch that name nothing you changed were
      already there: report their count. A file you wrote that no tsconfig includes fails the
      gate: report it, never edit a tsconfig on your own.
   2. **Format**: the project's formatter, whichever it is (its format script, or the formatter
      it has installed and configured: `npx --no-install prettier --write <files>` for Prettier),
      over the files you wrote or changed. A project with no formatter: not run.
   3. **Lint**: the project's linter (its lint script, or `npx --no-install eslint <files>` for
      ESLint) over the files you wrote or changed: no error and no warning in them. A project with
      no linter: not run.
   4. **Tests**: run, with the project's test runner, the specs you wrote or changed and the specs
      of every file you changed (`npx --no-install vitest run <files>` with Vitest). All pass, and
      the runner ran as many spec files as you passed: a spec the runner does not collect fails
      the gate. A spec that needs something the session cannot start (a real browser, a database)
      is reported as not run, naming the command the user runs.
   5. **Scanner**: run the suite's scanner (Python 3) over the contexts root and read each finding
      in a file you wrote or changed: fix it, or explain in the report why it is not a defect
      (its findings are hints).

      ```bash
      python3 -I "<package folder>/ddd-skills/ddd-auditoria-refactorizacion/scripts/scan_ddd_smells.py" <contexts root>
      ```

      Where the interpreter is called `python`, use that name.

   6. **Dependencies**: the rules of the suite's
      `ddd-skills/ddd-arquitectura/assets/dependency-cruiser.cjs` run over the contexts root. When
      the project has dependency-cruiser, run it with that file, passing the contexts root both as
      `DDD_CONTEXTS_ROOT` (the rules match no file of another root without it) and as the folder
      to read (`DDD_TSCONFIG=<file>` when the tsconfig is not `tsconfig.json`):

      ```bash
      DDD_CONTEXTS_ROOT=<contexts root> npx --no-install depcruise <contexts root> --config "<package folder>/ddd-skills/ddd-arquitectura/assets/dependency-cruiser.cjs"
      ```

      In PowerShell set the variable on its own line first
      (`$env:DDD_CONTEXTS_ROOT = '<contexts root>'`) and then run the command without it.

      It passes with no violation and more than zero modules read; a run that read no module is
      not run. The project's own dependency-cruiser configuration runs too when it has one, never
      instead of this file: it need not hold these rules. Without dependency-cruiser, check by
      hand the imports of every file you wrote against the import matrix of
      `where-each-class-goes.md` and report the gate as checked by hand.

   7. **Mistakes**: go through the "What not to do" of `where-each-class-goes.md` and of every
      guide you read in step 4, item by item, against the generated files and fix what fails:
      layer and imports of each file, names, the package tool used for each need (table "Package
      tools for each need"), no own base classes nor invented API.

6. **Report**: the files written; the result of each gate of step 5 as it happened (the command,
   passed / failed / not run and why, and the numbers the tool printed: errors, tests passed and
   failed, findings); the failures that were already there, with their count; the design
   decisions (with the path of every decision record written); what you assumed; the violations
   of the standard met in existing code; and the questions still open. Write it in the language
   the user writes in; the scanner and the suite write in Spanish, so quote their rule names as
   they are. Never write that the code follows the standard when a gate failed or did not run.

## Reviewing code

For a request to review, audit or check code built on the package (nothing is changed unless the
user asks for the fixes):

1. Read `where-each-class-goes.md`, then only the guide of each kind of class under review (table
   "Package guides"). For a whole context, a migration or code that does not use the package yet,
   also read `ddd-auditoria-refactorizacion` of the suite and follow its checklist.
2. Run the gates 1, 3, 4, 5 and 6 of "Generating code" over the code under review (the linter
   without its fix option), without changing any file.
3. Check every file against the "What not to do" of `where-each-class-goes.md` and of the guide
   of its kind of class, and against the table "Package tools for each need" (a hand-written
   replacement of a package tool is a finding).
4. Report the findings, most severe first, each with: file and line, the rule it breaks (guide and
   section), why it matters and the concrete fix. Three grades: **breaks the model** (a wrong
   invariant, a lost event, two aggregates saved in one use case with no decision record in the
   project's decision records folder, a use case calling another, a
   layer importing outward), **breaks the standard** (folder, name, shape, a package tool not
   used) and **suggestion**. Then the result of each gate as it happened, and what could not be
   checked. Confirm every scanner finding by reading the code before reporting it.

## Rules

These are the rules no request may break. They are a reminder, **not enough to write code**: every
rule is developed, with its reason, the code to copy and its mistakes, in the guide of its kind of
class (table "Package guides"), which you read before writing that kind of class.

### DDD rules (from the books)

Their source, with the book of each one, is `ddd-skills/ddd-orquestador/references/chuleta-reglas.md`.

- **Bounded context** = one ubiquitous language; code names come from it. Split by language, never
  by technology or team [IDDD ch. 1, 2, 9].
- **Integration**: consumers depend on the published event, never on the producer's classes;
  at-least-once delivery, idempotent receivers [Distilled ch. 4; IDDD ch. 13].
- **Domain free of technology**, dependencies pointing inward; application services hold no
  business rules; the model is never exposed through an entry point [IDDD ch. 4, 14].
- **Value objects** are immutable and equal by value; **entities** have a stable identity assigned
  early, business behavior and no setters [IDDD ch. 5, 6].
- **Aggregates** are small, hold only true invariants and refer to other aggregates by id; one
  transaction changes one aggregate; nothing is injected into them [IDDD ch. 10].
- **Domain events** are past-tense facts; a fact from another context is never refused, it is
  recorded or compensated [Distilled ch. 6; IDDD ch. 8].
- **Repository**: one per aggregate, declared in the domain, collection-like [IDDD ch. 12].

### Package rules

`[Fuera de los libros: convención de @archi-code/ddd]` marks, here and in the guides, where the
package leaves the books (the literal Spanish text of the suite on purpose, so one search finds
every divergence in both).

- **Only the package's base classes and tools** (table "Package tools for each need"): never your
  own `ValueObject`, `Entity`, `AggregateRoot`, `DomainEvent`, event bus port nor mapper, and never
  API you have not read.
- **Layers**: `domain` imports only `@archi-code/ddd/domain`, `@archi-code/validation`, its own
  domain and `shared-kernel/`; `application` adds `@archi-code/ddd/application`; only
  `infrastructure` and `composition.ts` import `@archi-code/ddd/infrastructure`. There is no root
  import.
- **Contexts never import each other**: data crosses only as events, each context with its own
  copy of every foreign event it hears.
- **All state is value objects, always valid**: rules in `@Validations`, built in `toCommand` with
  `ValueObjectBuilder` so every field is reported; no primitive fields in an aggregate.
- **The aggregate decides and converts itself**: `static create`, business methods,
  `fromPrimitives`/`toPrimitives` with a round-trip test; no setters, no repository, no logger, no
  `new Date()`.
- **One use case = one business action = one aggregate saved once.** A use case never uses another
  use case; shared logic is an aggregate method or a domain service; a follow-up action is a
  reaction to an event.
- **Only use cases execute domain services**, inside `handle`, holding in their constructor the
  repository or port the service needs. An aggregate never calls, instantiates nor receives a
  domain service, and neither does another domain service; a domain service may create, modify and save aggregates (with the abstract repository the use case passes to it), and never publishes.
- **A domain service is always a concrete class with business logic**: never an abstract class
  nor an interface for infrastructure to implement, and nothing in `infrastructure` implements or
  extends one; infrastructure implements only repositories, domain ports, stores and channels.
- **A reaction use case** is one `EventListener` with `@ListensTo` and an explicit `consumer`:
  idempotent, never throws business errors, no authorization.
- **Repositories only get, search and persist**: one abstract class per aggregate in the domain,
  one adapter per technology, which owns the transaction and the version check.
- **Entry points** call one use case or query port and map errors only through the protocol
  helper over `ExceptionClassifier`; **`composition.ts`** alone builds and subscribes.
- **Events** are DTOs of `readonly` primitives; **time** only through `CreatedAt.now()` /
  `UpdatedAt.now()`; **logging** only through the `Logger` port, never in the domain.

## Package guides

In `ddd-skills/archi-code-ddd/` (located as above). They are part of this skill. Each guide of a
kind of class (rows 1 to 10) has the same three sections: `Rules` (with the reason and the book),
`Code` (the shape to copy) and `What not to do` (the mistakes to check before finishing and in
audits). `where-each-class-goes.md` holds the rules every change shares and its own
`What not to do`; `imports.md` is only a lookup of which entry point exports each name. Read a
guide only when the request writes, changes or reviews that kind of class.

The numbered rows are also the order in which step 4 generates code.

| #   | You write or review                                                                                                                                                                         | Read                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| —   | Anything (once per request): layers, imports, folders, names, where each exception is thrown                                                                                                | `where-each-class-goes.md`                                                                                       |
| 1   | Shared kernel types (money in `shared-kernel/money/`), value objects, ids, references, enums, lists, JSON, `Composite`                                                                      | `value-objects.md`                                                                                               |
| 2   | Domain events, business errors                                                                                                                                                              | `events-and-errors.md`                                                                                           |
| 3   | Child entities, `New<Child>` shapes, outcome enums, the aggregate, `fromPrimitives`/`toPrimitives`, time                                                                                    | `aggregates.md`                                                                                                  |
| 4   | The abstract repository; domain ports, domain services, specifications, logic two use cases share                                                                                           | `repositories.md` (only `Rules` and `Abstract repository`), `domain-services.md` (only when the request has one) |
| 5   | User use cases with their `Input`, `Command` and data types (and the rules every use case follows)                                                                                          | `use-cases.md`                                                                                                   |
| 6   | Copies of foreign events, reaction use cases, external side effects                                                                                                                         | `reactions.md` (and the `Rules` of `use-cases.md` when row 5 did not read it)                                    |
| 7   | Read models: row, store, query port, projection, one reaction per event                                                                                                                     | `read-models.md`                                                                                                 |
| 8   | Adapters: one repository per technology (memory, IndexedDB, …), port adapters, read-model stores; `search` with a `Criteria`, schemas for request input, URL text                           | `repositories.md` (`Adapters`), `criteria.md` (only for `search`)                                                |
| 9   | `composition.ts`, the top-level start file, event bus and channels, the protocol helper, controllers, logs                                                                                  | `composition-and-entry-points.md`                                                                                |
| 10  | Tests: round trip and behavior of every aggregate, every use case with its refusals, every reaction delivered twice, domain services with stubs, one repository contract every adapter runs | `tests.md`                                                                                                       |
| —   | Which entry point exports each class, function and type (when writing imports and unsure)                                                                                                   | `imports.md`                                                                                                     |

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
- **Reviews and audits** follow "Reviewing code" above.

## Related skills

Use them together with this one when they are installed:

- `archi-code-validation`: the validators, their options and `@Validations` rules.
- `archi-code-criteria-adapters`: runs a `Criteria` in memory or turns it into a MongoDB or
  IndexedDB query, for the `search` of repository adapters.

When one is not installed, read the `README.md` of its package instead
(`node_modules/@archi-code/validation/`, `node_modules/@archi-code/criteria-adapters/`); when the
package itself is missing, stop and ask the user to install it, as for this one.
