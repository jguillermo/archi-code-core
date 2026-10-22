# @archi-code/ddd

Domain-Driven Design building blocks for TypeScript, one entry point per layer:

| Entry point                      | Layer          | What it gives you                                                                                                                                                                                             |
| -------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@archi-code/ddd/exceptions`     | Shared         | Exceptions of every layer with codes, causes and `instanceof` across builds, and `ExceptionClassifier`, which tells any entry point the `ExceptionKind` of an error                                           |
| `@archi-code/ddd/domain`         | Domain         | Value objects, `Required(...)`, `Composite(...)`, `Immutable`, `Entity`, `AggregateRoot`, `EventBase`, `Specification` and the repository contracts (`AggregateFinder`, `AggregateSaver`, `AggregateRemover`) |
| `@archi-code/ddd/application`    | Application    | `UseCase`, the event contract (`EventListener`, `@ListensTo` to listen, `EventBus` to publish) and the ports `Clock` and `Logger`                                                                             |
| `@archi-code/ddd/infrastructure` | Infrastructure | The event wiring (`DomainEventBus`, `EventRegistry`, the `EventChannel` port, `InMemoryEventChannel`), clocks, loggers                                                                                        |

The layers only depend inwards: `exceptions` imports nothing, `domain` imports only `exceptions`,
`application` imports `domain` and `exceptions`, and `infrastructure` imports all three. The
exceptions are a module of their own because every layer throws them: a use case wraps unknown
errors in an infrastructure exception, a use case throws `AggregateNotFoundException`. Import each file of your project from the layer it
belongs to and the same rule holds in your code (see [Architecture rules](#architecture-rules)). Conversions and validations come from
[`@archi-code/validation`](https://www.npmjs.com/package/@archi-code/validation). The package is
published with CJS and ESM builds.

## Installation

```bash
npm install @archi-code/ddd
```

- Node.js `>=24` (`engines` field).
- Runtime dependencies, installed by npm automatically: `@archi-code/validation` and `uuid`.
- To declare validations with `@Validations`, also install `@archi-code/validation` as a direct
  dependency of your project (the decorator is imported from it):

  ```bash
  npm install @archi-code/validation
  ```

### TypeScript decorators

`@Validations` and `@ListensTo` work with both TypeScript decorator modes:

- **Standard** (TypeScript 5+ without `experimentalDecorators`): no configuration needed.
- **Legacy**: `"experimentalDecorators": true` in `tsconfig.json`.

It does not need `emitDecoratorMetadata` or `reflect-metadata`. If you declare no validations, no
decorator setting is needed at all.

## Import

There is no root entry point: import from the layer.

```ts
// ESM
import { AggregateRoot, EventBase, IdType, Required, StringType } from '@archi-code/ddd/domain';
import { DomainException, ExceptionClassifier, ExceptionCode } from '@archi-code/ddd/exceptions';
import type { AggregateSaver } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, UseCase } from '@archi-code/ddd/application';
import type { EventBus } from '@archi-code/ddd/application';
```

```js
// CommonJS
const { AggregateRoot, IdType } = require('@archi-code/ddd/domain');
const { UseCase } = require('@archi-code/ddd/application');
```

Types (`PrimitiveTypes`, `EventMetadata`, `AggregateSaver`…) are imported with `import type`. The
subpaths also resolve with `"moduleResolution": "node"` (through `typesVersions`).

Both builds can be loaded in the same process (for example a CommonJS application that uses an ESM
library built on this package): the exceptions of one build are `instanceof` the classes of the other
(see [Exceptions](#exceptions-archi-codedddexceptions)).

## Architecture rules

Every class of a project built on this package goes in exactly one layer. The table says where,
what it may import and what it must never do; the package itself is organized the same way.

| Class                                                                          | Layer          | Responsibility                                                                                     | May depend on                                                            | Never                                                                        |
| ------------------------------------------------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Value object (`extends StringType`…)                                           | domain         | One concept of the business; converts and validates its own value                                  | other value objects, `@archi-code/validation`, exceptions                | mutate, know about storage or transport                                      |
| Aggregate (`extends AggregateRoot`)                                            | domain         | Business rules and invariants; records an event for every fact                                     | its value objects, child entities, events, domain services, domain ports | read a repository, publish events, use `new Date()`                          |
| Composite value object (`Composite({...})`)                                    | domain         | Several values that only make sense together (money, a date range, an order line)                  | value objects, other composites                                          | change, hold an id, be loaded or saved on its own                            |
| Child entity (`extends Entity`)                                                | domain         | A part of an aggregate with its own id; value objects and business methods only the root calls     | value objects                                                            | setters, be called from outside its aggregate, be loaded or saved on its own |
| Specification (`extends Specification`)                                        | domain         | A named business rule that validates, selects or builds; combinable                                | value objects, aggregates, data already loaded                           | read a repository, protect an aggregate invariant                            |
| Domain event (`extends EventBase`)                                             | domain         | A fact that happened, named in the past (`OrderPlaced`, `'OrderPlaced'`), with primitive data      | value objects (to take its primitives from them)                         | carry behavior or value objects, reference infrastructure                    |
| Repository contract (`AggregateFinder`…)                                       | domain         | Only gets and persists aggregates, one role per interface; no business logic                       | the aggregate                                                            | be implemented in the domain, hold rules, answer business queries            |
| Domain service                                                                 | domain         | A business rule that spans several aggregates or fits none                                         | aggregates, value objects, `AggregateFinder` (to read), domain ports     | I/O, saving, transactions, publishing                                        |
| Domain port (`ProductPricing`)                                                 | domain         | What the model needs from another context or an external service, in its own words                 | value objects of this context                                            | contain code, expose the other system's model                                |
| Use case (`extends UseCase`)                                                   | application    | One business action: input → command of value objects → change one aggregate                       | domain, application ports, exceptions                                    | import another use case or a listener, persist or call the network by itself |
| Listener (`extends EventListener`)                                             | application    | What happens after an event: turns it into the input of one use case; lives next to that use case  | one use case (by constructor), the event                                 | hold business rules, save aggregates, call several use cases                 |
| Application port (`EventBus`, `Clock`, `Logger`, your own such as `Warehouse`) | application    | A technical capability the application needs, as a type                                            | domain types                                                             | contain code                                                                 |
| Read query (`OrderSummaries`)                                                  | application    | An interface that answers a screen or a list with DTOs or ids, outside the aggregates              | domain types, DTOs                                                       | load aggregates, go through a repository, change data                        |
| Adapter (repository, outbox, read query, clock…)                               | infrastructure | Implements a contract with a database, a queue, a broker, HTTP or memory                           | domain, application, exceptions, drivers                                 | contain business rules                                                       |
| Anti-corruption layer (adapter + translator)                                   | infrastructure | Implements a domain port by calling another context or service and translating its model into ours | domain, application, exceptions, clients                                 | leak the other model into the domain, hold business rules                    |
| Entry point (controller, message consumer, CLI)                                | interfaces     | Turns HTTP, a message or a command line into the input of a use case, and back                     | application, exceptions (domain types only if unavoidable)               | hold business rules, use a repository or another adapter directly            |
| Composition root (`composition.ts`)                                            | (per context)  | Reads the configuration, builds adapters, use cases and entry points                               | everything                                                               | be imported by the domain, the application or the interfaces                 |

Dependencies only point inwards. Your domain imports only `@archi-code/ddd/domain`,
`@archi-code/ddd/exceptions` and `@archi-code/validation`; the application adds
`@archi-code/ddd/application`; infrastructure implements the contracts of both; and `interfaces`
(controllers, consumers) only calls the application. The application never imports
infrastructure, the domain never imports the application, and an entry point never reaches a
repository or an adapter: only the composition root knows every piece [IDDD ch. 4]. An entry
point imports nothing from infrastructure. A controller validates only the shape of the request,
maps the use case result (an id, a DTO or nothing) to the response and the errors with
`ExceptionClassifier` (see [Translating errors at an entry point](#translating-errors-at-an-entry-point));
it never returns an aggregate.

### Folder structure

One folder per bounded context; inside it the four zones, and inside each zone **modules named
after the ubiquitous language**, never after patterns (`order/`, not `entities/`, `events/`,
`valueobjects/`) [IDDD ch. 9]:

```
src/
  contexts/
    sales/
      domain/
        order/              Order.ts, OrderLine.ts, OrderId.ts, events.ts, OrderStatus.ts
        customer/           CustomerId.ts
        catalog/            ProductPricing.ts (domain port to the catalog context)
        shared/             Money.ts (shared inside this context only)
      application/
        place-order/        PlaceOrder.ts
        ship-order/         ShipOrder.ts
        notify-customer/    NotifyCustomer.ts, NotifyCustomerOnOrderShipped.ts
        order-summaries/    OrderSummaries.ts (read query: interface + DTOs)
      infrastructure/
        persistence/        MongoOrderRepository.ts, MongoOrderSummaries.ts
        messaging/          RabbitMqEventChannel.ts
        catalog/            CatalogHttpProductPricing.ts, CatalogTranslator.ts (anti-corruption layer)
      interfaces/
        http/               ordersRouter.ts
        messaging/          StockReservedConsumer.ts
      composition.ts        composition root of the context
    warehouse/
    shared-kernel/          optional: the few types two contexts agree to share and change together
  main.ts
test/                       mirrors src/
```

- A listener lives in the module of the use case it runs (`notify-customer/`), not in a
  `listeners/` folder.
- A context never imports another one: they integrate through published events, an API or an
  agreed shared kernel (`shared-kernel/`, kept small, changed only by agreement of both teams).
- Check the direction of the imports in CI with dependency-cruiser. The DDD suite shipped with the
  package has a ready configuration to start from:
  `node_modules/@archi-code/ddd/ddd-skills/ddd-arquitectura/assets/dependency-cruiser.cjs` (domain
  without npm packages but the allowed ones, no imports from `application`, `infrastructure` or
  `interfaces` into the domain, none from `infrastructure` or `interfaces` into the application, no
  `@archi-code/ddd/infrastructure` in the domain or the application, none from `interfaces` into
  your `infrastructure` nor `@archi-code/ddd/infrastructure`, isolated contexts, no cycles,
  and `tsPreCompilationDeps: true` so type imports count too). Adapt its paths to your layout.
- Environment variables are read only in the composition root and reach the adapters as typed
  configuration; the domain never logs nor reads `process.env`.

### Design rules

- **A use case returns an id, a DTO or nothing**, never an aggregate: the caller must not depend
  on the model [IDDD ch. 4 and 14]. Screens that read several aggregates use a read query or a read
  model, not repositories.
- **Another aggregate is referenced by its id** (`customerId: CustomerId`), never by the object;
  copy into a value object only the little data the aggregate needs [IDDD ch. 10].
- **A command can be refused, a fact cannot** [Destilado ch. 6]: a method that registers something
  that already happened in another aggregate or context (`registerStockReservation`) is idempotent
  and does not throw a business error; if the fact does not fit, it records an event (for example
  `PaymentAuthorizationInsufficient`) so another listener compensates. Business exceptions are for
  commands a user can be told about.
- **Money is never a `NumberType`**: model it as a composite (`Money({ amount: Cents, currency })`)
  with whole minor units, and decide the rounding of every division explicitly.
- **Repositories only get and persist**: `findById`, `save`, `remove`, with no business rule and no
  business query. Ids come from the value object (`OrderId.generate()`), not from the repository.
  Lists and searches for screens are read queries of the application (SQL, a view, a read model),
  outside the repositories.
- **Child entities behave, through their root**: a child entity holds its id and value objects and
  may have business methods named after the language (`seat.relabel(label)`), never setters; only
  its aggregate root calls them (Tell, Don't Ask), and the root keeps the rules that span several
  parts [IDDD ch. 5 and 10] (see [Aggregates and domain events](#aggregates-and-domain-events)).
- **Derived values are methods, never getters** (`order.total()`, not `get total()`), on
  aggregates, child entities and composites alike: a getter becomes a key of `PrimitiveTypes` and
  `toPrimitives()` no longer matches the stored data.
- **Event names**: an event's `eventName` is its class name, a fact in the past tense
  (`'OrderPlaced'`) [IDDD ch. 8]; contracts published to other contexts are
  `'<context>.<module>.<Event>'` (`'sales.order.OrderPlaced'`) [IDDD ch. 13]. An event carries
  primitives taken from value objects (ids as strings, money as `{ amount, currency }`), never value
  objects nor the whole state of the aggregate.

Logic that two use cases share never goes in a use case: a business rule becomes a method of the
aggregate or a domain service, and a technical step becomes a port. Use cases never call each
other: when an action must follow another, the first records an event and a listener runs the
second.

Naming: use cases are a verb and a noun of the business (`PlaceOrder`, `ShipOrder`), never CRUD
or technical names (`UpdateOrder`, `OrderService`); events are facts in the past
(`OrderPlaced`, `PaymentCaptured`); listeners are `<Action>On<Event>`
(`ReserveStockOnOrderPlaced`), where `<Action>` names the use case they run.

# Domain layer: `@archi-code/ddd/domain`

## Value objects

Each value object wraps a value of one type and converts the input when it is constructed:

| Class             | Value     | Accepts                                                                                |
| ----------------- | --------- | -------------------------------------------------------------------------------------- |
| `StringType`      | `string`  | strings, finite numbers and booleans                                                   |
| `NumberType`      | `number`  | finite numbers and decimal strings (`'1.5'`, `' 2 '`, `'1e3'`)                         |
| `BooleanType`     | `boolean` | booleans, `1`/`0` and `'true'`/`'false'`/`'1'`/`'0'` (case-insensitive)                |
| `DateType`        | `Date`    | valid `Date` instances, ISO dates (UTC midnight) and ISO date-times with a zone        |
| `UuidType`        | `string`  | UUID strings, stored in lowercase                                                      |
| `EnumType<T>`     | `T`       | one option of the enum returned by `getEnum()` (abstract)                              |
| `JsonType<T>`     | `T`       | non-empty JSON objects and strings that contain one                                    |
| `ArrayType<Item>` | `Item[]`  | arrays (or strings with a JSON array); each item is built by `createItem()` (abstract) |
| `CreatedAt`       | `Date`    | like `DateType`, required; `CreatedAt.now()`                                           |
| `UpdatedAt`       | `Date`    | like `DateType`, required; `UpdatedAt.now()`                                           |
| `IdType`          | `string`  | like `UuidType`, required, and rejects the nil and max UUIDs                           |

The constructor is typed with the value's type (`new NumberType(1.5)`); `DateType` (and
`CreatedAt`/`UpdatedAt`) also takes ISO text (`Date | string`), because dates travel as text in
JSON and forms. The conversion acts at runtime on data that arrives untyped, such as a JSON body:

```ts
import { BooleanType, DateType, NumberType, StringType } from '@archi-code/ddd/domain';

const body = JSON.parse(
  '{"price":"1.5","code":12,"active":"TRUE","at":"2024-01-31T10:00:00+02:00"}',
);

new NumberType(body.price).value; // 1.5
new StringType(body.code).value; // '12'
new BooleanType(body.active).value; // true
new DateType(body.at).toString(); // '2024-01-31T08:00:00.000Z'
new DateType('2018-03-23').toString(); // '2018-03-23T00:00:00.000Z'
```

A value that cannot be converted throws `TypePrimitiveException`:

```ts
new NumberType('abc' as any);
// TypePrimitiveException: Validation Error: Expected a valid Number, but received "abc".
new NumberType(Infinity);
// TypePrimitiveException: Validation Error: Expected a valid Number, but received Infinity.
new BooleanType('yes' as any);
// TypePrimitiveException: Validation Error: Expected a valid Boolean, but received "yes".
new DateType('31/01/2024');
// TypePrimitiveException: Validation Error: Expected a valid Date, but received "31/01/2024".
new DateType('2024-01-31T10:00:00');
// TypePrimitiveException: Validation Error: Expected a valid Date, but received "2024-01-31T10:00:00".
```

A date-time without a zone is rejected because it does not say which instant it is (local time of
the browser? of the server?). Send it with `Z` or an offset, or send only the date.

### What each value object exposes

| Member          | Type                  | Description                                                                             |
| --------------- | --------------------- | --------------------------------------------------------------------------------------- |
| `value`         | `T \| null` (or `T`)  | The converted value; `T` if the type is required (`Required`)                           |
| `isNull`        | `boolean`             | `true` if there is no value                                                             |
| `toString()`    | `string`              | Text of the value; `''` if it is `null`. `DateType` gives ISO 8601, `JsonType` the JSON |
| `equals(other)` | `boolean`             | Same class and same value (dates by instant, arrays and objects by content)             |
| `validate()`    | `ValidationResult<T>` | Runs the `@Validations` rules again; never throws (always ok on a built value object)   |

```ts
class City extends StringType {}
class Country extends StringType {}

const city = new City('Huelva');
`Shipping to ${city}`; // 'Shipping to Huelva'
JSON.stringify({ city: city.value }); // '{"city":"Huelva"}': write `value`, not the value object
city.equals(new City('Huelva')); // true
city.equals(new Country('Huelva')); // false: another concept, even with the same text
new NumberType().toString(); // ''
new StringType('   ').value; // null (blank strings count as empty)
new StringType(null).isNull; // true
```

### Optional by default, required with `Required(...)`

A value object is optional: it accepts the value, `null` or nothing, and holds `T | null`. Wrap it
with `Required(...)` to make it required: the constructor asks for exactly `T`, `value` is typed as
`T` and an empty value throws `RequiredValueException` on construction.

This is a convention of this package, not of the books: they build every value object with a
value and model an optional one as a field that may be `null` (`reservation: ReservationId | null`)
[IDDD ch. 5 and 6]. Both forms work here; an optional value object never holds an identity (ids
are required, see [Aggregates and domain events](#aggregates-and-domain-events)), and an optional
composite is always a `Money | null` field.

```ts
import { Required, StringType } from '@archi-code/ddd/domain';

class Name extends Required(StringType) {}
class Nickname extends StringType {}

const name: string = new Name('Ana').value; // 'Ana'
const nickname: string | null = new Nickname().value; // null

new Name(null); // type error and, at runtime:
// RequiredValueException: Validation Error: Name is required, but received null.
new Name('  ');
// RequiredValueException: Validation Error: Name is required, but received "  ".
```

`null`, `undefined` and blank strings count as empty in every type. A subclass of a required value
object is also required (`class FullName extends Name {}`). `Required(...)` accepts any subclass of
`AbstractType`, including your own and abstract ones (`Required(StatusType)`, `Required(Tags)`).

`Required(...)` also declares the `isRequired` validation, so the rules of a required type include
it too. Its class is named `Required(<type>)` (`Required(StringType)`), so the messages of a
required value built inline from plain JavaScript still name the type it requires.

### Validations: always valid from the constructor

Validations are declared with `@Validations` from `@archi-code/validation` (that package's `is*`
validators or `custom` validations with their own function). The constructor runs them after the
conversion, so **a value object that exists is valid**: there is no invalid `Email` to pass around,
whether it was built by a use case, an aggregate, `fromPrimitives` or a test. When rules are broken
it throws `ValidationException` with **every** broken rule, each prefixed with the class name. An
optional, empty value object is built without running its rules.

Each entry of `error.errors` is a `ValidationIssue`, `{ field, code, message }`: `field` is the path
of the input (`null` for the value object itself), and `code` says which rule failed so a client
can translate it without parsing the message: the validator name (`'isEmail'`), the name of a
`custom` rule (`'isEven'`), or the code of the exception a value threw (`'DOM003'` for
`TypePrimitiveException`, `'DOM004'` for `RequiredValueException`, `'ORD003'` for your own
`DomainException` with that code).

```ts
import { Validations } from '@archi-code/validation';
import { NumberType, Required, StringType } from '@archi-code/ddd/domain';

@Validations([{ validator: 'isEmail' }])
class Email extends Required(StringType) {}

new Email('ana@example.com').value; // 'ana@example.com'
new Email('x');
// ValidationException: Validation failed, Email: Value does not satisfy isEmail
// error.errors: [{ field: null, code: 'isEmail', message: 'Email: Value does not satisfy isEmail' }]

@Validations([{ validator: 'isLength', properties: { min: 3, max: 20 } }])
class Username extends StringType {}

new Username().value; // null: an optional, empty value runs no rule

@Validations([
  { validator: 'isInt', properties: { min: 0 } },
  { custom: 'isEven', fn: (v) => Number(v) % 2 === 0, message: 'Must be even' },
])
class Quantity extends NumberType {}

new Quantity(-3);
// ValidationException: Validation failed, Quantity: Value does not satisfy isInt, Quantity: Must be even
// error.errors:
// [
//   { field: null, code: 'isInt', message: 'Quantity: Value does not satisfy isInt' },
//   { field: null, code: 'isEven', message: 'Quantity: Must be even' },
// ]
```

A subclass inherits its parent's validations; if it declares the same validation, it replaces it.
Validator names and their `properties` are in the `@archi-code/validation` documentation.
`validate()` runs the rules again and returns a frozen `{ ok, value, errors }` without throwing;
on a value object that was built it is always `ok`.

### Building every value object of an input at once: `ValueObjects.build`

The constructor of each value object stops at its own errors. To report **every field** of an
input (a form, a JSON body, a message) at once, build the value objects with
`ValueObjects.build`: it runs every factory, even after one fails, and throws one
`ValidationException` whose `errors` name the field of each problem. It collects the three ways a
value can be wrong: empty in a required type (`RequiredValueException`), not convertible
(`TypePrimitiveException`) and broken rules (`ValidationException`), plus any other
`DomainException` a factory throws. Any other error is a bug and goes through untouched, and it
wins: the validation errors already collected are dropped, so a bug is never hidden behind a 422.
`ValueObjects.buildList` does the same for a list and names each item by its position, so nested
inputs get paths such as `lines.1.quantity`. Factories are synchronous: a factory that returns a
Promise does not compile in `build`, and both methods refuse it at run time with
`InternalErrorException` (`ValueObjects: the factory of "email" returned a Promise; build value
objects synchronously`), so an asynchronous check never skips the validation. Every field name is
kept as written, `__proto__` included.

```ts
import { IdType, NumberType, Required, StringType, ValueObjects } from '@archi-code/ddd/domain';
import { Validations } from '@archi-code/validation';

// Email as in the previous block; input is the raw request body

class OrderId extends IdType<'OrderId'> {}
class Sku extends Required(StringType) {}

@Validations([
  { validator: 'isInt', properties: { min: 1, max: 20 }, message: 'From 1 to 20 units' },
])
class Quantity extends Required(NumberType) {}

const command = ValueObjects.build({
  orderId: () => new OrderId(input.orderId),
  email: () => new Email(input.email),
  lines: () =>
    ValueObjects.buildList(input.lines, (line) =>
      ValueObjects.build({
        sku: () => new Sku(line.sku),
        quantity: () => new Quantity(line.quantity),
      }),
    ),
});
// command: { orderId: OrderId; email: Email; lines: { sku: Sku; quantity: Quantity }[] }

// with input = { orderId: 'x', email: 'ana', lines: [{ sku: 'TORCH-01', quantity: 2 }, { sku: '', quantity: 0 }] }:
// ValidationException, error.errors:
// [
//   { field: 'orderId', code: 'DOM003', message: 'Validation Error: Expected a valid UUID, but received "x".' },
//   { field: 'email', code: 'isEmail', message: 'Email: Value does not satisfy isEmail' },
//   { field: 'lines.1.sku', code: 'DOM004', message: 'Validation Error: Sku is required, but received "".' },
//   { field: 'lines.1.quantity', code: 'isInt', message: 'Quantity: From 1 to 20 units' },
// ]
```

`ExceptionClassifier` classifies it as `ExceptionKind.Invalid` (a 422 in HTTP) and the entry point
returns the same `errors`, so a client can mark each input. To report a problem of your own in the same shape, throw
`new ValidationException([{ field: 'deliveryDate', code: 'ORD003', message: '…' }])`; `code` is
optional and defaults to `'DOM001'`.

### Which layer validates what

The input that reaches a use case is not validated yet, and that is on purpose: every adapter
(HTTP, a queue, a CLI, a test) goes through the use case, so the rules live in one place.

| What                                                      | Where                                                                       |
| --------------------------------------------------------- | --------------------------------------------------------------------------- |
| The shape of the request (it parses, a field is a string) | The input adapter (controller, consumer); no business rule                  |
| One value: required, convertible, its rules               | The value object's constructor, through `ValueObjects.build` in `toCommand` |
| Rules over several values of one aggregate (invariants)   | The aggregate's methods, with a `DomainException`                           |
| Rules over several aggregates                             | A domain service                                                            |
| Whether the caller may run the action                     | The use case (application)                                                  |

Do not repeat a value object's rule in the request schema: the adapter checks that the email is a
string, `Email` checks that it is an email. Invariants run after the fields are valid, because they
need valid value objects to be evaluated.

### Immutability

A value object never changes after construction (`_value` is `readonly`); to change it, build a new
one:

- `DateType` (and `CreatedAt`/`UpdatedAt`) holds a date whose setters throw:

  ```ts
  new DateType(new Date('2024-01-31T10:00:00Z')).value!.setFullYear(2000);
  // TypeError: Cannot call setFullYear: the date is immutable
  ```

- `JsonType` and `ArrayType` hold deeply frozen copies (`Object.isFrozen(vo.value)` is `true`).
- `ArrayType.withItem()` and `withoutItem()` return a **new** instance and leave the original
  untouched, so a value object shared by two aggregates never changes under one of them.
- To touch an `UpdatedAt`, replace it: `this._updatedAt = UpdatedAt.now()`.
- The same helpers are exported for your own value objects: `Immutable.freeze(value)` deep-freezes
  an object or array and returns it, and `Immutable.date(date)` returns a copy of a `Date` whose
  setters throw.

### `UuidType` and `IdType`

```ts
import { IdType, UuidType } from '@archi-code/ddd/domain';

UuidType.random(); // random UUID v4
UuidType.fromValue('ana@example.com'); // '4badeee4-791f-51e2-a027-2c59bc6f8144' (v5, deterministic)
UuidType.fromValue('ana@example.com', '6ba7b811-9dad-11d1-80b4-00c04fd430c8'); // v5 with another namespace

new UuidType('abc');
// TypePrimitiveException: Validation Error: Expected a valid UUID, but received "abc".

const id = new IdType(IdType.random()); // required
const orderId = OrderId.generate(); // class OrderId extends IdType<'OrderId'> {}: a new OrderId with a random id
new IdType('9B2F6C1E-4D3A-4F8B-A1C2-3E4D5F6A7B8C').value; // '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c'
new IdType('00000000-0000-0000-0000-000000000000');
// TypePrimitiveException: Validation Error: Expected a valid Id, but received "00000000-0000-0000-0000-000000000000".
```

`fromValue(value, namespace?)` uses the DNS namespace by default
(`6ba7b810-9dad-11d1-80b4-00c04fd430c8`). Both types store the UUID in lowercase, so an id typed in
capitals equals the stored one. `generate()` builds a value object of the class you call it on
(`OrderId.generate()` is an `OrderId`).

`IdType<Brand>` takes the class name as a type-only brand, so the compiler tells ids of different
aggregates apart even though they have the same shape:

```ts
class OrderId extends IdType<'OrderId'> {}
class CustomerId extends IdType<'CustomerId'> {}

const orderId: OrderId = CustomerId.generate(); // compile error: a CustomerId is not an OrderId
const anyId: IdType = OrderId.generate(); // a plain IdType accepts any id
```

The brand does not exist at run time (`equals` already compares the class). A subclass without it
(`extends IdType {}`) compiles but is accepted wherever another unbranded id is expected.

### `CreatedAt` and `UpdatedAt`

Required dates:

```ts
import { CreatedAt, UpdatedAt } from '@archi-code/ddd/domain';

const createdAt = CreatedAt.now();
let updatedAt = UpdatedAt.now();
updatedAt = UpdatedAt.now(); // a new timestamp is a new value object
createdAt.value; // Date

CreatedAt.now(clock); // takes the instant from any { now(): Date }, such as a Clock port
```

Pass a `Clock` (see the application layer) to `now(clock)` so use cases and tests get a known
time.

### `EnumType`

Abstract class: implement `getEnum()` returning the enum. It accepts exactly one of its options;
for a numeric enum it also accepts the option written as decimal text (`'1'` from a query string),
but not other spellings (`' 1'`, `'1e0'`) nor the key name.

```ts
import { EnumType } from '@archi-code/ddd/domain';

enum Status {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
}

class StatusType extends EnumType<Status> {
  protected getEnum(): typeof Status {
    return Status;
  }
}

new StatusType(Status.ACTIVE).value; // 'active'
new StatusType('ACTIVE' as Status);
// TypePrimitiveException: Validation Error: Expected one of [active, blocked], but received "ACTIVE".

enum Level {
  LOW = 1,
  HIGH = 2,
}

class LevelType extends EnumType<Level> {
  protected getEnum(): typeof Level {
    return Level;
  }
}

new LevelType(Level.HIGH).value; // 2
new LevelType('1' as any).value; // 1
new LevelType('3' as any);
// TypePrimitiveException: Validation Error: Expected one of [1, 2], but received "3".
```

In `PrimitiveTypes`, an `EnumType<V>` field is typed as `V` (`Status`, `Level`), so
`fromPrimitives` passes it back without a cast: `new StatusType(primitives.status)`.

### `JsonType`

Holds a non-empty JSON object (frozen copy). `T` must extend `JsonTypeValue`
(`Record<string, any>`).

```ts
import { JsonType } from '@archi-code/ddd/domain';
import type { JsonTypeValue } from '@archi-code/ddd/domain';

interface Address extends JsonTypeValue {
  city: string;
  zip: string;
}

class AddressType extends JsonType<Address> {}

const address = new AddressType({ city: 'Huelva', zip: '21001' });
address.value; // { city: 'Huelva', zip: '21001' }
address.toString(); // '{"city":"Huelva","zip":"21001"}'
address.equals(new AddressType({ zip: '21001', city: 'Huelva' })); // true (key order does not matter)
new AddressType('{"city":"Huelva","zip":"21001"}' as any).value; // { city: 'Huelva', zip: '21001' }

new JsonType({});
// TypePrimitiveException: Validation Error: Expected a valid Json, but received {}.
new JsonType([1] as any);
// TypePrimitiveException: Validation Error: Expected a valid Json, but received [1].
```

### `ArrayType`

Abstract class: implement `createItem(value)` returning the value object of each item. The array
holds the values already converted by each item; `items` rebuilds the value objects. Items are
compared by value (`hasItem`, `withoutItem`), also for dates and JSON items. `withItem` and
`withoutItem` return a new instance of the same class (built with `new YourClass(values)`, so keep the
single-value constructor).

```ts
import { Validations } from '@archi-code/validation';
import { ArrayType, Required, StringType } from '@archi-code/ddd/domain';

@Validations([{ validator: 'isLength', properties: { min: 2 } }])
class Tag extends Required(StringType) {}

class Tags extends ArrayType<Tag> {
  protected createItem(value: unknown): Tag {
    return new Tag(value as string);
  }
}

const tags = new Tags(['ddd', 'ts']);
tags.value; // ['ddd', 'ts']
tags.items; // [Tag, Tag]
tags.hasItem('ts'); // true
const more = tags.withItem('node'); // Tags ['ddd', 'ts', 'node']
const fewer = more.withoutItem('ts'); // Tags ['ddd', 'node']
tags.value; // ['ddd', 'ts'] (unchanged)
fewer.toString(); // 'ddd, node'
const unique = tags.hasItem('ddd') ? tags : tags.withItem('ddd'); // add only if missing

new Tags('["a1","b2"]' as any).value; // ['a1', 'b2']
new Tags('abc' as any);
// TypePrimitiveException: Validation Error: Expected a valid Array, but received "abc".
```

An `ArrayType` builds every item and reports, at once, the rules of the list (`field: null`) and
the errors of each item with its position (`field: '1'`, from 0):

```ts
new Tags(['ok', 'x', '']);
// ValidationException, error.errors:
// [
//   { field: '1', code: 'isLength', message: 'Tag: Value does not satisfy isLength' },
//   { field: '2', code: 'DOM004', message: 'Validation Error: Tag is required, but received "".' },
// ]
```

### Custom value objects with `AbstractType`

For a new type, extend `AbstractType<T>` and implement `filter(value)`: it receives the input
already known to be non-empty, returns the converted value and throws `TypePrimitiveException` if it
is not valid. Empty input (`null`, `undefined`, blanks) and `Required(...)` are handled by the base
class.

```ts
import { AbstractType, Required } from '@archi-code/ddd/domain';
import { TypePrimitiveException } from '@archi-code/ddd/exceptions';

class Percentage extends AbstractType<number> {
  protected filter(value: unknown): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      throw new TypePrimitiveException('Percentage', value);
    }
    return n;
  }
}

new Percentage(40).value; // 40
new Percentage(140);
// TypePrimitiveException: Validation Error: Expected a valid Percentage, but received 140.

class Discount extends Required(Percentage) {}
```

To restrict an existing type, it is enough to extend it and declare `@Validations`, like `Email`.

### Composite value objects: `Composite({...})`

A concept made of several values that only make sense together (an amount and its currency, a
date range, an address, an order line) is one value object, not loose fields of an aggregate nor a
child entity [IDDD ch. 6]. `Composite(schema)` builds its base class from a schema that names the
class of each field:

| Field in the schema  | Holds                      | Primitive            |
| -------------------- | -------------------------- | -------------------- |
| A value object class | An instance of that class  | Its value            |
| A composite class    | An instance of that class  | Its primitives       |
| `[ItemClass]`        | A frozen list of instances | A list of primitives |

```ts
import { Validations } from '@archi-code/validation';
import { Composite, DateType, NumberType, Required, StringType } from '@archi-code/ddd/domain';
import { DomainException } from '@archi-code/ddd/exceptions';

@Validations([{ validator: 'isInt' }])
class Cents extends Required(NumberType) {}

@Validations([{ validator: 'isIn', properties: { values: ['EUR', 'USD'] } }])
class Currency extends Required(StringType) {}

class CurrencyMismatch extends DomainException {
  constructor(expected: string, received: string) {
    super(`Cannot add ${received} to ${expected}`, ['PAY001']);
  }
}

class Money extends Composite({ amount: Cents, currency: Currency }) {
  add(other: Money): Money {
    if (!this.currency.equals(other.currency)) {
      throw new CurrencyMismatch(this.currency.value, other.currency.value);
    }
    return new Money({
      amount: new Cents(this.amount.value + other.amount.value),
      currency: this.currency,
    });
  }
}

const price = new Money({ amount: new Cents(1250), currency: new Currency('EUR') });
price.amount; // Cents (read-only)
price.add(price).toPrimitives(); // { amount: 2500, currency: 'EUR' }
price.add(new Money({ amount: new Cents(100), currency: new Currency('USD') }));
// CurrencyMismatch: Cannot add USD to EUR (code 'PAY001')
new Cents(12.5);
// ValidationException: Validation failed, Cents: Value does not satisfy isInt
price.equals(Money.fromPrimitives({ amount: 1250, currency: 'EUR' })); // true
JSON.stringify(price.toPrimitives()); // '{"amount":1250,"currency":"EUR"}'
```

- **The constructor** takes value objects only. A missing field throws `RequiredValueException`
  (`Money.currency is required`) and an instance of another class `TypePrimitiveException`, even
  when TypeScript accepts it because both classes have the same shape.
- **Rules over several fields** are `@Validations` `custom` rules on the composite class. They run
  in the constructor, once every field is valid, and `fn` receives the built composite. A broken
  rule throws `ValidationException` (`field: null`), like any value object:

  ```ts
  class StartDate extends Required(DateType) {}
  class EndDate extends Required(DateType) {}

  @Validations([
    {
      custom: 'endsAfterItStarts',
      fn: (range) => (range as Promotion).end.value >= (range as Promotion).start.value,
      message: 'A promotion cannot end before it starts',
    },
  ])
  class Promotion extends Composite({ start: StartDate, end: EndDate }) {}

  Promotion.fromPrimitives({ start: '2026-06-20', end: '2026-03-20' } as any);
  // ValidationException: Validation failed, Promotion: A promotion cannot end before it starts
  // error.errors: [{ field: null, code: 'endsAfterItStarts', message: 'Promotion: A promotion cannot end before it starts' }]
  ```

- **It never changes**: the instance and its lists are frozen and its fields are read-only, so
  behavior returns a new instance. Do not add instance fields to the subclass, and write derived
  values as methods (`money.isZero()`), never getters.
- **`X.fromPrimitives(data)`** rebuilds it from stored or received data, converting each primitive
  like the value objects do, and reports every invalid field with its path, also nested ones.
  `data` is a `CompositeInput`: each field takes what its value object's constructor takes (a date
  field takes a `Date` or ISO text). It works inside `ValueObjects.build`, so a command reports
  `price.amount`:

  ```ts
  class Sku extends Required(StringType) {}
  class Quantity extends Required(NumberType) {}
  class OrderLine extends Composite({ sku: Sku, quantity: Quantity, unitPrice: Money }) {}
  class Cart extends Composite({ lines: [OrderLine] }) {}

  Cart.fromPrimitives({
    lines: [{ sku: '', quantity: 'two', unitPrice: { amount: 1250, currency: 'GBP' } }],
  } as any);
  // ValidationException, error.errors:
  // [
  //   { field: 'lines.0.sku', code: 'DOM004', message: 'Validation Error: Sku is required, but received "".' },
  //   { field: 'lines.0.quantity', code: 'DOM003', message: 'Validation Error: Expected a valid Number, but received "two".' },
  //   { field: 'lines.0.unitPrice.currency', code: 'isIn', message: 'Currency: Value does not satisfy isIn' },
  // ]
  ```

- **`equals(other)`** compares the class and every field (dates by instant, lists in order):
  a `Price` and a `Money` with the same fields are different. **`toPrimitives()`** gives plain data
  for repositories (dates stay `Date`); `JSON.stringify` of them writes ISO dates.
- **In an aggregate**, a composite is a field like any value object:
  `PrimitiveTypes<Order>` types it as its primitives, and an optional one is a `Money | null`
  field. Write `this.price.toPrimitives()` in `toPrimitives()` and `Money.fromPrimitives(...)` in
  `fromPrimitives`. Fields inside a composite are always present.

## Specifications

A business rule with a name ("eligible for express shipping", "customer in arrears") that is used in
several places or combined with others is a `Specification<T>` [IDDD ch. 5]: it validates,
selects or builds, and combines with `and`, `or` and `not` (each returns a `Specification<T>`, so
they keep combining; `and`/`or` stop at the first answer that decides). `and` and `or` accept any
`SatisfiedBy<T>` (an object with `isSatisfiedBy(candidate): boolean`), not only subclasses, as the
books' `Specification` interface does [IDDD ch. 5].

```ts
import { Specification } from '@archi-code/ddd/domain';

class ShipsToThePeninsula extends Specification<Order> {
  isSatisfiedBy(order: Order): boolean {
    return order.destination.zone.value === 'PENINSULA';
  }
}

class InCentralStock extends Specification<Order> {
  constructor(private readonly stock: StockSnapshot) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.lines.every((line) => this.stock.covers(line.sku, line.quantity));
  }
}

const expressShipping = new ShipsToThePeninsula().and(new InCentralStock(stock));
expressShipping.isSatisfiedBy(order); // validate
orders.filter((order) => expressShipping.isSatisfiedBy(order)); // select
```

A specification receives the data it needs already loaded (a snapshot of the stock), never a
repository. It does not protect the invariants of an aggregate: those stay in the aggregate.

## Aggregates and domain events

- `AggregateRoot<Id = IdType, Event = EventBase>`: abstract class for aggregates. `new (id)` stores
  `readonly id`; `equals(other)` is true for the same class and an equal id, whatever the other
  attributes are. `Id` may be any required value object (`EntityId`: `IdType`, a `Required(StringType)` code…); an optional value object cannot be an id, and an id that holds no value throws `RequiredValueException`, so two new entities are never taken for the same one [IDDD ch. 5]; `record(event)` is `protected` and deep-freezes the event (a fact never changes [IDDD ch. 8]); `pullDomainEvents()` returns the events typed as `Event[]`, in order, and empties
  the list. Pending events are a plain private array: repositories store `toPrimitives()`, never
  the aggregate itself.
- The aggregate carries no version: optimistic concurrency belongs to the repository, which
  remembers the version of every aggregate it loaded or saved (see
  [Optimistic concurrency](#optimistic-concurrency)). The aggregate only calls `super(id)`.
- Parts of an aggregate are composite value objects when nobody looks them up by an id of their
  own (the lines of an order). A part that does need its own identity inside the aggregate (a seat
  of a room) is a child entity: it extends `Entity<Id>`, which only stores `readonly id` and
  compares by class and id; it holds value objects and may have business methods with the rules of
  that part, but no setters, and only the root calls them [IDDD ch. 5 and 10]. Its identity is
  local: unique only inside its aggregate and never used to look it up from outside [IDDD ch. 10],
  so a small value object is enough (`class SeatNumber extends Required(NumberType) {}`).
  `AggregateRoot` extends `Entity` too, and only the root is loaded and saved by repositories.

  ```ts
  import {
    AggregateRoot,
    BooleanType,
    Entity,
    IdType,
    NumberType,
    Required,
    StringType,
  } from '@archi-code/ddd/domain';
  import { DomainException } from '@archi-code/ddd/exceptions';

  class SeatNumber extends Required(NumberType) {}
  class SeatLabel extends Required(StringType) {}
  class Sold extends Required(BooleanType) {}

  class SeatAlreadySold extends DomainException {
    constructor(seat: number) {
      super(`Seat ${seat} is already sold and keeps its label`, ['ROOM001']);
    }
  }

  class Seat extends Entity<SeatNumber> {
    constructor(
      id: SeatNumber,
      private _label: SeatLabel,
      readonly sold: Sold,
    ) {
      super(id);
    }

    get label(): SeatLabel {
      return this._label;
    }

    relabel(label: SeatLabel): void {
      if (this.sold.value) {
        throw new SeatAlreadySold(this.id.value);
      }
      this._label = label;
    }
  }

  class Room extends AggregateRoot<IdType> {
    private _seats: Seat[] = [];

    get seats(): Seat[] {
      return [...this._seats];
    }

    relabelSeat(id: SeatNumber, label: SeatLabel): void {
      this._seats.find((seat) => seat.id.equals(id))?.relabel(label);
    }
  }

  new Seat(new SeatNumber(7), new SeatLabel('A1'), new Sold(false)).equals(
    new Seat(new SeatNumber(7), new SeatLabel('B7'), new Sold(true)),
  ); // true
  ```

- `EventBase`: abstract class for events; declare
  `static readonly eventName = '<ClassName>'` (`'OrderPlaced'` [IDDD ch. 8]; the
  `'<context>.<module>.<Event>'` names are for the contracts other contexts read) (listeners and registries refer to the event by its class, without an instance, and a subclass
  inherits it). An event is a plain object of primitive data with no methods: `new (metadata?)`
  copies the static name into the `readonly eventName` field and sets `eventId` (a new UUID v4)
  and `occurredOn` (ISO text in UTC, `'2026-10-17T10:00:00.000Z'`); everything else is data the
  subclass declares as `readonly` constructor fields, including the id of the aggregate
  (`readonly orderId: string`). Creating an event whose class has no non-blank `eventName` throws
  `InternalErrorException`. Pass
  `{ clock }` (any `{ now(): Date }`, such as the `Clock` port) to take the moment from it; without
  a clock it is the system time. When you rebuild an event a channel delivered, pass
  `{ eventId, occurredOn }` (`Date` or ISO string with zone) to keep them; a stored `occurredOn`
  wins over a clock and is stored as UTC ISO text. The clock is not kept in the event. The event
  is its own JSON: `{ ...event }` and `JSON.stringify(event)` give
  `{ eventName, eventId, occurredOn, ...fields }`, in that order.
- Rule: each event declares only the primitive data it needs (text, finite numbers, booleans,
  `null`, and lists and plain objects of them), taken from value objects: a value object becomes
  its `.value`, money `{ amount, currency }`, a date its ISO text. Never value objects, `Date`s,
  class instances nor the whole state of the aggregate: the event travels as it is, and its
  readers must not depend on the model. Nothing checks this at run time.
- An event has no schema version. Adding an optional field that old readers can ignore is
  compatible; a change old readers cannot follow (renaming or removing a field, changing its
  meaning) is published as a new event with its own `eventName` (`CustomerRenamedV2`), or the
  `EventRegistry` factory of the event reads both shapes (`typeof json.name === 'string' ? … : …`).
- The version a repository stores counts saves, not events: it grows by 1 on each save, however
  many events the change recorded. Event Sourcing is not provided: an event-sourced aggregate manages the version of its
  stream itself.

```ts
import { AggregateRoot, EventBase, IdType, Required, StringType } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';
import { FixedClock } from '@archi-code/ddd/infrastructure';

class OrderId extends IdType<'OrderId'> {}
class CustomerName extends Required(StringType) {}

class OrderPlaced extends EventBase {
  static readonly eventName = 'OrderPlaced';

  constructor(
    readonly orderId: string,
    readonly customer: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

class Order extends AggregateRoot<OrderId, OrderPlaced> {
  static place(id: OrderId, customer: CustomerName, clock: { now(): Date }): Order {
    const order = new Order(id);
    order.record(new OrderPlaced(id.value, customer.value, { clock }));
    return order;
  }
}

const order = Order.place(
  new OrderId('9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c'),
  new CustomerName('Ana'),
  new FixedClock('2026-10-17T10:00:00Z'),
);
const [placed] = order.pullDomainEvents(); // OrderPlaced[]
order.pullDomainEvents(); // []
JSON.stringify(placed);
// {"eventName":"OrderPlaced","eventId":"…","occurredOn":"2026-10-17T10:00:00.000Z","orderId":"9b2f6c1e-…","customer":"Ana"}
```

### Primitive types

Types to go from an aggregate (or any class with value objects) to its plain values:

| Type                       | Result                                                                                                                                                                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PrimitiveType<T>`         | Value object → its value (`T['value']`); `EnumType<V>` → the enum option type `V`; arrays item by item; `null` → `null`; a child entity (`extends Entity`) or a composite → its `PrimitiveTypes`; raw `string`/`number`/`boolean`/`Date` and anything else → `never` |
| `PrimitiveTypes<T>`        | Object with each public non-method property of `T` as `PrimitiveType`, without the leading `_` of the name                                                                                                                                                           |
| `DataTypes<T>`             | `Partial<PrimitiveTypes<T>>`                                                                                                                                                                                                                                         |
| `Properties<T>`            | The public properties of `T` that are not methods                                                                                                                                                                                                                    |
| `PropertiesData<T>`        | `Required<Properties<T>>`                                                                                                                                                                                                                                            |
| `MutablePropertiesData<T>` | `PropertiesData<T>` without `readonly`                                                                                                                                                                                                                               |
| `Methods<T>`               | Union of the names of the methods of `T`                                                                                                                                                                                                                             |
| `MethodsAndProperties<T>`  | `{ [key in keyof T]: T[key] }`                                                                                                                                                                                                                                       |
| `RequiredType<C>`          | Type of the class returned by `Required(C)`                                                                                                                                                                                                                          |
| `JsonTypeValue`            | `Record<string, any>`                                                                                                                                                                                                                                                |

`PrimitiveTypes` only sees **public** members (`keyof`): `private` or `protected` properties do not
appear. Expose the value objects with public `readonly` properties or with getters (see the full
example), and write derived values as methods: a getter such as `get total()` would become a key of
the primitives. For an aggregate it includes `id`, and child entities become their own primitives.
An enum field keeps its enum type, so `fromPrimitives` rebuilds it without a cast:
`new OrderStatusType(primitives.status)` (`primitives.status` is `OrderStatus`).

```ts
import type { DataTypes, PrimitiveTypes } from '@archi-code/ddd/domain';

class Person {
  constructor(
    readonly _name: Name,
    readonly nickname: Nickname,
  ) {}
}

type PersonPrimitives = PrimitiveTypes<Person>; // { name: string; nickname: string | null }
type PersonData = DataTypes<Person>; // { name?: string; nickname?: string | null }
```

## Repository contracts

The domain declares what it needs to load, save and remove aggregates; infrastructure implements
it (types only, nothing to instantiate). The repository is split by role, following the interface
segregation principle:

```ts
interface AggregateFinder<Aggregate extends AggregateRoot<any, any>> {
  findById(id: Aggregate['id']): Promise<Aggregate | null>;
}

interface AggregateSaver<Aggregate extends AggregateRoot<any, any>> {
  save(aggregate: Aggregate): Promise<void>;
}

interface AggregateRemover<Aggregate extends AggregateRoot<any, any>> {
  remove(aggregate: Aggregate): Promise<void>;
}
```

`remove` receives the loaded aggregate, not its id: removing is a change like any other, so the
repository removes it only where the stored version still equals the one it loaded, and throws
`ConcurrencyException` when someone changed or removed it after it was loaded [IDDD ch. 10]. A
use case loads it with `findById`, decides, and removes it.

A use case asks only for the roles it uses: registering needs `AggregateSaver<User>`, renaming
needs `AggregateFinder<User> & AggregateSaver<User>`, closing an account may need
`AggregateFinder<User> & AggregateRemover<User>`. Its dependencies then say what it can do, and a
test double implements one method. There is no all-in-one `Repository` contract: the adapter
implements the roles it supports
(`class MongoUserRepository implements AggregateFinder<User>, AggregateSaver<User>, AggregateRemover<User>`)
and the same instance is passed to every use case.

Reading for a screen or a list does not go through aggregates nor repositories. A read query is an
interface of the application, implemented in infrastructure, that returns DTOs or ids straight
from the database (filter and paginate it with
[`@archi-code/criteria`](https://www.npmjs.com/package/@archi-code/criteria)):

```ts
interface OrderSummary {
  id: string;
  customer: string;
  totalCents: number;
}

interface OrderSummaries {
  ofCustomer(customerId: string, page: { limit: number; offset: number }): Promise<OrderSummary[]>;
}
```

### Optimistic concurrency

Two users load the same order, both change it and both save: without a check, the second save
silently erases the first. The repository prevents it with a version it keeps itself: the
aggregate knows nothing about it. It remembers the version of each aggregate object it loaded or
saved in a `WeakMap<Order, number>` (an object it never saw is new, version `0`), and every
repository follows the same contract:

| Moment                       | The repository                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| Load                         | Rebuilds with `Order.fromPrimitives(row)` and remembers `row.version` for that object       |
| Save a new aggregate         | Version `0`: inserts with version `1`; if the id already exists, it is a conflict           |
| Save an existing aggregate   | Writes only where the stored version still equals the remembered one, and stores one more   |
| Nothing written (stale data) | Throws `ConcurrencyException('Order', id, version)` (HTTP 409) with the version it expected |
| Written                      | Remembers the new version, so the same object can be changed and saved again                |
| Remove                       | Deletes only where the stored version still equals the remembered one; otherwise a conflict |

The version lives next to the primitives (a `version` column or field), never inside them. After a
`ConcurrencyException`, either tell the user that someone else changed it, or run the command
again, which loads the aggregate again. The use case may retry by itself when its command is safe
to repeat against the new state [IDDD ch. 10; IDDD appendix A]: each attempt loads the aggregate
again and saves it again, written in `handle` (there is no helper), and it never calls another use
case. A use case run by a listener does not retry by itself: it lets the conflict propagate and the
channel's redelivery tries again:

```ts
import { UseCase } from '@archi-code/ddd/application';
import { AggregateNotFoundException, ConcurrencyException } from '@archi-code/ddd/exceptions';

interface AddOrderLineInput {
  orderId: string;
  sku: string;
  quantity: number;
}

interface AddOrderLineCommand {
  orderId: OrderId;
  sku: Sku;
  quantity: Quantity;
}

class AddOrderLine extends UseCase<AddOrderLineInput, AddOrderLineCommand, void> {
  // constructor (orders, events, clock) as in "Persistence belongs to the repository";
  // toCommand builds orderId, sku and quantity with ValueObjects.build;
  // Order, OrderLine, Sku and Quantity as in "Persisting aggregates"

  protected async handle(command: AddOrderLineCommand): Promise<void> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        const order = await this.orders.findById(command.orderId);
        if (order === null) {
          throw new AggregateNotFoundException('Order', command.orderId.value);
        }
        order.addLine(new OrderLine({ sku: command.sku, quantity: command.quantity }));
        await this.orders.save(order);
        return await this.events.publish(order.pullDomainEvents());
      } catch (error) {
        if (!(error instanceof ConcurrencyException) || attempt === 3) {
          throw error;
        }
      }
    }
  }
}
```

A command that is not safe to repeat (it would charge twice, or the user decided on data that
changed) does not retry: the `ConcurrencyException` reaches the entry point (HTTP 409).

```ts
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import { ConcurrencyException, InternalErrorException } from '@archi-code/ddd/exceptions';

class MongoOrderRepository implements AggregateFinder<Order>, AggregateSaver<Order> {
  private readonly versions = new WeakMap<Order, number>();

  constructor(private readonly collection: Collection<OrderDocument>) {}

  async findById(id: OrderId): Promise<Order | null> {
    const document = await this.collection.findOne({ _id: id.value });
    if (document === null) {
      return null;
    }
    const { _id, version, ...primitives } = document;
    const order = Order.fromPrimitives(primitives);
    this.versions.set(order, version);
    return order;
  }

  async save(order: Order): Promise<void> {
    const version = this.versions.get(order) ?? 0;
    const data = { ...order.toPrimitives(), version: version + 1 };
    const written =
      version === 0
        ? await this.insert(data)
        : (await this.collection.replaceOne({ _id: data.id, version }, data)).matchedCount === 1;
    if (!written) {
      throw new ConcurrencyException('Order', order.id.value, version);
    }
    this.versions.set(order, version + 1);
  }

  private async insert(data: OrderDocument): Promise<boolean> {
    try {
      await this.collection.insertOne({ _id: data.id, ...data });
      return true;
    } catch (error) {
      if (isDuplicateKey(error)) {
        return false;
      }
      throw new InternalErrorException('saving order', { cause: error });
    }
  }
}
```

In SQL the same check is `UPDATE orders SET …, version = version + 1 WHERE id = $1 AND version = $2`
and zero updated rows means a conflict.

### Repository contract tests

Write the contract once, in `test/support/`, and run it against your in-memory repository (see
[Writing a repository](#writing-a-repository)) and against your real adapter, so the double the use
case tests rely on behaves like production (`Order` is
the one of [Persisting aggregates](#persisting-aggregates)):

```ts
import { describe, expect, it } from 'vitest';
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import { ConcurrencyException } from '@archi-code/ddd/exceptions';
import { FixedClock } from '@archi-code/ddd/infrastructure';

const clock = new FixedClock('2026-10-17T10:00:00Z');
const anOrder = () => Order.place(OrderId.generate(), new CustomerName('Ana'), clock);

export function orderRepositoryContract(
  make: () => AggregateFinder<Order> & AggregateSaver<Order>,
): void {
  it('finds what it saved', async () => {
    const orders = make();
    const order = anOrder();
    await orders.save(order);
    expect((await orders.findById(order.id))?.toPrimitives()).toStrictEqual(order.toPrimitives());
  });

  it('saves the same object twice', async () => {
    const orders = make();
    const order = anOrder();
    await orders.save(order);
    order.ship(clock);
    await orders.save(order);
    expect((await orders.findById(order.id))?.toPrimitives()).toStrictEqual(order.toPrimitives());
  });

  it('refuses a stale save', async () => {
    const orders = make();
    const order = anOrder();
    await orders.save(order);
    const first = (await orders.findById(order.id))!;
    const second = (await orders.findById(order.id))!;
    first.ship(clock);
    await orders.save(first);
    second.ship(clock);
    await expect(orders.save(second)).rejects.toBeInstanceOf(ConcurrencyException);
  });

  it('refuses a new aggregate whose id is taken', async () => {
    const orders = make();
    const order = anOrder();
    await orders.save(order);
    const copy = Order.place(order.id, new CustomerName('Luis'), clock);
    await expect(orders.save(copy)).rejects.toBeInstanceOf(ConcurrencyException);
  });
}

describe('InMemoryOrderRepository', () => {
  orderRepositoryContract(() => new InMemoryOrderRepository());
});

describe('MongoOrderRepository', () => {
  orderRepositoryContract(() => new MongoOrderRepository(collection));
});
```

# Application layer: `@archi-code/ddd/application`

## `UseCase<Input, Command, Output>`

Two rules shape every use case:

- **It does one thing.** One business action per class and one `handle`: it changes one aggregate
  and saves it once [Destilado ch. 5; IDDD ch. 10], except the cases IDDD ch. 10 accepts (such as
  creating several aggregates in one batch), written down as an explicit decision. A flow with several actions is several use cases, chained by domain events or
  called in order by whoever orchestrates them, never one use case whose input switches between
  behaviors.
- **It has a business name.** A verb and a noun a domain expert would say: `PlaceOrder`,
  `ShipOrder`, `CancelSubscription`, `ApproveRefund`. Not `OrderService`, `UpdateOrder`,
  `SaveUser` or `ProcessData`.

A use case has two steps, and `execute(input)` (which always returns a promise) runs them in
order:

1. `protected toCommand(input: Input): Command` builds the value objects the action needs with
   `ValueObjects.build({ orderId: () => new OrderId(input.orderId), email: () => new Email(input.email) })`
   (one value object alone can be built with `new`). If any field is invalid it throws one
   `ValidationException` listing every field, and `handle` never runs.
2. `protected handle(command: Command)` (sync or async) coordinates the action with value objects
   only: load the aggregate, call its business method, save it, publish
   `aggregate.pullDomainEvents()`. It never opens a transaction: each write is made atomic by the
   repository (see [Persistence belongs to the repository](#persistence-belongs-to-the-repository)).

Errors of both steps are treated the same way:

- Exceptions of the package (`DomainException`, `ValidationException`, `ApplicationException`,
  `AggregateNotFoundException`…) pass through as they are, so the caller can map them.
- Anything else (a driver error, a `TypeError`, a thrown string) is wrapped in
  `InternalErrorException` with the original as `cause` and the use case name in the message:
  `Failed, internal error: PlaceOrder: connection reset`.

`UseCase` does nothing else: loading, checking, saving and publishing are written in `handle`,
so every step of the use case is visible in one place:

```ts
class ShipOrder extends UseCase<{ orderId: string }, OrderId, void> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly bus: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: { orderId: string }): OrderId {
    return new OrderId(input.orderId);
  }

  protected async handle(orderId: OrderId): Promise<void> {
    const order = await this.orders.findById(orderId);
    if (order === null) {
      throw new AggregateNotFoundException('Order', orderId.value);
    }
    order.ship(this.clock);
    await this.orders.save(order);
    await this.bus.publish(order.pullDomainEvents());
  }
}
```

Save before publishing, and publish what `pullDomainEvents()` returns, so a failed save publishes
nothing and events are never sent twice. A command with several values is a small interface of
value objects (`interface PlaceOrderCommand { orderId: OrderId; customer: CustomerName }`); a
use case never imports another use case.

### Use cases run by a listener

A use case that a listener runs registers a fact that already happened elsewhere, so it does not
refuse it: when the aggregate is missing it returns instead of throwing
`AggregateNotFoundException` (a not-found would block the channel's redelivery for ever), and the
aggregate method is idempotent. Only technical errors propagate, so the delivery is retried:

```ts
protected async handle(command: RegisterStockReservationCommand): Promise<void> {
  const order = await this.orders.findById(command.orderId);
  if (order === null) {
    return;
  }
  order.registerStockReservation(command.reservationId, this.clock);
  await this.orders.save(order);
  await this.bus.publish(order.pullDomainEvents());
}
```

### Authorization

Who may run the action is checked by the application. The adapter takes the requester's id from
the token (never from the body) and puts it in the input; `toCommand` turns it into a value object;
an application policy throws `NotAllowedException` (HTTP 403) when the requester may not act.
Ownership rules that are business rules ("only the customer who placed an order can cancel it",
"only pending orders can be cancelled") stay in the aggregate, with a `DomainException`:

```ts
protected async handle(command: RefundPaymentCommand): Promise<void> {
  if (!(await this.permissions.canRefund(command.requesterId))) {
    throw new NotAllowedException(`User ${command.requesterId.value} may not refund payments`);
  }
  // load, change, save, publish
}
```

## Events: the contract in `application/event`

The application layer holds only the contract to publish and to listen, in one folder,
`application/event`: `EventBus` (the port a use case publishes through) and `EventListener` +
`@ListensTo` (what the application does when an event happens). Everything that moves events (the
bus, the registry that rebuilds them and the channel port) is infrastructure, used only by the
wiring (the composition root). Changing the messaging technology (in memory today, RabbitMQ, a
database table or Kafka tomorrow) means **changing only the channel**: use cases, listeners and
wiring stay as they are.

```
use case ──► EventBus (port, @archi-code/ddd/application)
                 ▲ implements
wiring   ──► DomainEventBus  ({ ...event }, @ListensTo, rebuild, listener.handle)   (@archi-code/ddd/infrastructure)
                 └──► EventChannel (port)  ◄── InMemoryEventChannel   (@archi-code/ddd/infrastructure)
                      send / receive         ◄── your RabbitMQ, database or Kafka channel
```

| Piece                                                   | Module         | Kind             | Role                                                                                                                 |
| ------------------------------------------------------- | -------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| `EventListener`, `@ListensTo`                           | application    | class, decorator | What the application does when an event happens                                                                      |
| `EventBus`                                              | application    | port (type)      | `publish(events)`: the only thing a use case knows                                                                   |
| `DomainEventBus(channel, registry)`, `Subscription`     | infrastructure | class, type      | Implements `EventBus` over any `EventChannel`; `subscribe(listener)` → `{ unsubscribe() }`, both async               |
| `EventChannel`, `ChannelHandler`, `ChannelSubscription` | infrastructure | port (types)     | `send(serialized)` / `receive(eventName, consumer, handler)` → `{ close() }`: the only thing a technology implements |
| `EventRegistry`, `EventFactory`                         | infrastructure | class, type      | Rebuilds an event from its JSON, keeping its `eventId` and `occurredOn`                                              |

### Listeners: `EventListener` and `@ListensTo`

A listener is what the application does when an event happens. It extends
`EventListener<Event>`, implements `handle(event)` (sync or async) and is marked with
`@ListensTo(EventClass, { consumer })`, which stores the event's `static eventName` and the
consumer name on the listener class. A listener listens to exactly one event (decorating it twice
throws `ApplicationException`) and any number of listeners may listen to the same event. A
subclass does not inherit the mark.

The consumer name is required (a missing, blank or non-text one throws `ApplicationException`):
it is the identity the channel gives the listener, such as the name of its durable queue in a
broker. Keep it stable and unique per listener: it never comes from the class name, because a
minifier renames classes between builds and two listeners in different modules may share a class
name, which with a broker would move the listener to a new queue or make both compete for the
same messages.

Its name is `<Action>On<Event>`, and its body only turns the event into the input of the one use
case it receives by constructor:

```ts
import { EventListener, ListensTo } from '@archi-code/ddd/application';

@ListensTo(OrderPlaced, { consumer: 'reserve-stock-on-order-placed' })
class ReserveStockOnOrderPlaced extends EventListener<OrderPlaced> {
  constructor(private readonly reserveStock: ReserveStock) {
    super();
  }

  async handle(event: OrderPlaced): Promise<void> {
    await this.reserveStock.execute({ orderId: event.orderId });
  }
}
```

`ListensTo.subscriptionOf(listener)` returns the event name and the consumer name a listener
instance listens with, as a `ListenerSubscription` (`{ eventName, consumer }`); it throws
`ApplicationException` when its class has no `@ListensTo`. The mark is kept under a `Symbol.for`
key, so a listener decorated with one build (CJS or ESM) is read by the other. Neither the
aggregates nor the use cases know the listeners: only the wiring subscribes them to the bus.

### The ports

`EventBus` comes from `@archi-code/ddd/application`; the channel port (`EventChannel`,
`ChannelHandler`, `ChannelSubscription`) and `Subscription` come from
`@archi-code/ddd/infrastructure`:

```ts
interface EventBus<Event extends EventBase = EventBase> {
  publish(events: readonly Event[]): Promise<void>;
}

interface Subscription {
  unsubscribe(): Promise<void>;
}

type ChannelHandler = (event: SerializedEvent) => Promise<void>;

interface ChannelSubscription {
  close(): Promise<void>;
}

interface EventChannel {
  send(events: readonly SerializedEvent[]): Promise<void>;
  receive(
    eventName: string,
    consumer: string,
    handler: ChannelHandler,
  ): Promise<ChannelSubscription>;
}
```

A channel only moves serialized events (`{ ...event }`), so the same contract fits a process, a broker
and a table. The rules every channel follows:

| Concern           | Rule                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Payload           | `SerializedEvent`s (JSON-safe), never instances                                                                                                              |
| Consumer identity | `receive(eventName, consumer, handler)`; `DomainEventBus` passes the `consumer` the listener declares in `@ListensTo` (a durable queue name, a consumer row) |
| One per consumer  | a second `receive` for the same event and consumer while the first is open throws `InfrastructureException`                                                  |
| Lifecycle         | `receive` resolves to a `ChannelSubscription`; `close()` is async and can be called more than once                                                           |
| `send` resolves   | when the channel accepted the events; whether the handlers already ran is the channel's choice                                                               |
| Order             | one consumer receives the events of one `send` in their order                                                                                                |
| Delivery          | at least once: a listener ignores an `eventId` it already processed                                                                                          |
| Handler failure   | the channel's choice (the in-memory channel rejects `send`; a broker retries or dead-letters)                                                                |

### `DomainEventBus` and `EventRegistry`

Both live in `@archi-code/ddd/infrastructure` and are used only by the composition root:

```ts
import {
  DomainEventBus,
  EventRegistry,
  InMemoryEventChannel,
} from '@archi-code/ddd/infrastructure';

const events = new EventRegistry<OrderEvent>()
  .register(
    OrderPlaced,
    (json) => new OrderPlaced(json.orderId as string, json.customer as string, json),
  )
  .register(OrderShipped, (json) => new OrderShipped(json.orderId as string, json));

const bus = new DomainEventBus<OrderEvent>(new InMemoryEventChannel(), events);
const reserving = await bus.subscribe(new ReserveStockOnOrderPlaced(reserveStock));
await bus.subscribe(new NotifyCustomerOnOrderShipped(notifyCustomer));

const placeOrder = new PlaceOrder(orders, bus, clock); // the use case only sees EventBus
await placeOrder.execute({ customer: 'Ana' }); // ReserveStock ran with a rebuilt OrderPlaced
await reserving.unsubscribe();
```

- `DomainEventBus` implements `EventBus`; `subscribe(listener)` is its own method, called only by
  the wiring.
- `publish(events)` sends a plain copy of each event (`{ ...event }`) to the channel in one `send` (events
  recorded by an aggregate are already frozen by `record()`).
- `subscribe(listener)` reads the event and the consumer with `ListensTo.subscriptionOf` (`ApplicationException` without
  `@ListensTo`), refuses an event the registry cannot rebuild (`UnknownEventException`, at wiring
  time rather than at the first delivery) and calls
  `channel.receive(eventName, consumer, handler)`; the handler rebuilds the event
  with the registry and calls `listener.handle`. `unsubscribe()` closes the channel subscription.
- Listeners always receive an event rebuilt from its JSON (frozen, equal field by field), also in
  memory, so what works with the in-memory channel works the same with a broker.
- An optional third argument, a `Logger`, logs what was published, the subscriptions and every
  listener failure with its event and consumer (see [Logging](#logging)); without it, nothing is
  logged.

`EventRegistry`: `register(EventClass, factory)` (the same event twice throws
`InternalErrorException`: a wiring mistake), `has(eventName)` and `fromJSON(json)` (a parsed
`SerializedEvent`: turning a message body into JSON is the channel's job).
The factory must pass the serialized event as the metadata of the new event (`json` as the last
argument), so the rebuilt event keeps its `eventId` and `occurredOn`: consumers deduplicate by
`eventId`, and a new one would make every redelivery look like a new event. `fromJSON` checks it
and throws `InternalErrorException`
(`the factory of "OrderPlaced" must pass the serialized event as metadata, so it keeps its eventId and occurredOn`)
when the rebuilt `eventId` (compared without case) or the `occurredOn` instant differs from the
JSON. It also throws `UnknownEventException` for a name nobody registered and
`InternalErrorException` for text that is not a JSON object or has no `eventName`. The rebuilt
event is deep-frozen, like the ones an aggregate records. The factory receives the JSON as it was
stored, so it can also read an older shape of the same event.

### Example: from the use case to the listener, in memory

One aggregate records `OrderPlaced`, a use case publishes it, and a listener runs the use case
that sends the confirmation. The use cases and the listener only know the ports; the composition
root chooses the channel:

```ts
import { AggregateRoot, EventBase, IdType, Required, StringType } from '@archi-code/ddd/domain';
import type { AggregateSaver, EventMetadata, PrimitiveTypes } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, UseCase } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';
import {
  DomainEventBus,
  EventRegistry,
  FixedClock,
  InMemoryEventChannel,
} from '@archi-code/ddd/infrastructure';
import { InMemoryOrderRepository } from './test/support/in-memory-order-repository';

class OrderId extends IdType<'OrderId'> {}
class CustomerName extends Required(StringType) {}

class OrderPlaced extends EventBase {
  static readonly eventName = 'OrderPlaced';

  constructor(
    readonly orderId: string,
    readonly customer: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

class Order extends AggregateRoot<OrderId, OrderPlaced> {
  private constructor(
    id: OrderId,
    private readonly _customer: CustomerName,
  ) {
    super(id);
  }

  static place(id: OrderId, customer: CustomerName, clock: Clock): Order {
    const order = new Order(id, customer);
    order.record(new OrderPlaced(id.value, customer.value, { clock }));
    return order;
  }

  static fromPrimitives(primitives: PrimitiveTypes<Order>): Order {
    return new Order(new OrderId(primitives.id), new CustomerName(primitives.customer));
  }

  get customer(): CustomerName {
    return this._customer;
  }

  toPrimitives(): PrimitiveTypes<Order> {
    return { id: this.id.value, customer: this.customer.value };
  }
}

class PlaceOrder extends UseCase<{ customer: string }, CustomerName, string> {
  constructor(
    private readonly orders: AggregateSaver<Order>,
    private readonly events: EventBus<OrderPlaced>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: { customer: string }): CustomerName {
    return new CustomerName(input.customer);
  }

  protected async handle(customer: CustomerName): Promise<string> {
    const order = Order.place(OrderId.generate(), customer, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
    return order.id.value;
  }
}

class SendConfirmation extends UseCase<{ orderId: string; customer: string }, string, void> {
  constructor(private readonly mails: string[]) {
    super();
  }

  protected toCommand(input: { orderId: string; customer: string }): string {
    return `Order ${input.orderId} confirmed to ${new CustomerName(input.customer).value}`;
  }

  protected handle(mail: string): void {
    this.mails.push(mail);
  }
}

@ListensTo(OrderPlaced, { consumer: 'send-confirmation-on-order-placed' })
class SendConfirmationOnOrderPlaced extends EventListener<OrderPlaced> {
  constructor(private readonly sendConfirmation: SendConfirmation) {
    super();
  }

  async handle(event: OrderPlaced): Promise<void> {
    await this.sendConfirmation.execute({ orderId: event.orderId, customer: event.customer });
  }
}

// composition root
const mails: string[] = [];
const events = new EventRegistry<OrderPlaced>().register(
  OrderPlaced,
  (json) => new OrderPlaced(json.orderId as string, json.customer as string, json),
);
const channel = new InMemoryEventChannel();
const bus = new DomainEventBus<OrderPlaced>(channel, events);
const confirming = await bus.subscribe(
  new SendConfirmationOnOrderPlaced(new SendConfirmation(mails)),
);

const orders = new InMemoryOrderRepository(); // see "Writing a repository"
const placeOrder = new PlaceOrder(orders, bus, new FixedClock('2026-10-19T09:30:00Z'));
const orderId = await placeOrder.execute({ customer: 'Ana' });

mails; // ['Order <orderId> confirmed to Ana']: the listener ran before publish resolved
channel.sent;
// [{ eventName: 'OrderPlaced', eventId: '…', occurredOn: '2026-10-19T09:30:00.000Z',
//    orderId, customer: 'Ana' }]

await bus.subscribe(new SendConfirmationOnOrderPlaced(new SendConfirmation(mails)));
// InfrastructureException: SendConfirmationOnOrderPlaced already receives "OrderPlaced"

await confirming.unsubscribe();
await placeOrder.execute({ customer: 'Luis' });
mails.length; // 1: nobody receives OrderPlaced any more
channel.sent.length; // 2
```

In a test, assert on what the listener caused (`mails`) and on `channel.sent`; with
`new InMemoryEventChannel({ delivery: 'parallel' })` the listeners of one event run together and
their failures arrive in one `EventDeliveryException`.

### Implementing another channel

A new technology implements one class, `EventChannel`, in its own infrastructure folder of your
project (for example `infrastructure/messaging/RabbitMqEventChannel.ts`): `send` publishes each
JSON (a message per event, a row per event…), `receive` declares what the consumer needs (a queue
named after `consumer` bound to `eventName`, a consumer row…) and calls `handler` for each delivery,
and `close` cancels it. The channel imports its port types (`EventChannel`, `ChannelHandler`,
`ChannelSubscription`) from `@archi-code/ddd/infrastructure`.

A RabbitMQ channel, written against the few methods of an
[amqplib](https://www.npmjs.com/package/amqplib) channel it uses (declared structurally, so the
package needs no driver): one durable topic exchange, the event name as routing key, one durable
queue per consumer and event, `ack` when the listener finished and `nack` without requeue when it
failed (configure a dead-letter exchange on the queue to keep those messages):

```ts
import type {
  ChannelHandler,
  ChannelSubscription,
  EventChannel,
} from '@archi-code/ddd/infrastructure';
import type { SerializedEvent } from '@archi-code/ddd/domain';

interface AmqpMessage {
  content: Buffer;
}

interface AmqpChannel {
  assertExchange(exchange: string, type: 'topic', options: { durable: boolean }): Promise<unknown>;
  publish(
    exchange: string,
    routingKey: string,
    content: Buffer,
    options: { persistent: boolean; messageId: string; contentType: string },
  ): boolean;
  assertQueue(queue: string, options: { durable: boolean }): Promise<unknown>;
  bindQueue(queue: string, exchange: string, pattern: string): Promise<unknown>;
  consume(
    queue: string,
    onMessage: (message: AmqpMessage | null) => void,
  ): Promise<{ consumerTag: string }>;
  ack(message: AmqpMessage): void;
  nack(message: AmqpMessage, allUpTo: boolean, requeue: boolean): void;
  cancel(consumerTag: string): Promise<unknown>;
}

class RabbitMqEventChannel implements EventChannel {
  constructor(
    private readonly amqp: AmqpChannel,
    private readonly exchange = 'sales.events',
  ) {}

  async send(events: readonly SerializedEvent[]): Promise<void> {
    await this.amqp.assertExchange(this.exchange, 'topic', { durable: true });
    for (const event of events) {
      this.amqp.publish(this.exchange, event.eventName, Buffer.from(JSON.stringify(event)), {
        persistent: true,
        messageId: event.eventId,
        contentType: 'application/json',
      });
    }
  }

  async receive(
    eventName: string,
    consumer: string,
    handler: ChannelHandler,
  ): Promise<ChannelSubscription> {
    const queue = `${consumer}.${eventName}`;
    await this.amqp.assertExchange(this.exchange, 'topic', { durable: true });
    await this.amqp.assertQueue(queue, { durable: true });
    await this.amqp.bindQueue(queue, this.exchange, eventName);
    const { consumerTag } = await this.amqp.consume(queue, (message) => {
      if (message === null) {
        return;
      }
      handler(JSON.parse(message.content.toString()))
        .then(() => this.amqp.ack(message))
        .catch(() => this.amqp.nack(message, false, false));
    });
    let open = true;
    return {
      close: async () => {
        if (open) {
          open = false;
          await this.amqp.cancel(consumerTag);
        }
      },
    };
  }
}
```

The wiring of the example above changes one line, and the use cases and the listener stay as they
are:

```ts
const bus = new DomainEventBus<OrderPlaced>(new RabbitMqEventChannel(amqpChannel), events);
```

With a broker, `publish` resolves when the messages were handed to RabbitMQ, not when the listener
ran, so a test waits for its effect instead of reading it right after `execute`. Make your channel
follow the rules of the table above; the package's own contract suite
(`test/contract/event-channel-contract.ts` in the repository) shows the cases every channel must
pass.

## Ports

Technical capabilities the application needs and infrastructure implements (types only):

```ts
interface Clock {
  now(): Date;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Readonly<Record<string, unknown>>;

interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}
```

There is no transaction port: transactions are a persistence concern, and persistence belongs to
the repository (see [Persistence belongs to the repository](#persistence-belongs-to-the-repository)).

`Logger` is the contract any logging library implements: four levels, each taking a stable
message and an optional structured context. `console` and winston already have this shape; pino
(`logger.info(context, message)`) needs a four-line adapter. A use case that must log receives it
by constructor, like any port; the domain never logs (it records events or throws). See
[Logging](#logging) for the providers this package ships and where it logs on its own.

## Persistence belongs to the repository

A use case changes one aggregate and saves it once [IDDD ch. 10]. It never opens, joins nor closes
a transaction, and receives no transaction port: it loads, calls the business method, saves and
publishes.

```ts
import { UseCase } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';

class ShipOrder extends UseCase<{ orderId: string }, OrderId, void> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: { orderId: string }): OrderId {
    return new OrderId(input.orderId);
  }

  protected async handle(orderId: OrderId): Promise<void> {
    const order = await this.orders.findById(orderId);
    if (order === null) {
      throw new AggregateNotFoundException('Order', orderId.value);
    }
    order.ship(this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
```

The repository is responsible for the transaction and for everything else about persistence:

- **Atomic writes**: each `save` and `remove` writes the whole aggregate or nothing. One document
  per aggregate is one atomic write; an aggregate spread over several tables is written inside a
  database transaction that the repository opens and commits (or rolls back) within `save` itself,
  with its own connection.
- **Concurrency**: it checks the stored version and throws `ConcurrencyException` (see
  [Optimistic concurrency](#optimistic-concurrency)) and remembers the version of every aggregate
  it loaded or saved, outside the aggregate.
- **Connections and errors**: pools, sessions and driver retries stay inside the adapter, and driver
  errors are wrapped in `InternalErrorException` with `{ cause }`.
- **Events that must not be lost**: `publish` runs after `save`, so a failure in between loses the
  events. When that matters, the repository writes the pending events in the same atomic write as
  the aggregate (an outbox in the same document or in the same database transaction of `save`) and
  a relay delivers them through an `EventChannel` [Destilado ch. 6; IDDD ch. 8]; use cases do not
  change.

An in-memory repository written in your tests (see [Writing a repository](#writing-a-repository))
follows the same contract: every `save` and `remove` is applied whole or not at all.

## Event Sourcing and CQRS: only for a concrete risk

Neither is required, and both add complexity [IDDD ch. 4]. This package persists the state of
aggregates; it does not ship an event store nor Event Sourcing support: the stored version grows by 1 per
save, not per event, and an event-sourced aggregate manages the version of its stream itself.

| Situation                                                     | Recommendation                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| Screens that follow one aggregate                             | Repositories and use cases, nothing else                      |
| Lists and searches across aggregates                          | Read queries straight to the database (SQL, views), read-only |
| Views very different from the model, heavy reading            | CQRS: read models kept up to date by event listeners          |
| A business or legal need for the full history of an aggregate | Consider Event Sourcing for that aggregate only               |

A read model (projection) is kept up to date by `EventListener`s subscribed to the bus, which
skip an `eventId` they already applied (delivery is at least once). A channel is a delivery path,
not a history, so rebuilding a read model from scratch needs an event log of your own (a table
where a listener appends every event, or the broker's retained stream). If a read model is eventually consistent, the screen must expect it: show what was
just sent, show how old the data is, or say that the request is being processed.

# Infrastructure layer: `@archi-code/ddd/infrastructure`

Ready adapters for tests, prototypes and the edges of an API:

| Export                                | What it is                                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `InMemoryEventChannel({ delivery }?)` | `EventChannel` inside the process, built on emittery's techniques; `sent` lists what was sent               |
| `ConsoleLogger({ level?, clock? }?)`  | `Logger` that writes one JSON line per entry from `level` up (`info` by default)                            |
| `InMemoryLogger`, `SilentLogger`      | `Logger` that keeps `entries` for tests, and one that writes nothing (the default of every piece that logs) |
| `SystemClock`, `FixedClock(at)`       | `Clock` with the real time, and a test clock with `set(at)` and `advance(ms)`                               |

The package ships no repository: each project writes one per aggregate and technology (see
[Writing a repository](#writing-a-repository)), including the in-memory one its tests use.

`InMemoryEventChannel` is the in-process `EventChannel` behind `DomainEventBus` (see
[Events](#events-the-contract-in-applicationevent)). It reimplements the techniques of
[emittery](https://github.com/sindresorhus/emittery) (MIT) that a channel needs: a `Map` from event
name to a `Set` of handlers, dispatch always after a microtask (no handler runs inside `send`), a
snapshot of the handlers taken when an event is sent (a consumer that starts receiving during the
delivery is not called for it; one closed before its turn is skipped), and two delivery modes:

| `delivery`           | Like emittery's | Behaviour                                                                                                                         |
| -------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `'serial'` (default) | `emitSerial`    | Consumers run one after another, in the order they started receiving; the first failure rejects `send` with its own error         |
| `'parallel'`         | `emit`          | Consumers start together; all of them run, and the failures reject `send` with one `EventDeliveryException` (`errors` holds each) |

Events go one after another in the order of the `send`; a failure stops the events after it. Every
consumer gets the same frozen JSON copy, `send` resolves once the handlers finished, and `sent`
returns a copy of what was sent, in order (for tests).

```ts
import { DomainEventBus, InMemoryEventChannel } from '@archi-code/ddd/infrastructure';

const channel = new InMemoryEventChannel({ delivery: 'parallel' });
const bus = new DomainEventBus<OrderEvent>(channel, events); // events: the EventRegistry of "Events"
await bus.subscribe(new ReserveStockOnOrderPlaced(reserveStock));
await bus.subscribe(new NotifyCustomerOnOrderPlaced(notifyCustomer));
await bus.publish(order.pullDomainEvents());
channel.sent.map((event) => event.eventName); // ['OrderPlaced']
```

## Logging

The application declares the [`Logger` port](#ports); infrastructure ships three providers and
logs on its own only where nobody else sees the error:

| Provider                             | Use                                                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `ConsoleLogger({ level?, clock? }?)` | Production without a logging library, Node and browsers: one JSON line per entry on `console.<level>` |
| `InMemoryLogger`                     | Tests: `entries` lists `{ level, message, context? }` in order (a copy)                               |
| `SilentLogger`                       | Writes nothing; the default when no logger is passed                                                  |

```ts
import type { Logger } from '@archi-code/ddd/application';
import { ConsoleLogger, DomainEventBus, SystemClock } from '@archi-code/ddd/infrastructure';

const logger: Logger = new ConsoleLogger({ level: 'info', clock: new SystemClock() });
logger.warn('stock_low', { sku: 'TORCH-01', units: 2 });
// console.warn: {"time":"2026-10-19T09:30:00.000Z","level":"warn","message":"stock_low","context":{"sku":"TORCH-01","units":2}}

const bus = new DomainEventBus<OrderEvent>(channel, registry, logger);
```

`ConsoleLogger` drops entries below `level` (`debug` < `info` < `warn` < `error`; an unknown level
throws `InternalErrorException`), writes an `Error` in the context with its `name`, `code`,
`message`, `errors`, `stack` and `cause` (which `JSON.stringify` would turn into `{}`), dates
through their `toJSON`, a `bigint` as text and a circular reference as
`'[Circular]'`; a context it cannot read becomes `'[Unserializable]'`, so logging never throws.

What the package logs when it receives a logger:

| Where            | Level   | Message                                                                                                   | Context                                          |
| ---------------- | ------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `DomainEventBus` | `debug` | `domain_events_published` (after the channel accepted them)                                               | `events`: `{ eventName, eventId }[]`, no payload |
| `DomainEventBus` | `info`  | `event_listener_subscribed`, `event_listener_unsubscribed`                                                | `eventName`, `consumer`                          |
| `DomainEventBus` | `warn`  | `event_listener_rejected`: a `DomainException` or `ApplicationException` (such as `ConcurrencyException`) | `eventName`, `consumer`, `eventId`, `error`      |
| `DomainEventBus` | `error` | `event_listener_failed`: any other error, also an event the registry cannot rebuild                       | `eventName`, `consumer`, `eventId`, `error`      |

The bus still rethrows a listener's error after logging it, so the channel keeps its delivery
semantics (the in-memory channel rejects `send`, a broker retries). The rule for your own code is
the same: log an error once, where it is handled (an entry point, a listener's channel), never in
every layer it passes through; keep the message a stable name and put only the data you need in the
context (no passwords, tokens or personal data the entry does not need). Another library plugs in
by implementing `Logger`:

```ts
import pino from 'pino';
import type { LogContext, Logger } from '@archi-code/ddd/application';

class PinoLogger implements Logger {
  constructor(private readonly pino: pino.Logger) {}
  debug(message: string, context?: LogContext): void {
    this.pino.debug(context ?? {}, message);
  }
  info(message: string, context?: LogContext): void {
    this.pino.info(context ?? {}, message);
  }
  warn(message: string, context?: LogContext): void {
    this.pino.warn(context ?? {}, message);
  }
  error(message: string, context?: LogContext): void {
    this.pino.error(context ?? {}, message);
  }
}
```

## Persisting aggregates

The domain knows nothing about persistence: a repository receives an aggregate and stores it.
Each aggregate converts itself: everything it stores is a **value object** (no raw `string`,
`number`, `boolean` or `Date` fields in its state), and it exposes `toPrimitives()` and
`static fromPrimitives()` (its snapshot). There is no mapper in between: the repository calls
those two methods and never reads the aggregate's fields. Follow these rules for every
aggregate:

1. **State is value objects.** Each persisted field is a value object, a composite, a list of them
   or a child entity (`extends Entity`) whose fields are value objects too. A flag is
   `class Shipped extends Required(BooleanType) {}`, never `boolean`; a moment is a `DateType` /
   `CreatedAt`, never `Date`.
2. **Private field + public getter with the same name without `_`** (`private _customer` +
   `get customer()`), or a public `readonly customer`. No private state without its getter: the
   primitives use those names. Derived values are methods (`totalQuantity()`), never getters: a getter is a
   key of `PrimitiveTypes<Order>` that the stored data does not have.
3. **Private constructor and two factories**: a business one (`Order.place(...)`) that validates
   its invariants and records events, and `static fromPrimitives(primitives: PrimitiveTypes<Order>)`
   that rebuilds it from stored data, building each value object from its primitive and recording no
   event. Because value objects validate in their constructor, a corrupt row fails right there
   instead of entering the model.
4. **`toPrimitives(): PrimitiveTypes<Order>`** returns only plain data: `vo.value` of each value
   object and the primitives of each child entity, never a value object.
5. **The repository calls `order.toPrimitives()` and `Order.fromPrimitives(row)`** and never touches
   the aggregate's fields.
6. **One round-trip test per aggregate**: `Order.fromPrimitives(order.toPrimitives()).toPrimitives()`
   equals `order.toPrimitives()`.

The compiler enforces rules 1 and 4 on what is public: a getter that returns a raw `boolean` makes
that key `never` in `PrimitiveTypes<Order>`, so `toPrimitives()` does not compile. Nothing checks
private state at run time: `PrimitiveTypes<Order>` does not see a private field, so a private field
left out of `toPrimitives()` compiles and is lost when saving. Keeping rule 2 (no private state
without its getter) and the round-trip test of rule 6 is the aggregate's responsibility.

```ts
import {
  AggregateRoot,
  BooleanType,
  Composite,
  CreatedAt,
  EventBase,
  IdType,
  NumberType,
  Required,
  StringType,
} from '@archi-code/ddd/domain';
import type { EventMetadata, PrimitiveTypes } from '@archi-code/ddd/domain';
import { DomainException } from '@archi-code/ddd/exceptions';

class OrderId extends IdType<'OrderId'> {}
class CustomerName extends Required(StringType) {}
class Shipped extends Required(BooleanType) {}
class Sku extends Required(StringType) {}
class Quantity extends Required(NumberType) {}

class OrderLine extends Composite({ sku: Sku, quantity: Quantity }) {}

class OrderPlaced extends EventBase {
  static readonly eventName = 'OrderPlaced';

  constructor(
    readonly orderId: string,
    readonly customer: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

class OrderShipped extends EventBase {
  static readonly eventName = 'OrderShipped';

  constructor(
    readonly orderId: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

type OrderEvent = OrderPlaced | OrderShipped;

class OrderAlreadyShipped extends DomainException {
  constructor(orderId: string) {
    super(`Order ${orderId} is already shipped`, ['ORD002']);
  }
}

class Order extends AggregateRoot<OrderId, OrderEvent> {
  private constructor(
    id: OrderId,
    private readonly _customer: CustomerName,
    private _shipped: Shipped,
    private _lines: OrderLine[],
    private readonly _placedAt: CreatedAt,
  ) {
    super(id);
  }

  static place(id: OrderId, customer: CustomerName, clock: { now(): Date }): Order {
    const order = new Order(id, customer, new Shipped(false), [], CreatedAt.now(clock));
    order.record(new OrderPlaced(id.value, customer.value, { clock }));
    return order;
  }

  static fromPrimitives(primitives: PrimitiveTypes<Order>): Order {
    return new Order(
      new OrderId(primitives.id),
      new CustomerName(primitives.customer),
      new Shipped(primitives.shipped),
      primitives.lines.map((line) => OrderLine.fromPrimitives(line)),
      new CreatedAt(primitives.placedAt),
    );
  }

  get customer(): CustomerName {
    return this._customer;
  }

  get shipped(): Shipped {
    return this._shipped;
  }

  get lines(): OrderLine[] {
    return [...this._lines];
  }

  get placedAt(): CreatedAt {
    return this._placedAt;
  }

  addLine(line: OrderLine): void {
    if (this._shipped.value) {
      throw new OrderAlreadyShipped(this.id.value);
    }
    this._lines = [...this._lines, line];
  }

  ship(clock: { now(): Date }): void {
    if (this._shipped.value) {
      throw new OrderAlreadyShipped(this.id.value);
    }
    this._shipped = new Shipped(true);
    this.record(new OrderShipped(this.id.value, { clock }));
  }

  totalQuantity(): number {
    return this._lines.reduce((total, line) => total + line.quantity.value, 0);
  }

  toPrimitives(): PrimitiveTypes<Order> {
    return {
      id: this.id.value,
      customer: this.customer.value,
      shipped: this.shipped.value,
      lines: this._lines.map((line) => line.toPrimitives()),
      placedAt: this.placedAt.value,
    };
  }
}

const order = Order.place(OrderId.generate(), new CustomerName('Ana'), { now: () => new Date() });
const stored = order.toPrimitives(); // plain data the repository writes next to its version
Order.fromPrimitives(stored); // what the repository returns on load
```

### Writing a repository

A repository is written once per aggregate and per technology, and implements the roles of the
domain it supports (`AggregateFinder`, `AggregateSaver`, `AggregateRemover`):

- **One per aggregate**: it knows the aggregate it rebuilds, so nothing tells it which one. There
  is no generic repository shared by several aggregates.
- **The constructor receives only its technology** (a Mongo collection, a Postgres pool…), never
  an aggregate class nor a mapper. Aggregates only go in and out through its methods: `save(order)`,
  `remove(order)`, `findById(id)` → `Order | null`.
- **The aggregate converts itself**: `order.toPrimitives()` and `Order.fromPrimitives(row)` are
  the aggregate's snapshot, never a domain service nor a mapper. The repository calls them
  directly, maps the primitives to its storage format and keeps the version of each aggregate
  itself.
- **It owns persistence**: atomic writes, the version check, connections and driver errors (see
  [Persistence belongs to the repository](#persistence-belongs-to-the-repository)).

The in-memory repository of your tests is written the same way, in `test/support/`:

```ts
import type {
  AggregateFinder,
  AggregateRemover,
  AggregateSaver,
  PrimitiveTypes,
} from '@archi-code/ddd/domain';
import { ConcurrencyException } from '@archi-code/ddd/exceptions';

export class InMemoryOrderRepository
  implements AggregateFinder<Order>, AggregateSaver<Order>, AggregateRemover<Order>
{
  private readonly rows = new Map<string, { version: number; primitives: PrimitiveTypes<Order> }>();
  private readonly versions = new WeakMap<Order, number>();

  async findById(id: OrderId): Promise<Order | null> {
    const row = this.rows.get(id.value);
    if (row === undefined) {
      return null;
    }
    const order = Order.fromPrimitives(structuredClone(row.primitives));
    this.versions.set(order, row.version);
    return order;
  }

  async save(order: Order): Promise<void> {
    const version = this.checkedVersion(order);
    const primitives = structuredClone(order.toPrimitives());
    this.rows.set(order.id.value, { version: version + 1, primitives });
    this.versions.set(order, version + 1);
  }

  async remove(order: Order): Promise<void> {
    this.checkedVersion(order);
    this.rows.delete(order.id.value);
  }

  private checkedVersion(order: Order): number {
    const key = order.id.value;
    const version = this.versions.get(order) ?? 0;
    if ((this.rows.get(key)?.version ?? 0) !== version) {
      throw new ConcurrencyException('Order', key, version);
    }
    return version;
  }
}

const orders = new InMemoryOrderRepository();
await orders.save(Order.place(new OrderId(id), new CustomerName('Ana'), clock));
const byAna = (await orders.findById(new OrderId(id)))!; // version 1, a copy
const byLuis = (await orders.findById(new OrderId(id)))!; // version 1, another copy
byAna.ship(clock);
await orders.save(byAna); // stored as version 2
byLuis.addLine(new OrderLine({ sku: new Sku('TORCH-01'), quantity: new Quantity(1) }));
await orders.save(byLuis);
// ConcurrencyException: Order with ID … was changed by someone else: expected version 1.
```

A Mongo repository has the same shape; only the storage changes:

```ts
class MongoOrderRepository
  implements AggregateFinder<Order>, AggregateSaver<Order>, AggregateRemover<Order>
{
  private readonly versions = new WeakMap<Order, number>();

  constructor(private readonly collection: Collection<OrderDocument>) {}

  async findById(id: OrderId): Promise<Order | null> {
    const document = await this.collection.findOne({ _id: id.value });
    if (document === null) {
      return null;
    }
    const order = Order.fromPrimitives(document.data);
    this.versions.set(order, document.version);
    return order;
  }

  // save: version = versions.get(order) ?? 0; updateOne({ _id, version }, { $set: { data, version: version + 1 } }),
  // or insertOne when version is 0; no match → ConcurrencyException; then versions.set(order, version + 1)
}
```

# Exceptions: `@archi-code/ddd/exceptions`

All of them extend `AbstractException` (which extends `Error`) and have:

| Member        | Description                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------- |
| `name`        | Class name                                                                                    |
| `message`     | Message                                                                                       |
| `code`        | The last code in the chain (`'APP002'`, or yours if you pass one)                             |
| `description` | Every code in readable form: `'Application Exception (APP000), Aggregate Not Found (APP002)'` |
| `timestamp`   | Creation `Date` (a new copy on every read, so it cannot be changed)                           |
| `cause`       | The error passed as `{ cause }`, if any                                                       |
| `print()`     | `'[<description>]: <message>, <ISO timestamp>'`                                               |
| `toJSON()`    | `{ name, message, code, description, timestamp }` (`timestamp` in ISO 8601)                   |

| Class                        | Extends                   | Constructor                                                          | Codes              | Message                                                                           |
| ---------------------------- | ------------------------- | -------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------- |
| `DomainException`            | `AbstractException`       | `(message, exceptionCodes = [], options?)`                           | `DOM000` + yours   | `message`                                                                         |
| `ValidationException`        | `DomainException`         | `(errors: ValidationIssueInput[])`, keeps them as `ValidationIssue`s | `DOM000`, `DOM001` | `Validation failed, <field: message, joined with ", ">`                           |
| `TypePrimitiveException`     | `DomainException`         | `(expectedType, receivedValue, template?)`                           | `DOM000`, `DOM003` | `Validation Error: Expected a valid <expectedType>, but received <value>.`        |
| `RequiredValueException`     | `DomainException`         | `(typeName, receivedValue)`                                          | `DOM000`, `DOM004` | `Validation Error: <typeName> is required, but received <value>.`                 |
| `ApplicationException`       | `AbstractException`       | `(message, exceptionCodes = [], options?)`                           | `APP000` + yours   | `message`                                                                         |
| `InfrastructureException`    | `AbstractException`       | `(message, exceptionCodes = [], options?)`                           | `INF000` + yours   | `message`                                                                         |
| `InternalErrorException`     | `InfrastructureException` | `(message, options?)`                                                | `INF000`, `INF001` | `Failed, internal error: <message>`                                               |
| `ConcurrencyException`       | `ApplicationException`    | `(aggregateName, id, expectedVersion, options?)`                     | `APP000`, `APP001` | `<aggregateName> with ID <id> was changed by someone else: expected version <n>.` |
| `AggregateNotFoundException` | `ApplicationException`    | `(entity: string, id: string, options?)`                             | `APP000`, `APP002` | `<entity> with ID <id> not found.`                                                |
| `NotAllowedException`        | `ApplicationException`    | `(message, options?)`                                                | `APP000`, `APP003` | `message`                                                                         |
| `UnknownEventException`      | `InfrastructureException` | `(eventName)`                                                        | `INF000`, `INF002` | `Unknown event "<eventName>": register it before reading it.`                     |
| `EventDeliveryException`     | `InfrastructureException` | `(eventName, errors, consumers)`                                     | `INF000`, `INF003` | `<n> of <consumers> consumers of "<eventName>" failed.` (`errors`: each failure)  |

`options` is `{ cause }`: keep the original error when you wrap it. A `ValidationIssueInput` is a
`ValidationIssue` (`{ field: string | null; code: string; message: string }`) whose `code` is
optional: it defaults to `'DOM001'`. `TypePrimitiveException` and
`RequiredValueException` are the ones value objects throw; the `template` of
`TypePrimitiveException` replaces `'Expected a valid '`. Both quote at most 64 characters of the
value they received (`"…"` marks the cut), so a long text pasted into a field, or a whole object,
is never copied into logs or answers. The built-in codes are exported as the
`ExceptionCode` enum (`ExceptionCode.AggregateNotFound === 'APP002'`).

`AggregateNotFoundException` and `NotAllowedException` belong to the application: a use case
throws the first when the aggregate it needs is not there (a repository returns `null`) and the
second when the requester may not run the action (authorization is the use case's job; a rule of
the business, such as "only pending orders can be cancelled", stays in the aggregate).

The built-in classes recognize their instances across the CJS and ESM builds: an
`AggregateNotFoundException` thrown by the ESM build is `instanceof` the CJS `ApplicationException` and
`AggregateNotFoundException` (they match by code). Your own subclasses use the normal `instanceof`.

```ts
import {
  AggregateNotFoundException,
  ApplicationException,
  DomainException,
  ExceptionCode,
  InternalErrorException,
} from '@archi-code/ddd/exceptions';

const notFound = new AggregateNotFoundException('User', '42');
notFound.code === ExceptionCode.AggregateNotFound; // true
notFound.message; // 'User with ID 42 not found.'
notFound.code; // 'APP002'
notFound.description; // 'Application Exception (APP000), Aggregate Not Found (APP002)'
notFound instanceof ApplicationException; // true

new InternalErrorException('timeout').toJSON();
// {
//   name: 'InternalErrorException',
//   message: 'Failed, internal error: timeout',
//   code: 'INF001',
//   description: 'Infrastructure Exception (INF000), Internal Error (INF001)',
//   timestamp: '2026-10-13T11:52:00.428Z'
// }

try {
  await collection.insertOne(document);
} catch (error) {
  throw new InternalErrorException('saving order', { cause: error });
}
```

Custom exceptions: extend the one for their layer and pass your codes. In `description` a custom
code appears with the class name:

```ts
class OrderCancelledException extends DomainException {
  constructor(orderId: string) {
    super(`Order ${orderId} is cancelled`, ['ORD001']);
  }
}

const error = new OrderCancelledException('7');
error.code; // 'ORD001'
error.description; // 'Domain Exception (DOM000), OrderCancelledException (ORD001)'
```

### Translating errors at an entry point

The package speaks no protocol: HTTP, gRPC, a queue consumer or a CLI each translate errors in
their own entry point. `ExceptionClassifier.classify(error)` gives them the one decision every
protocol shares, the kind of failure, as an `ExceptionKind`; it takes any thrown value and
recognizes the exceptions of the other build (CJS/ESM) too:

| Error                                                 | `ExceptionKind`            | Usual HTTP status |
| ----------------------------------------------------- | -------------------------- | ----------------- |
| `AggregateNotFoundException`                          | `NotFound` (`'not_found'`) | 404               |
| `NotAllowedException`                                 | `NotAllowed`               | 403               |
| `ConcurrencyException`                                | `Conflict`                 | 409               |
| `TypePrimitiveException`, `RequiredValueException`    | `Malformed`                | 400               |
| `ValidationException` and any other `DomainException` | `Invalid`                  | 422               |
| any other `ApplicationException`                      | `Rejected`                 | 400               |
| `InfrastructureException` and anything unknown        | `Internal`                 | 500               |

The entry point decides the rest: the status or code of its protocol, the codes of your own
exceptions (`error.code`), the body, and logging the failure once. Never send the message of an
`Internal` failure to the client (SQL, hosts, secrets…), and send the `errors` of a
`ValidationException` so it can mark each field:

```ts
import {
  AbstractException,
  ExceptionClassifier,
  ExceptionKind,
  ValidationException,
} from '@archi-code/ddd/exceptions';

const STATUS: Record<ExceptionKind, number> = {
  [ExceptionKind.NotFound]: 404,
  [ExceptionKind.NotAllowed]: 403,
  [ExceptionKind.Conflict]: 409,
  [ExceptionKind.Malformed]: 400,
  [ExceptionKind.Invalid]: 422,
  [ExceptionKind.Rejected]: 400,
  [ExceptionKind.Internal]: 500,
};

app.use((error, req, res, next) => {
  const kind = ExceptionClassifier.classify(error);
  const code = error instanceof AbstractException ? error.code : 'E000';
  if (kind === ExceptionKind.Internal) {
    logger.error('http_request_failed', { code, error });
    return res.status(500).json({ code, message: 'Internal server error' });
  }
  const errors = error instanceof ValidationException ? error.errors : undefined;
  res.status(STATUS[kind]).json({ code, message: error.message, errors });
});
```

## Full example

```ts
import { Validations } from '@archi-code/validation';
import {
  AggregateRoot,
  BooleanType,
  CreatedAt,
  EventBase,
  IdType,
  Required,
  StringType,
  ValueObjects,
} from '@archi-code/ddd/domain';
import {
  AggregateNotFoundException,
  DomainException,
  ExceptionClassifier,
} from '@archi-code/ddd/exceptions';
import type {
  AggregateFinder,
  AggregateSaver,
  EventMetadata,
  PrimitiveTypes,
} from '@archi-code/ddd/domain';
import { EventListener, ListensTo, UseCase } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';
import {
  DomainEventBus,
  EventRegistry,
  FixedClock,
  InMemoryEventChannel,
} from '@archi-code/ddd/infrastructure';
import { InMemoryUserRepository } from './test/support/in-memory-user-repository';

class UserId extends IdType<'UserId'> {}
class Name extends Required(StringType) {}
class Blocked extends Required(BooleanType) {}

@Validations([{ validator: 'isEmail' }])
class Email extends Required(StringType) {}

class UserRegistered extends EventBase {
  static readonly eventName = 'UserRegistered';

  constructor(
    readonly userId: string,
    readonly email: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

class UserRenamed extends EventBase {
  static readonly eventName = 'UserRenamed';

  constructor(
    readonly userId: string,
    readonly name: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

type UserEvent = UserRegistered | UserRenamed;

class UserBlockedException extends DomainException {
  constructor(userId: string) {
    super(`User ${userId} is blocked`, ['USR001']);
  }
}

class User extends AggregateRoot<UserId, UserEvent> {
  private constructor(
    id: UserId,
    private _name: Name,
    readonly email: Email,
    private _blocked: Blocked,
    readonly createdAt: CreatedAt,
  ) {
    super(id);
  }

  static register(name: Name, email: Email, clock: { now(): Date }): User {
    const user = new User(UserId.generate(), name, email, new Blocked(false), CreatedAt.now(clock));
    user.record(new UserRegistered(user.id.value, email.value, { clock }));
    return user;
  }

  static fromPrimitives(primitives: PrimitiveTypes<User>): User {
    return new User(
      new UserId(primitives.id),
      new Name(primitives.name),
      new Email(primitives.email),
      new Blocked(primitives.blocked),
      new CreatedAt(primitives.createdAt),
    );
  }

  get name(): Name {
    return this._name;
  }

  get blocked(): Blocked {
    return this._blocked;
  }

  rename(name: Name, clock: { now(): Date }): void {
    if (this._blocked.value) {
      throw new UserBlockedException(this.id.value);
    }
    this._name = name;
    this.record(new UserRenamed(this.id.value, name.value, { clock }));
  }

  toPrimitives(): PrimitiveTypes<User> {
    return {
      id: this.id.value,
      name: this.name.value,
      email: this.email.value,
      blocked: this.blocked.value,
      createdAt: this.createdAt.value,
    };
  }
}

interface RegisterUserCommand {
  name: Name;
  email: Email;
}

class RegisterUser extends UseCase<{ name: string; email: string }, RegisterUserCommand, string> {
  constructor(
    private readonly users: AggregateSaver<User>,
    private readonly bus: EventBus<UserEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: { name: string; email: string }): RegisterUserCommand {
    return ValueObjects.build({
      name: () => new Name(input.name),
      email: () => new Email(input.email),
    });
  }

  protected async handle(command: RegisterUserCommand): Promise<string> {
    const user = User.register(command.name, command.email, this.clock);
    await this.users.save(user);
    await this.bus.publish(user.pullDomainEvents());
    return user.id.value;
  }
}

interface RenameUserCommand {
  id: UserId;
  name: Name;
}

class RenameUser extends UseCase<{ id: string; name: string }, RenameUserCommand, void> {
  constructor(
    private readonly users: AggregateFinder<User> & AggregateSaver<User>,
    private readonly bus: EventBus<UserEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: { id: string; name: string }): RenameUserCommand {
    return { id: new UserId(input.id), name: new Name(input.name) };
  }

  protected async handle(command: RenameUserCommand): Promise<void> {
    const user = await this.users.findById(command.id);
    if (user === null) {
      throw new AggregateNotFoundException('User', command.id.value);
    }
    user.rename(command.name, this.clock);
    await this.users.save(user);
    await this.bus.publish(user.pullDomainEvents());
  }
}

class SendWelcomeEmail extends UseCase<{ email: string }, Email, void> {
  constructor(private readonly outbox: string[]) {
    super();
  }

  protected toCommand(input: { email: string }): Email {
    return new Email(input.email);
  }

  protected handle(email: Email): void {
    this.outbox.push(`Welcome, ${email.value}`);
  }
}

@ListensTo(UserRegistered, { consumer: 'send-welcome-email-on-user-registered' })
class SendWelcomeEmailOnUserRegistered extends EventListener<UserRegistered> {
  constructor(private readonly sendWelcomeEmail: SendWelcomeEmail) {
    super();
  }

  async handle(event: UserRegistered): Promise<void> {
    await this.sendWelcomeEmail.execute({ email: event.email });
  }
}

const emails: string[] = [];
const users = new InMemoryUserRepository(); // written like InMemoryOrderRepository
const channel = new InMemoryEventChannel();
const events = new EventRegistry<UserEvent>()
  .register(
    UserRegistered,
    (json) => new UserRegistered(json.userId as string, json.email as string, json),
  )
  .register(
    UserRenamed,
    (json) => new UserRenamed(json.userId as string, json.name as string, json),
  );
const bus = new DomainEventBus<UserEvent>(channel, events);
await bus.subscribe(new SendWelcomeEmailOnUserRegistered(new SendWelcomeEmail(emails)));
const clock = new FixedClock('2026-01-01T09:00:00Z');

const id = await new RegisterUser(users, bus, clock).execute({
  name: 'Ana',
  email: 'ana@example.com',
});
await new RenameUser(users, bus, clock).execute({ id, name: 'Ana María' });

channel.sent.map((event) => event.eventName); // ['UserRegistered', 'UserRenamed']
emails; // ['Welcome, ana@example.com']
(await users.findById(new UserId(id)))?.toPrimitives();
// { id, name: 'Ana María', email: 'ana@example.com', blocked: false, createdAt: 2026-01-01T09:00:00.000Z }

await new RenameUser(users, bus, clock)
  .execute({ id: UserId.random(), name: 'Eva' })
  .catch((error) => ExceptionClassifier.classify(error));
// 'not_found'
await new RegisterUser(users, bus, clock)
  .execute({ name: 'Eva', email: 'x' })
  .catch((error) => ExceptionClassifier.classify(error));
// 'invalid'
```

## Exports

`@archi-code/ddd/exceptions`:

| Export                                                                                                                                       | Kind           |
| -------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `AbstractException`                                                                                                                          | abstract class |
| `DomainException`, `ApplicationException`, `InfrastructureException`                                                                         | classes        |
| `ValidationException`, `AggregateNotFoundException`, `TypePrimitiveException`, `RequiredValueException`, `InternalErrorException`            | classes        |
| `ConcurrencyException`, `NotAllowedException`, `UnknownEventException`, `EventDeliveryException`                                             | classes        |
| `ExceptionCode`, `ExceptionKind`                                                                                                             | enums          |
| `ExceptionClassifier` (`classify`)                                                                                                           | class          |
| `ExceptionOptions`, `ValidationIssue` (`{ field: string \| null; code: string; message: string }`), `ValidationIssueInput` (`code` optional) | types          |

`@archi-code/ddd/domain`:

| Export                                                                                                          | Kind               |
| --------------------------------------------------------------------------------------------------------------- | ------------------ |
| `AbstractType`                                                                                                  | abstract class     |
| `StringType`, `NumberType`, `BooleanType`, `DateType`, `UuidType`, `JsonType`                                   | classes            |
| `EnumType`, `ArrayType`                                                                                         | abstract classes   |
| `CreatedAt`, `UpdatedAt`, `IdType`                                                                              | classes (required) |
| `Required`, `Composite`                                                                                         | functions          |
| `Specification`                                                                                                 | abstract class     |
| `CompositeSchema`, `CompositeProps`, `CompositePrimitives`, `CompositeInput`, `CompositeType`, `CompositeValue` | types              |
| `ValueObjects` (`build`, `buildList`)                                                                           | class              |
| `Immutable` (`freeze`, `date`)                                                                                  | class              |
| `Entity`, `AggregateRoot`, `EventBase`                                                                          | abstract classes   |
| `AggregateFinder`, `AggregateSaver`, `AggregateRemover`                                                         | types (contracts)  |
| `RequiredType`, `JsonTypeValue`, `PrimitiveType`, `PrimitiveTypes`, `DataTypes`                                 | types              |
| `EventMetadata`, `SerializedEvent`, `EventClass`                                                                | types              |
| `EntityId`, `SatisfiedBy`                                                                                       | types              |
| `Properties`, `PropertiesData`, `MutablePropertiesData`, `Methods`, `MethodsAndProperties`                      | types              |

`@archi-code/ddd/application`:

| Export                     | Kind                             |
| -------------------------- | -------------------------------- |
| `UseCase`, `EventListener` | abstract classes                 |
| `ListensTo`                | decorator                        |
| `ListensToOptions`         | type (`{ consumer }`)            |
| `ListenerSubscription`     | type (`{ eventName, consumer }`) |
| `EventBus`                 | type (event port)                |
| `Clock`, `Logger`          | types (ports)                    |
| `LogLevel`, `LogContext`   | types (logger port)              |

`@archi-code/ddd/infrastructure`:

| Export                                                            | Kind                   |
| ----------------------------------------------------------------- | ---------------------- |
| `InMemoryEventChannel`, `SystemClock`, `FixedClock`               | classes                |
| `ConsoleLogger`, `InMemoryLogger`, `SilentLogger`                 | classes (loggers)      |
| `DomainEventBus`, `EventRegistry`                                 | classes (event wiring) |
| `EventChannel`, `ChannelHandler`, `ChannelSubscription`           | types (channel port)   |
| `Subscription`, `EventFactory`                                    | types                  |
| `InMemoryEventChannelOptions`, `ConsoleLoggerOptions`, `LogEntry` | types                  |

## AI assistant skill

The package includes `SKILL.md`, a Claude Code skill with the rules, patterns and common mistakes of
`@archi-code/ddd`, and `ddd-skills/`, a suite of Domain-Driven Design skills (discovery and Event
Storming, subdomains and bounded contexts, context mapping, architecture, value objects and
entities, aggregates, events, repositories, application services, event sourcing and CQRS, audits;
written in Spanish, each rule with its source in Vernon's books and _DDD in PHP_). `SKILL.md` is
the only skill you install and the only one you call: it classifies each request, reads the
matching skill of the suite from `node_modules/@archi-code/ddd/ddd-skills/`, and turns the
suite's examples into code that uses this package. For the full API it points to this README
inside `node_modules/@archi-code/ddd`, so both stay valid when you update the package. Its rules,
patterns and common mistakes are split into `ddd-skills/archi-code-ddd/` (where each class goes,
the translation from the suite, the rules per layer, patterns, what not to do), which `SKILL.md`
reads from the package too. Do not copy `ddd-skills/` into `.claude/skills/`. To install it in your project:

```bash
mkdir -p .claude/skills/archi-code-ddd && cp node_modules/@archi-code/ddd/SKILL.md .claude/skills/archi-code-ddd/SKILL.md
```

### How to use

Invoke it with a request:

```text
/archi-code-ddd create a required Email value object that validates the format
```

Or ask for the task without naming it, and Claude loads it on its own because it matches its
description:

```text
Add a ChangeEmail use case that loads the User, records an EmailChanged event and saves it
```

Design questions go through the same skill, which reads the right part of the suite first:

```text
/archi-code-ddd we sell welding courses and simulators: which bounded contexts should we have?
```

It also works for reviewing code that already uses the package:

```text
/archi-code-ddd review src/domain and fix whatever breaks the package rules
```

With the skill loaded, Claude follows its rules, avoids the mistakes in its "What not to do" list
and, before using anything the skill does not show, reads this README in `node_modules`.

### Keeping it up to date

- The copy does not update itself: after updating `@archi-code/ddd`, run the command above again.
- Commit `.claude/skills/archi-code-ddd/` to the repository so the whole team uses it.

## License

MIT

The in-memory event channel reimplements techniques of
[emittery](https://github.com/sindresorhus/emittery), MIT License, Copyright (c) Sindre Sorhus.
