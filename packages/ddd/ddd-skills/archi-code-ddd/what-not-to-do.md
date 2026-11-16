# What not to do

Part of the `archi-code-ddd` skill: read it only when that skill routes here. The audit
checklist: every rule of `layers.md` and `where-each-class-goes.md`, plus these mistakes seen most
often. One line each; the rule is in `layers.md`.

## Structure

- A class in the wrong layer; domain importing `/application` or `/infrastructure`; importing
  another context (only `shared-kernel/`), a folder, an `index.ts` or `composition.ts`.
- Pattern-named folders (`use-cases/`, `listeners/`, `dtos/`) instead of one per business action.
- Invented API (`findOrFail`, `saveAndPublish`, `setNow()`, `addItem()`, generic `ValueObject`)
  or own base classes (`AggregateRoot.ts`, `DomainEvent.ts`, `EventPublisher`).

## Domain

- VOs built one by one with `new` in `toCommand`, or from raw input in `handle`.
- Raw `boolean`/`Date`/`string` state in an aggregate; a computed getter; a private field missing
  from `toPrimitives()`; no round-trip test.
- Private constructor, or one that checks, defaults or records; id generated inside `create`.
- A user command silently ignoring an invalid state; a reaction method throwing.
- `new Date()`/`Date.now()` in domain or application; logging in the domain.
- Events with VOs, `Date`s, the whole state, `aggregateId` or a union type; importing the
  producer's event class; two copies of one foreign event in a context.

## Application

- A use case using another use case, a listener calling a `UseCase`, a base use case.
- A domain service injected or built in `composition.ts`, typed with an adapter, or only wrapping
  a port call.
- `if (aggregate.isX())` in `handle` to choose the action.
- Two aggregates saved without a decision record; CRUD names; a query use case (`FindCourse`).
- Retrying a relative change on `ConcurrencyException`; publishing before `save`.
- An external effect before `save`; an idempotency key reused across attempts or effects.
- Uniqueness checked with `search` before `create`.
- A reaction that authorizes, throws, catches or creates without checking the derived id.
- A read-model row with one overwritten `status`; a projection not skipping applied `eventId`s.

## Infrastructure and entry points

- An `interface` repository, extra or business-named verbs, `nextId()`, role intersections.
- No version check, missing `version + 1`, remove by id; in-memory without `structuredClone`.
- IndexedDB: raw `indexedDB`, `withStore` for CRUD, version check and write in separate
  transactions, non-`tx` awaits inside one.
- A domain port implemented by a repository or read-model store.
- A controller that catches, maps statuses or converts values; `ExceptionClassifier` outside the
  protocol helper; an `Internal` message sent to the client.
