# What not to do

Part of the `archi-code-ddd` skill: read it only when that skill routes here. One line per
mistake; the rule is in `layers.md`. Also the checklist of every audit.

## Layers and structure

- A class in the wrong layer (repository implementation or bus in the domain, rules in an adapter
  or controller); domain importing `/application` or `/infrastructure`; a use case importing
  `/infrastructure`.
- Importing another context (anything but `shared-kernel/`).
- `ExceptionClassifier` outside the protocol helper.
- Importing through a folder or `index.ts`, or mixing values and types in one statement.
- An exception or repository contract imported from the wrong subpath; a root `@archi-code/ddd`
  import.
- Pattern-named folders (`use-cases/`, `listeners/`, `dtos/`) instead of one per business action.
- Input data types (`MoneyData`) in `domain/` or shared between contexts.
- Entry points importing repositories or adapters; building classes outside `composition.ts`, or
  importing `composition.ts`.
- Invented API (`findOrFail`, `saveAndPublish`, `setNow()`, `addItem()`/`setItem()`/`removeItem()`,
  `toPrimitives()` in the base classes, generic `ValueObject`) or
  own base classes (`AggregateRoot.ts`, `DomainEvent.ts`, `EventPublisher`).

## Value objects

- `Required(StringType)` as a property type, or two VOs in one file.
- `ensure…()`, `assertValid()`, catching `ValidationException` to keep an invalid value, or
  building one by hand from `validate()` results.
- VOs built one by one with `new` in `toCommand`/reactions instead of `ValueObjectBuilder.build`;
  VOs built from raw input in `handle`; raw strings passed to aggregates.
- VO rules moved to the controller or request schema.
- A misnamed or split enum; another context's id class as a reference; an unbranded id
  (`extends IdType {}`), an optional VO as id, nil/max UUIDs.
- Mutating a VO; comparing with `===`; `toString` without `()`; zone-less date-times; `JsonType`
  with `{}` or an array; unconverted values with their static type (`new NumberType('1.5')`).
- Loose fields, `JsonType` or a child entity where a `Composite` belongs; JSON ↔ composite swaps.
- `ArrayType` of composites; `Required(Composite(...))`; unnamed field classes; mutating or adding
  state to a composite.
- A computed getter on an aggregate, entity or composite; `@Validations` imported from `/domain`.
- Own slug/whitespace regex; cleaning text outside the VO's `filter`; a slug as id, or a lookup by
  slug without a unique index; expecting `slug()` to keep the sign, other scripts or ordinals.

## Aggregates and entities

- Private constructor, or one that checks, defaults or records events.
- Id generated or derived inside `create`.
- A factory other than `create`, or `create` skipping invariants or recording another event.
- Raw state (`boolean`, `Date`, `string` fields); `_id` + `get id()` instead of `super(id)`.
- Private field without getter or missing from `toPrimitives()`; no round-trip test.
- `toPrimitives` returning VOs; `fromPrimitives` recording events or checking invariants.
- A user-requested method silently ignoring an invalid state; a reaction method throwing.
- Half-changed state left after a broken invariant.
- A service or repository in the aggregate constructor; actor-only authorization or a `version`
  field in the aggregate.
- Child entity as plain class, with setters, events, `create`, own conversion, or called from
  outside its root.
- Calling `record()` from outside the aggregate, or forgetting `super(...)`.
- A Specification that loads data, has a generic name, or guards an invariant.
- `new Date()`/`Date.now()` for the current time in domain or application; logging in the domain.

## Events

- Missing `DomainEvent` suffix or wrong `eventName` format.
- `OrderUpdated` with the whole state, present tense, VOs, `Date`s, `undefined`, class instances,
  `toPrimitives()`, unneeded personal data.
- Interfaces or type aliases in an event file, positional constructor parameters.
- `aggregateId`, schema version, `eventName` as method or instance field, methods on events;
  creating an event outside its aggregate; setting `eventId`/`occurredOn` yourself.
- A union type of an aggregate's events, or an event type parameter on bus/registry/root.
- A registry factory not passing `eventId` and `occurredOn`; registering an event twice;
  subscribing to an unregistered event.
- Importing the producer's event class, or one copy shared by two reactions; incompatible change
  under the same `eventName`; a second bus instead of an `EventChannel`.

## Use cases and reactions

- A use case that instantiates, receives, imports, extends or calls another use case or reaction;
  a base use case with helpers.
- A listener calling a `UseCase`, or a `UseCase` next to a listener for the same reaction.
- A domain service injected into a use case or reaction, or built in `composition.ts`.
- A domain service that instantiates or types its dependency as a repository implementation or
  adapter, or imports `/infrastructure`.
- A domain service where an aggregate method, VO method, `Specification` or the use case belongs;
  `…Manager`/`…Helper`/`…Utils`.
- A domain service receiving a repository when the use case already holds the aggregates, or
  throwing `AggregateNotFoundException`.
- A use case that branches on the aggregate's state to choose an action (`if (course.isDraft())`
  → remove, else archive): one aggregate method decides.
- A multi-aggregate decision written only as a code comment instead of a decision record.
- A use case doing several things or saving several aggregates without a written decision; CRUD
  or technical names; `Input`/`Command` in another file, or a command class.
- Unused dependencies, or a repository typed with role intersections.
- A reaction without `@ListensTo`, with two events, or a consumer not
  `'<context>.<file name>'` (from `this.name`, shared, renamed).
- A reaction that authorizes, throws `AggregateNotFoundException`/business errors, catches or
  retries; creates without checking the derived id.
- Subscribing reactions by name or calling them from a use case; publishing before saving or
  without `pullDomainEvents()`; catching to rethrow as `ApplicationException`.
- Retrying `ConcurrencyException` with the same aggregate, without limit, or when not repeat-safe
  (a relative change such as a 10% discount never retries: it may apply twice).
- Transactions, units of work or connections in use cases, reactions or the domain; changing the
  use case to avoid losing events (that is the repository's outbox).
- Returning an aggregate; a query use case; a projection not skipping applied `eventId`s; a read
  model loading aggregates.
- A read-model row with one overwritten `status` that a late or repeated event can turn back (a
  late `course.published` reopening an archived course); a creation reaction resetting a status.
- A read-model reaction storing raw event fields without building value objects.
- A domain port implemented by a repository or a read-model store instead of its own adapter.

## Repositories and adapters

- No abstract class in the domain, an `interface` repository, or one not extending
  `AggregateRepository` and implementing each verb's role.
- Verbs the business does not need, verbs other than `findById`/`search`/`save`/`remove`, code in
  the abstract repository.
- Business-named methods (`pendingOlderThan`), `nextId()`, events, DTO returns.
- `AggregateNotFoundException` from the domain or a repository; rows built by hand; a constructor
  receiving an aggregate class or mapper; a generic repository for several aggregates.
- Database code outside the repository adapter, or two adapters per aggregate and technology.
- An IndexedDB repository using raw `indexedDB`/`IDBDatabase`, another library, version/upgrade
  handling, or `withStore` for CRUD.
- IndexedDB version check and write in separate transactions, or non-`tx` awaits inside one.
- No version check, missing `version + 1`, remove by id, or version exposed to domain/application.
- In-memory repository not cloning with `structuredClone`.
- A port adapter throwing a business error; wrapping without `{ cause }`.

## Entry points and logging

- A controller that catches errors, maps statuses, checks values or holds rules.
- `instanceof` chains to classify; choosing a status from `error.code` anywhere but the helper's
  code table;
  sending an `Internal` message to the client.
- A logging library in a use case instead of the `Logger` port; logging and rethrowing in every
  layer; data interpolated into messages; secrets or unneeded personal data logged.
