# SPEC: implementation rules for `packages/ddd/example/src/contexts`

<!-- Audience: LLM agents that generate, change or review code in src/contexts. Not written for human reading. -->

## 0. Contract of this document

- Scope: every file under `src/contexts/` plus `src/shop.ts`, `src/platform/http/http.ts`, `src/ddd/*.ts`.
- Keywords: **MUST** / **MUST NOT** = hard rule; **SHOULD** = default unless a rule below says otherwise; **MAY** = allowed.
- Rule ids (`G1`, `D-AGG3`, `A-RUC2`…) are stable; cite them in reviews.
- Source of truth order: (1) this spec, (2) the code it cites, (3) the `@archi-code/ddd` README. If spec and code disagree, report the mismatch; do not silently follow either.
- Placeholders in templates: `<Context>` (`Sales`), `<context>` (`sales`), `<Aggregate>` (`Order`), `<aggregate>` (`order`), `<Aggregates>` (`Orders`), `<Action>` (`MarkOrderPaid`), `<action>` (`mark-order-paid`), `<Event>` (`OrderPaid`), `<event>` (`order-paid`), `<PastAction>` (`Paid`), `<past_action>` (`paid`), `<CODE>` (`SAL`).
- Templates compile when placeholders are replaced and the file is placed at the path its rule gives.
- Verification after any change: `npm run check:types` in `packages/ddd` (runs `tsc -p example/tsconfig.json`) and `npm run check:format` at the repo root. The example has no specs and no runner.

## 1. Global rules (G)

| Id  | Rule                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | All code, identifiers, messages and docs are English.                                                                                                                                                                                                                                                                                                                                        |
| G2  | No comments, no docblocks, no section banners. Names carry meaning.                                                                                                                                                                                                                                                                                                                          |
| G3  | Named exports only. No `export default`.                                                                                                                                                                                                                                                                                                                                                     |
| G4  | One exported class per file. A file MAY also export the interfaces/enums listed for its kind (enum file, use case `Input`/`Command`, adapter raw shapes, controller `UseCases`).                                                                                                                                                                                                             |
| G5  | Type-only imports use `import type`. Values and types from the same module go in two statements: `import { EventBase } from '…';` + `import type { EventMetadata } from '…';`.                                                                                                                                                                                                               |
| G6  | Package code is imported only through `src/ddd/<layer>.ts` (`ddd/domain`, `ddd/application`, `ddd/infrastructure`), which stand for `@archi-code/ddd/<layer>`. Validation rules import `Validations` from `@archi-code/validation`. No other npm package.                                                                                                                                    |
| G7  | Imports are relative and point to the declaring file, never to a folder or an `index.ts`.                                                                                                                                                                                                                                                                                                    |
| G8  | A context MUST NOT import another context. Only `shared-kernel/money` is shared. Cross-context data travels only as events (A-EVC).                                                                                                                                                                                                                                                          |
| G9  | Layer import matrix (allowed targets): `domain` → `ddd/domain`, own `domain`, `shared-kernel`. `application` → `ddd/domain`, `ddd/application`, own `domain`, own `application`, `shared-kernel`. `infrastructure` → `ddd/*`, own `domain`, own `application`. `interfaces` → `ddd/application`, own `application`, `platform/http`. `composition.ts` → anything of its context and `ddd/*`. |
| G10 | Prettier: single quotes, trailing commas, width 100, 2 spaces, semicolons. Run `npm run fix:format` (root) instead of formatting by hand.                                                                                                                                                                                                                                                    |
| G11 | Everything is in memory. Business time comes only from `Clock` (`clock.now()`, `CreatedAt.now(clock)`); never `Date.now()` or `new Date()` without a clock value.                                                                                                                                                                                                                            |

### 1.1 Tree

```
src/
  ddd/{domain,application,infrastructure}.ts   export * from '../../../src/<layer>/index'
  platform/http/http.ts                        HttpRequest, HttpResponse, Http (error → status)
  shop.ts                                      Shop.open / close: one channel, three contexts
  contexts/
    shared-kernel/money/                       Money, Cents, CentsAmount, MoneyCurrency (+ Currency enum), CurrencyMismatch
    <context>/                                 sales | payments | shipping
      domain/
        aggregate/       <Aggregate>.ts, New<Child>.ts
        entity/          <Entity>.ts
        value-object/    <ValueObject>.ts
        event/           <Aggregate><PastAction>DomainEvent.ts, <Aggregate>Event.ts
        exception/       <WhatWentWrong>.ts
        service/         <Service>.ts, <Port>.ts
        specification/   <Rule>.ts
      application/
        <action>/        user use case:     <action>.ts [+ data types]
        <action>/        reaction use case: <action>-on-<event>.ts [+ <event>-domain-event.ts] [+ data types]
        <read-model>/    <row>.ts, <row>-store.ts, <rows>.ts, <row>-projection.ts, <action>/<action>-on-<event>.ts
      infrastructure/
        persistence/in-memory-<aggregate>-repository.ts
        <area>/in-memory-<port>.ts
      interfaces/http/<aggregates>-controller.ts
      composition.ts
```

### 1.2 File naming

| Location                        | Style                         | Example                                                               |
| ------------------------------- | ----------------------------- | --------------------------------------------------------------------- |
| `domain/**`, `shared-kernel/**` | PascalCase = class name       | `OrderNotModifiable.ts`                                               |
| everything else                 | kebab-case of the main export | `confirm-transfer-received.ts`, `request-payment-on-order-created.ts` |

### 1.3 Relative import prefixes

| From a file in                                          | to `ddd/<layer>`             | to own `domain/<kind>/X`   | to `shared-kernel/money/X`           |
| ------------------------------------------------------- | ---------------------------- | -------------------------- | ------------------------------------ |
| `contexts/<context>/domain/<kind>/`                     | `../../../../ddd/<layer>`    | `../<kind>/X`              | `../../../shared-kernel/money/X`     |
| `contexts/<context>/application/<folder>/`              | `../../../../ddd/<layer>`    | `../../domain/<kind>/X`    | `../../../shared-kernel/money/X`     |
| `contexts/<context>/application/<read-model>/<action>/` | `../../../../../ddd/<layer>` | `../../../domain/<kind>/X` | `../../../../shared-kernel/money/X`  |
| `contexts/<context>/infrastructure/<area>/`             | `../../../../ddd/<layer>`    | `../../domain/<kind>/X`    | —                                    |
| `contexts/<context>/interfaces/http/`                   | `../../../../ddd/<layer>`    | —                          | — (`../../../../platform/http/http`) |
| `contexts/<context>/composition.ts`                     | `../../ddd/<layer>`          | `./domain/<kind>/X`        | —                                    |
| `contexts/shared-kernel/money/`                         | `../../../ddd/<layer>`       | —                          | `./X`                                |

## 2. Domain layer (D)

### 2.1 Kind → location → base class

| Kind                                     | Folder           | File / class name                                  | Extends / is                                                                                          |
| ---------------------------------------- | ---------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| aggregate root                           | `aggregate/`     | `<Aggregate>`                                      | `AggregateRoot<<Aggregate>Id, <Aggregate>Event>`                                                      |
| shape received by `create`               | `aggregate/`     | `New<Child>`                                       | `interface` of value objects                                                                          |
| child entity                             | `entity/`        | `<Entity>`                                         | `Entity<<IdVO>>`                                                                                      |
| id of an aggregate                       | `value-object/`  | `<Aggregate>Id`                                    | `IdType<'<Aggregate>Id'>`                                                                             |
| reference to another context's aggregate | `value-object/`  | `<Other>Reference`                                 | `Required(UuidType)`                                                                                  |
| optional uuid                            | `value-object/`  | `<Name>`                                           | `UuidType`                                                                                            |
| mandatory text / number / boolean / date | `value-object/`  | `<Name>`                                           | `Required(StringType \| NumberType \| BooleanType \| DateType)`                                       |
| optional text                            | `value-object/`  | `<Name>`                                           | `StringType` (built with `null` for no value)                                                         |
| enum, mandatory                          | `value-object/`  | file `<Enum>Type.ts`                               | `enum <Enum>` + `<Enum>Option extends EnumType<<Enum>>` + `<Enum>Type extends Required(<Enum>Option)` |
| enum, optional                           | `value-object/`  | file `<Enum>Type.ts`                               | `enum <Enum>` + `<Enum>Type extends EnumType<<Enum>>`                                                 |
| list                                     | `value-object/`  | `<Item>List` + `<Item>s` (two files)               | `ArrayType<<Item>>` + `Required(<Item>List)`                                                          |
| custom conversion                        | `value-object/`  | e.g. `CentsAmount` + `Cents` (two files)           | `AbstractType<T>` + `Required(...)`                                                                   |
| several fields                           | `value-object/`  | `<Name>`                                           | `Composite({ field: VOClass \| CompositeClass \| [ItemClass] })`                                      |
| free-form JSON                           | `value-object/`  | `<Name>Data`, `<Name>Json`, `<Name>` (three files) | `interface … extends JsonTypeValue`, `JsonType<<Name>Data>`, `Required(<Name>Json)`                   |
| domain event                             | `event/`         | `<Aggregate><PastAction>DomainEvent`               | `EventBase`                                                                                           |
| event union                              | `event/`         | `<Aggregate>Event`                                 | `type` union of every event of the aggregate                                                          |
| business error                           | `exception/`     | `<WhatWentWrong>` (no `Exception` suffix)          | `DomainException`                                                                                     |
| specification                            | `specification/` | `<Rule>`                                           | `Specification<<Aggregate>>`                                                                          |
| domain service                           | `service/`       | `<Service>`                                        | plain class                                                                                           |
| domain port                              | `service/`       | `<Port>`                                           | `interface`                                                                                           |

### 2.2 Aggregates (D-AGG)

| Id      | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-AGG1  | Member order: local `interface Clock { now(): Date }` (above the class) → `private static readonly` business constants → fields → public constructor → `static create` → `static fromPrimitives` → getters → public queries → business methods → `toPrimitives` → private helpers.                                                                                                                                                                                                                                                                                               |
| D-AGG2  | MUST NOT import `Clock` from `ddd/application`; declare the local `Clock` interface.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| D-AGG3  | Fields: never-changing → `readonly <name>`; changing → `private _<name>` + `get <name>()`. `readonly createdAt: CreatedAt` and `private _updatedAt: UpdatedAt` (+ getter) are the last two fields.                                                                                                                                                                                                                                                                                                                                                                               |
| D-AGG4  | Field types: value objects, composites, arrays of child entities. Never primitives, `Date`, plain objects.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| D-AGG5  | Constructor: `public`; receives every field already built (id first, `createdAt`, `updatedAt` last); `super(id)`; assigns. No checks, no events, no defaults. `fromPrimitives` and `create` both use it.                                                                                                                                                                                                                                                                                                                                                                         |
| D-AGG6  | `static create(id, ...valueObjects, clock: Clock): <Aggregate>`: receives the id and value objects already built, clock last; builds child entities from `New<Child>` shapes (assigns their ids); sets initial state (`new <Status>Type(<Status>.<INITIAL>)`, `new <OptionalVO>(null)`, `CreatedAt.now(clock)`, `UpdatedAt.now(clock)`) and calls the constructor; checks creation invariants (on the input before building, or with private `assert…()` after) throwing business errors; records `<Aggregate>CreatedDomainEvent`; returns. MUST NOT compute or generate the id. |
| D-AGG7  | `static fromPrimitives(primitives: PrimitiveTypes<<Aggregate>>)`: rebuilds every field with its constructor (`new X(primitives.x)`) or `X.fromPrimitives(primitives.x)` for composites, rebuilds child entities with their constructor, calls the aggregate constructor. No events, no invariant checks.                                                                                                                                                                                                                                                                         |
| D-AGG8  | `toPrimitives(): PrimitiveTypes<<Aggregate>>`: every field; VO → `.value`; composite → `.toPrimitives()`; child entity → object literal `{ id: child.id.value, …fields }` written by the aggregate. `fromPrimitives(toPrimitives())` MUST give an equal aggregate.                                                                                                                                                                                                                                                                                                               |
| D-AGG9  | Each state change is a business method named after the business action (`process`, `cancel`, `markShipped`): params = value objects, `clock: Clock` last; returns `void`; changes fields; updates `_updatedAt` (through `moveTo`/`touch`); records zero or more events.                                                                                                                                                                                                                                                                                                          |
| D-AGG10 | User-requested method (called by a user use case): if it does not apply in the current state, MUST throw a business error (`OrderNotCancellable`).                                                                                                                                                                                                                                                                                                                                                                                                                               |
| D-AGG11 | Reaction method (called by a reaction use case: `process`, `markPaid`, `cancelForRejectedPayment`, `markShipped`, `markDelivered`, `adjustAmount`, `settleForCancelledOrder`, `cancelForCancelledOrder`): if it does not apply, MUST `return` without changes. MUST NOT throw business errors (events may arrive twice).                                                                                                                                                                                                                                                         |
| D-AGG12 | A method that mutates and then finds a broken invariant MUST restore the previous state before rethrowing (`Order.changeLineQuantity` restores the quantity when `assertTotal` throws).                                                                                                                                                                                                                                                                                                                                                                                          |
| D-AGG13 | Public queries MAY exist (`subtotal()`, `total()`, `isIn(status)`). A public `assert…()` MAY exist for a precondition a use case checks before a non-mutating operation (`assertDiscardable()` before `remove`).                                                                                                                                                                                                                                                                                                                                                                 |
| D-AGG14 | Private helpers: `moveTo(status, clock)` (status + touch), `touch(clock)`, `assert…()` (throw business error), event-recording steps (`capture`, `reject`, `awaitTransfer`).                                                                                                                                                                                                                                                                                                                                                                                                     |
| D-AGG15 | MUST NOT contain: repositories, event bus, logger, HTTP, ids derived from other data, version fields, setters.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

Template (`domain/aggregate/<Aggregate>.ts`):

```ts
import { AggregateRoot, CreatedAt, UpdatedAt } from '../../../../ddd/domain';
import type { PrimitiveTypes } from '../../../../ddd/domain';
import { <Aggregate>CreatedDomainEvent } from '../event/<Aggregate>CreatedDomainEvent';
import type { <Aggregate>Event } from '../event/<Aggregate>Event';
import { <Aggregate>Id } from '../value-object/<Aggregate>Id';
import { <Status> } from '../value-object/<Status>Type';
import { <Status>Type } from '../value-object/<Status>Type';

interface Clock {
  now(): Date;
}

export class <Aggregate> extends AggregateRoot<<Aggregate>Id, <Aggregate>Event> {
  private static readonly <CONSTANT> = <value>;

  readonly <field>: <VO>;
  private _status: <Status>Type;
  readonly createdAt: CreatedAt;
  private _updatedAt: UpdatedAt;

  constructor(
    id: <Aggregate>Id,
    <field>: <VO>,
    status: <Status>Type,
    createdAt: CreatedAt,
    updatedAt: UpdatedAt,
  ) {
    super(id);
    this.<field> = <field>;
    this._status = status;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static create(id: <Aggregate>Id, <field>: <VO>, clock: Clock): <Aggregate> {
    const <aggregate> = new <Aggregate>(
      id,
      <field>,
      new <Status>Type(<Status>.<INITIAL>),
      CreatedAt.now(clock),
      UpdatedAt.now(clock),
    );
    <aggregate>.record(
      new <Aggregate>CreatedDomainEvent({
        <aggregate>Id: <aggregate>.id.value,
        <field>: <aggregate>.<field>.value,
        clock,
      }),
    );
    return <aggregate>;
  }

  static fromPrimitives(primitives: PrimitiveTypes<<Aggregate>>): <Aggregate> {
    return new <Aggregate>(
      new <Aggregate>Id(primitives.id),
      new <VO>(primitives.<field>),
      new <Status>Type(primitives.status),
      new CreatedAt(primitives.createdAt),
      new UpdatedAt(primitives.updatedAt),
    );
  }

  get status(): <Status>Type {
    return this._status;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  toPrimitives(): PrimitiveTypes<<Aggregate>> {
    return {
      id: this.id.value,
      <field>: this.<field>.value,
      status: this._status.value,
      createdAt: this.createdAt.value,
      updatedAt: this._updatedAt.value,
    };
  }

  private moveTo(status: <Status>, clock: Clock): void {
    this._status = new <Status>Type(status);
    this._updatedAt = UpdatedAt.now(clock);
  }
}
```

References: `payments/domain/aggregate/Payment.ts` (status machine, limits by method, reaction methods), `sales/domain/aggregate/Order.ts` (child entities, invariants, specification, rollback), `shipping/domain/aggregate/Shipment.ts` (JSON value, date from clock).

User-requested vs reaction method (`Order`):

```ts
  cancel(requester: CustomerId, clock: Clock): void {
    if (!requester.equals(this.customerId)) {
      throw new OrderOwnedByAnotherCustomer(this.id.value);
    }
    if (!this.isIn(OrderStatus.PENDING_PAYMENT) && !this.isIn(OrderStatus.PAID)) {
      throw new OrderNotCancellable(this.id.value, this._status.value);
    }
    const wasPaid = this.isIn(OrderStatus.PAID);
    this.moveTo(OrderStatus.CANCELLED, clock);
    this.record(
      new OrderCancelledDomainEvent({
        orderId: this.id.value,
        reason: 'cancelled_by_customer',
        wasPaid,
        clock,
      }),
    );
  }

  markShipped(trackingNumber: CarrierTrackingNumber, clock: Clock): void {
    if (!this.isIn(OrderStatus.PAID)) {
      return;
    }
    this.moveTo(OrderStatus.SHIPPED, clock);
    this.record(
      new OrderShippedDomainEvent({
        orderId: this.id.value,
        trackingNumber: trackingNumber.value,
        clock,
      }),
    );
  }
```

### 2.3 Shape received by `create` (D-NEW)

- D-NEW1: When `create` receives data that becomes child entities, declare `export interface New<Child> { <field>: <VO>; … }` in `aggregate/New<Child>.ts` (value objects only, no id). The application builds it in `toCommand`; the aggregate assigns the ids (`new LineNumber(index + 1)`). Reference: `sales/domain/aggregate/NewOrderLine.ts`.

### 2.4 Child entities (D-ENT)

| Id     | Rule                                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| D-ENT1 | `entity/<Entity>.ts`, `extends Entity<<IdVO>>`; the id is a value object (`LineNumber extends Required(NumberType)`).          |
| D-ENT2 | Fields as D-AGG3 without `createdAt`/`updatedAt`; constructor receives value objects, `super(id)`, assigns.                    |
| D-ENT3 | MAY have queries (`subtotal()`) and mutators that only its aggregate calls (`changeQuantity(quantity)`). No setters, no clock. |
| D-ENT4 | MUST NOT record events, have `create`, or have `toPrimitives`/`fromPrimitives` (the aggregate converts it).                    |

Reference: `sales/domain/entity/OrderLine.ts`.

### 2.5 Value objects (D-VO)

| Id     | Rule                                                                                                                                                                                                                                                                                                                                                                    |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-VO1  | Always valid: the constructor converts, applies `Required`, runs every `@Validations` rule and throws `ValidationException`. No `ensure…`/`validate…` methods of your own.                                                                                                                                                                                              |
| D-VO2  | Rules: `@Validations([...])` from `@archi-code/validation` above the class: `{ validator: 'matches' \| 'isLength' \| 'isInt' \| …, properties, message? }` or `{ custom: '<camelCaseName>', fn, message }` for list/composite rules. English `message` when the validator's own is not clear.                                                                           |
| D-VO3  | Mandatory value → `Required(<Base>)`; optional → bare base, constructed with `null` for no value.                                                                                                                                                                                                                                                                       |
| D-VO4  | Immutable; behavior returns new instances (`Money.add`, `Money.lessPercent`).                                                                                                                                                                                                                                                                                           |
| D-VO5  | Id derived from other data → `static` method on the id class using `UuidType.fromValue('<purpose>:<source>')` (UUID v5): `PaymentId.forOrder`, `ShipmentId.forOrder`. New random id → `<Aggregate>Id.generate()`, called by the use case.                                                                                                                               |
| D-VO6  | Composite: `extends Composite({ … })`; built with `new X({ field: vo })` from value objects or `X.fromPrimitives(data)` from plain data (reports every field path). Cross-field rules are `custom` validations that receive the composite.                                                                                                                              |
| D-VO7  | A JSON value (`JsonType`) is NEVER a composite and a composite is never a JSON value. `JsonType` = free-form object stored as is.                                                                                                                                                                                                                                       |
| D-VO8  | Custom type: `extends AbstractType<T>`, implements `protected filter(value: unknown): T`, throws `TypePrimitiveException('<what>', value)` when it cannot convert. Empty input (`null`/`undefined`) never reaches `filter`. Paired with `Required(...)` in a second file.                                                                                               |
| D-VO9  | Enum file holds exactly: `export enum <Enum>` (snake_case string values), `<Enum>Option extends EnumType<<Enum>>` with `protected getEnum(): typeof <Enum>`, `<Enum>Type extends Required(<Enum>Option)`. Optional enum: only `<Enum>Type extends EnumType<<Enum>>`. Exception: `shared-kernel/money/MoneyCurrency.ts` (`Currency`, `CurrencyOption`, `MoneyCurrency`). |
| D-VO10 | Each context declares its own value objects even when another context has a similar one (`sales/Phone` and `shipping/Phone`; `StaffRoleType` in payments, sales and shipping with different roles).                                                                                                                                                                     |

Templates:

```ts
import { Validations } from '@archi-code/validation';
import { Required, StringType } from '../../../../ddd/domain';

@Validations([
  {
    validator: 'matches',
    properties: { pattern: /^[A-Z0-9-]{3,20}$/ },
    message: 'A SKU has 3 to 20 capital letters, digits or dashes',
  },
])
export class Sku extends Required(StringType) {}
```

```ts
import { IdType, UuidType } from '../../../../ddd/domain';
import type { OrderReference } from './OrderReference';

export class PaymentId extends IdType<'PaymentId'> {
  static forOrder(order: OrderReference): PaymentId {
    return new PaymentId(UuidType.fromValue(`payment-of-order:${order.value}`));
  }
}
```

```ts
import { EnumType, Required } from '../../../../ddd/domain';

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export class OrderStatusOption extends EnumType<OrderStatus> {
  protected getEnum(): typeof OrderStatus {
    return OrderStatus;
  }
}

export class OrderStatusType extends Required(OrderStatusOption) {}
```

```ts
import { Validations } from '@archi-code/validation';
import { ArrayType } from '../../../../ddd/domain';
import { CouponCode } from './CouponCode';

@Validations([
  {
    custom: 'atMostThreeCoupons',
    fn: (codes) => (codes as string[]).length <= 3,
    message: 'An order takes at most 3 coupons',
  },
])
export class CouponCodeList extends ArrayType<CouponCode> {
  protected createItem(value: unknown): CouponCode {
    return new CouponCode(value as string);
  }
}
```

```ts
import { Validations } from '@archi-code/validation';
import { Composite } from '../../../../ddd/domain';
import { ShipmentItem } from './ShipmentItem';

@Validations([
  {
    custom: 'atLeastOneItem',
    fn: (contents) => (contents as ShipmentContents).items.length > 0,
    message: 'A shipment carries at least one item',
  },
])
export class ShipmentContents extends Composite({ items: [ShipmentItem] }) {
  units(): number {
    return this.items.reduce((units, item) => units + item.quantity.value, 0);
  }
}
```

```ts
import { AbstractType, TypePrimitiveException } from '../../../ddd/domain';

export class CentsAmount extends AbstractType<number> {
  protected filter(value: unknown): number {
    const cents = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    if (typeof cents !== 'number' || !Number.isSafeInteger(cents) || cents < 0) {
      throw new TypePrimitiveException('amount in cents', value);
    }
    return cents;
  }
}
```

```ts
import type { JsonTypeValue } from '../../../../ddd/domain';

export interface CarrierLabelData extends JsonTypeValue {
  carrier: string;
  service: 'standard' | 'gift';
  country: string;
  units: number;
}
```

Composite with behavior: `shared-kernel/money/Money.ts` (`static zero`, `add`, `times`, `lessPercent`, `isAtLeast`, `isZero`, private `assertSameCurrency` → `CurrencyMismatch`, private `withAmount`).

### 2.6 Domain events (D-EVT)

| Id     | Rule                                                                                                                                                                                                                        |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-EVT1 | `event/<Aggregate><PastAction>DomainEvent.ts`, `extends EventBase`. Creation event: `<Aggregate>CreatedDomainEvent`.                                                                                                        |
| D-EVT2 | `static readonly eventName = '<aggregate>.<past_action>'`, snake_case (`'order.line_quantity_changed'`), unique in the shop.                                                                                                |
| D-EVT3 | Fields `readonly`, primitive data only: `string`, `number`, `boolean`, plain objects/arrays of them. Money → `{ amount: number; currency: string }`; dates → ISO `string`. Never value objects, `Date` or class instances.  |
| D-EVT4 | The aggregate id is a named field (`orderId`, `paymentId`, `shipmentId`); references to other aggregates too (`orderId` in payment events). No `aggregateId`, no version.                                                   |
| D-EVT5 | No interfaces or type aliases: field types inline; constructor param typed inline as `{ …fields } & EventMetadata`, destructuring `eventId, occurredOn, clock`; `super({ eventId, occurredOn, clock })`; assign each field. |
| D-EVT6 | Created only by its aggregate: `this.record(new …DomainEvent({ …primitives, clock }))`, values from `.value` / `.toPrimitives()`.                                                                                           |
| D-EVT7 | `event/<Aggregate>Event.ts`: `export type <Aggregate>Event = \| …` with an `import type` of every event of the aggregate. Every new event MUST be added.                                                                    |
| D-EVT8 | No methods, no `toPrimitives`/`fromPrimitives`: the event is its own JSON; consumers rebuild it in `composition.ts` (C-REG).                                                                                                |

```ts
import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class ShipmentDeliveredDomainEvent extends EventBase {
  static readonly eventName = 'shipment.delivered';

  readonly shipmentId: string;
  readonly orderId: string;

  constructor({
    shipmentId,
    orderId,
    eventId,
    occurredOn,
    clock,
  }: { shipmentId: string; orderId: string } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.shipmentId = shipmentId;
    this.orderId = orderId;
  }
}
```

Nested data: `sales/domain/event/OrderCreatedDomainEvent.ts` (`lines: { sku: string; quantity: number; unitPrice: { amount: number; currency: string } }[]`).

### 2.7 Business errors (D-ERR)

| Id     | Rule                                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| D-ERR1 | `exception/<WhatWentWrong>.ts`, no `Exception` suffix, `extends DomainException`. Money errors live in `shared-kernel/money/`. |
| D-ERR2 | Only a constructor: receives primitives for the message, calls `super('<English message>', ['<CODE><NNN>'])`.                  |
| D-ERR3 | Prefixes: `SAL` Sales, `PAY` Payments, `SHP` Shipping, `MNY` money. Use the next free number (8.4).                            |
| D-ERR4 | Thrown only by an aggregate, entity, value object or domain service of the same context; never by a reaction method (D-AGG11). |

```ts
import { DomainException } from '../../../../ddd/domain';

export class OrderNotModifiable extends DomainException {
  constructor(orderId: string, status: string) {
    super(`Order ${orderId} is ${status} and can no longer change`, ['SAL004']);
  }
}
```

### 2.8 Specifications (D-SPEC)

| Id      | Rule                                                                                                                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-SPEC1 | `specification/<Rule>.ts`, `extends Specification<<Aggregate>>`, implements `isSatisfiedBy(x): boolean`; parameters through the constructor (`private readonly cents: number`, then `super()`). |
| D-SPEC2 | Composed rule: `private readonly rule = new A(…).or(new B(…)).and(new C(…).not());` and `isSatisfiedBy` returns `this.rule.isSatisfiedBy(x)`.                                                   |
| D-SPEC3 | Receives loaded data only, never a repository. Answers a question; never guards an invariant (the answer is data, e.g. `freeShipping` in `OrderCreatedDomainEvent`).                            |

References: `sales/domain/specification/{SubtotalAtLeast,ContainsSku,FreeShippingEligible}.ts`.

### 2.9 Domain services and ports (D-SVC)

| Id     | Rule                                                                                                                                                                                                                                   |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-SVC1 | `service/<Service>.ts`: plain class holding a business rule that does not belong to one aggregate; ports by constructor (`constructor(private readonly catalog: CouponCatalog) {}`); works with value objects; throws business errors. |
| D-SVC2 | `service/<Port>.ts`: `export interface` whose methods speak value objects (`discountOf(code: CouponCode): Promise<DiscountPercent \| null>`); implemented in `infrastructure/`.                                                        |
| D-SVC3 | Instantiated only in `composition.ts`; injected into user use cases (`PlaceOrder` calls `OrderPricing.discountFor`).                                                                                                                   |

References: `sales/domain/service/{OrderPricing,CouponCatalog}.ts`.

### 2.10 Domain MUST NOT

`aggregateId` in events; types/interfaces in event files; event data types in `domain/`; `toPrimitives`/`fromPrimitives` on events; per-aggregate repository interfaces (`OrderRepository`); commands; `ensureX` methods; ids computed inside `create`; repositories, event bus, loggers, HTTP, `Date.now()`.

## 3. Application layer (A)

### 3.1 Use case kinds (A-UC)

A use case = one business action. Two kinds; the only difference is where the input comes from.

| Kind              | Input        | Class                                                                        | File                                          | Run by        |
| ----------------- | ------------ | ---------------------------------------------------------------------------- | --------------------------------------------- | ------------- |
| user use case     | request data | `<Action> extends UseCase<<Action>Input, <Action>Command, Output>`           | `application/<action>/<action>.ts`            | a controller  |
| reaction use case | an event     | `<Action>On<Event> extends EventListener<<Event>DomainEvent>` + `@ListensTo` | `application/<action>/<action>-on-<event>.ts` | the event bus |

- A-UC1: Name = business action (`PlaceOrder`, `ConfirmTransferReceived`, `MarkOrderPaid`), never CRUD/technical (`UpdateOrder`, `OrderService`).
- A-UC2: One use case does one thing and saves one aggregate once.
- A-UC3: A use case MUST NOT import or call another use case or listener.
- A-UC4: No transactions, no HTTP, no shape checks of raw input (controllers do it), no business rules (the domain does it).

### 3.2 User use cases (A-USR)

| Id     | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-USR1 | Same file exports `interface <Action>Input` (primitives and data types; `actorId` or `actorRole` when an actor matters) and `interface <Action>Command` (value objects, composites, `New<Child>[]`).                                                                                                                                                                                                                                                                                                                        |
| A-USR2 | `Output` = `void`, or the new id as `string` (`PlaceOrder`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| A-USR3 | Constructor params, `private readonly`, only what `handle` uses, in this order: repository typed by roles (`AggregateFinder<X> & AggregateSaver<X>`; `AggregateSaver<X>` alone when only creating; `AggregateFinder<X> & AggregateRemover<X>` when removing), domain services, `EventBus<<Aggregate>Event>`, `Clock`, `Logger`. Body `super();`.                                                                                                                                                                            |
| A-USR4 | `protected toCommand(input)`: exactly `return ValueObjectBuilder.build({ <field>: () => new <VO>(input.<x>), … })`. Enums: `new <Enum>Type(input.x as <Enum>)`. Composites: `X.fromPrimitives(input.x)`; money: `Money.fromPrimitives(input.x as { amount: number; currency: Currency })`. Lists of shapes: `ValueObjectBuilder.buildList(input.items, (item) => ValueObjectBuilder.build({ … }))` (errors reported as `lines.1.quantity`).                                                                                 |
| A-USR5 | `protected async handle(command)` steps in order: (1) authorization → `throw new NotAllowedException('<English message>')`; (2) new id `<Aggregate>Id.generate()`; (3) `<Aggregate>.create(...)`, or `findById` and when `null` `throw new AggregateNotFoundException('<Aggregate>', id.value)`; (4) business method(s) with `this.clock`; (5) `await repo.save(x)` once (or `await repo.remove(x)`), then `await this.events.publish(x.pullDomainEvents())`; (6) log if the business wants a trace; (7) return the output. |
| A-USR6 | A rule that depends only on the actor → `NotAllowedException` here. A rule that depends on aggregate state (only the buyer cancels) → business error in the aggregate (D-AGG10).                                                                                                                                                                                                                                                                                                                                            |
| A-USR7 | Concurrency: by default let `ConcurrencyException` reach the controller (409). A use case whose change is safe to repeat MAY retry the whole load→change→save with `private static readonly ATTEMPTS = 3` (`ChangeShippingAddress`).                                                                                                                                                                                                                                                                                        |
| A-USR8 | Logging: `this.logger.info('<snake_case_key>', { <primitives> })` after publish.                                                                                                                                                                                                                                                                                                                                                                                                                                            |

Template, `payments/application/confirm-transfer-received/confirm-transfer-received.ts`:

```ts
import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import {
  AggregateNotFoundException,
  NotAllowedException,
  UseCase,
  ValueObjectBuilder,
} from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import { Money } from '../../../shared-kernel/money/Money';
import type { Currency } from '../../../shared-kernel/money/MoneyCurrency';
import type { Payment } from '../../domain/aggregate/Payment';
import type { MoneyData } from '../request-payment/money-data';
import type { PaymentEvent } from '../../domain/event/PaymentEvent';
import { PaymentId } from '../../domain/value-object/PaymentId';
import { StaffRole } from '../../domain/value-object/StaffRoleType';
import { StaffRoleType } from '../../domain/value-object/StaffRoleType';

export interface ConfirmTransferReceivedInput {
  actorRole: string;
  paymentId: string;
  received: MoneyData;
}

export interface ConfirmTransferReceivedCommand {
  actorRole: StaffRoleType;
  paymentId: PaymentId;
  received: Money;
}

export class ConfirmTransferReceived extends UseCase<
  ConfirmTransferReceivedInput,
  ConfirmTransferReceivedCommand,
  void
> {
  constructor(
    private readonly payments: AggregateFinder<Payment> & AggregateSaver<Payment>,
    private readonly events: EventBus<PaymentEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: ConfirmTransferReceivedInput): ConfirmTransferReceivedCommand {
    return ValueObjectBuilder.build({
      actorRole: () => new StaffRoleType(input.actorRole as StaffRole),
      paymentId: () => new PaymentId(input.paymentId),
      received: () =>
        Money.fromPrimitives(input.received as { amount: number; currency: Currency }),
    });
  }

  protected async handle(command: ConfirmTransferReceivedCommand): Promise<void> {
    if (command.actorRole.value !== StaffRole.TREASURY) {
      throw new NotAllowedException(
        `The role ${command.actorRole.value} may not confirm transfers`,
      );
    }
    const payment = await this.payments.findById(command.paymentId);
    if (payment === null) {
      throw new AggregateNotFoundException('Payment', command.paymentId.value);
    }
    payment.confirmTransfer(command.received, this.clock);
    await this.payments.save(payment);
    await this.events.publish(payment.pullDomainEvents());
  }
}
```

Other references: `sales/application/place-order/place-order.ts` (create, `buildList`, domain service, returns id), `sales/application/change-shipping-address/change-shipping-address.ts` (retry), `sales/application/discard-cancelled-order/discard-cancelled-order.ts` (`AggregateRemover`, `assertDiscardable`).

### 3.3 Reaction use cases (A-RUC)

The listener IS the use case: one class, one file, no `UseCase` class behind it.

| Id     | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-RUC1 | File `application/<action>/<action>-on-<event>.ts` (read model: `application/<read-model>/<action>/<action>-on-<event>.ts`); class `<Action>On<Event>`, `<Event>` = event class name without `DomainEvent`.                                                                                                                                                                                                                                                                                                                                           |
| A-RUC2 | `extends EventListener<<Event>DomainEvent>`, decorated `@ListensTo(<Event>DomainEvent, { consumer: '<context>.<action>-on-<event>' })`: context + `.` + file name without `.ts`; unique in the shop. One event per class.                                                                                                                                                                                                                                                                                                                             |
| A-RUC3 | Event class: the local copy `./<event>-domain-event` (A-EVC) when the event comes from another context; the context's own `domain/event/<Event>DomainEvent` when it is its own event (read models).                                                                                                                                                                                                                                                                                                                                                   |
| A-RUC4 | Constructor: same order as A-USR3 (repository roles, services, `EventBus`, `Clock`, `Logger`); a read-model reaction receives only its projection. Body `super();`.                                                                                                                                                                                                                                                                                                                                                                                   |
| A-RUC5 | `async handle(event: <Event>DomainEvent): Promise<void>` steps: (1) `const { a, b } = ValueObjectBuilder.build({ a: () => new A(event.a), … })` (A-USR4 conversion rules, reading `event.*`); (2) derived id (`PaymentId.forOrder(orderReference)`); (3a) to create: `if ((await repo.findById(id)) !== null) { return; }` then `<Aggregate>.create(...)`; (3b) to change: `const x = await repo.findById(id); if (x === null) { return; }`; (4) the reaction method (D-AGG11); (5) `save` once + `publish(x.pullDomainEvents())`; (6) log if needed. |
| A-RUC6 | MUST NOT: authorization, `AggregateNotFoundException`, throwing business errors, calling a use case or another listener, HTTP, try/catch.                                                                                                                                                                                                                                                                                                                                                                                                             |
| A-RUC7 | No `UseCase` wrapper: unknown errors are not wrapped in `UnexpectedErrorException`; `DomainEventBus` logs them (`warn` for Domain/Application exceptions, `error` otherwise) and rethrows to the channel.                                                                                                                                                                                                                                                                                                                                             |
| A-RUC8 | One class per reaction, also when several events feed one read model.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

Template (create), `payments/application/request-payment/request-payment-on-order-created.ts`:

```ts
import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import { Money } from '../../../shared-kernel/money/Money';
import type { Currency } from '../../../shared-kernel/money/MoneyCurrency';
import { Payment } from '../../domain/aggregate/Payment';
import type { PaymentEvent } from '../../domain/event/PaymentEvent';
import { OrderReference } from '../../domain/value-object/OrderReference';
import { PaymentId } from '../../domain/value-object/PaymentId';
import { PaymentMethodType } from '../../domain/value-object/PaymentMethodType';
import type { PaymentMethod } from '../../domain/value-object/PaymentMethodType';
import { OrderCreatedDomainEvent } from './order-created-domain-event';

@ListensTo(OrderCreatedDomainEvent, { consumer: 'payments.request-payment-on-order-created' })
export class RequestPaymentOnOrderCreated extends EventListener<OrderCreatedDomainEvent> {
  constructor(
    private readonly payments: AggregateFinder<Payment> & AggregateSaver<Payment>,
    private readonly events: EventBus<PaymentEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  async handle(event: OrderCreatedDomainEvent): Promise<void> {
    const { orderReference, amount, method } = ValueObjectBuilder.build({
      orderReference: () => new OrderReference(event.orderId),
      amount: () => Money.fromPrimitives(event.total as { amount: number; currency: Currency }),
      method: () => new PaymentMethodType(event.paymentMethod as PaymentMethod),
    });
    const paymentId = PaymentId.forOrder(orderReference);
    if ((await this.payments.findById(paymentId)) !== null) {
      return;
    }
    const payment = Payment.create(paymentId, orderReference, amount, method, this.clock);
    payment.process(this.clock);
    await this.payments.save(payment);
    await this.events.publish(payment.pullDomainEvents());
  }
}
```

Template (change), `handle` of `sales/application/mark-order-shipped/mark-order-shipped-on-shipment-dispatched.ts`:

```ts
  async handle(event: ShipmentDispatchedDomainEvent): Promise<void> {
    const { orderId, trackingNumber } = ValueObjectBuilder.build({
      orderId: () => new OrderId(event.orderId),
      trackingNumber: () => new CarrierTrackingNumber(event.trackingNumber),
    });
    const order = await this.orders.findById(orderId);
    if (order === null) {
      return;
    }
    order.markShipped(trackingNumber, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
```

With logging: `sales/application/cancel-unpaid-order/cancel-unpaid-order-on-payment-rejected.ts` (`Logger` last in the constructor; `const events = order.pullDomainEvents()`, publish them, and only when `events.length > 0` `this.logger.info('order_cancelled_for_rejected_payment', { orderId: orderId.value, reason: reason.value })`: a reaction that did not apply logs nothing).

### 3.4 Consumed event copies (A-EVC)

| Id     | Rule                                                                                                                                                           |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-EVC1 | For each event of another context it reacts to, the consumer declares a copy in the reaction folder: `application/<action>/<event>-domain-event.ts`.           |
| A-EVC2 | Same class name (`<Event>DomainEvent`) and same `eventName` as the producer; fields = a subset of the producer's fields (SHOULD be only those `handle` reads). |
| A-EVC3 | Written exactly like a domain event (D-EVT3, D-EVT5): inline types, no interfaces, `EventMetadata`.                                                            |
| A-EVC4 | Two reactions of one context to the same foreign event each keep their own copy in their own folder.                                                           |

### 3.5 Data types (A-DT)

| Id    | Rule                                                                                                                                                                                                                                                                                                                               |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-DT1 | Plain shapes the application receives (`MoneyData`, `AddressData`, `PaidOrderAddress`, `PaidOrderItem`) are `export interface` in kebab-case files in the folder of the use case that first needs them; the rest of the context imports them from there (`../place-order/money-data`, `./application/request-payment/money-data`). |
| A-DT2 | Not in `domain/`; never shared between contexts (each context has its own `MoneyData`).                                                                                                                                                                                                                                            |

```ts
export interface MoneyData {
  amount: number;
  currency: string;
}
```

### 3.6 Read models (A-RM)

| Id    | Rule                                                                                                                                                                                                                                                                                                                                                                                |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-RM1 | Folder `application/<read-model>/` (`order-summaries/`) with: `<row>.ts` (row interface of primitives + `<Row>Changes = Partial<Pick<<Row>, …>>`), `<row>-store.ts` (write port: `find(id)`, `hasApplied(eventId)`, `save(row, eventId)`), `<rows>.ts` (query port: `byId`, `ofCustomer`), `<row>-projection.ts`, and one subfolder per reaction.                                   |
| A-RM2 | `<Row>Projection` (`OrderSummaryProjection`) is not a use case and hears no event: constructor receives the store port; `apply({ eventId, orderId, occurredOn, changes })` returns when `eventId` was applied, merges `changes` into the stored row or a default row, sets `lastEventAt`, saves with the `eventId`. Its input interface (`OrderSummaryChange`) holds value objects. |
| A-RM3 | Each event that changes the row has its own reaction use case (A-RUC) in `<read-model>/<action>/<action>-on-<event>.ts`: builds `eventId: new UuidType(event.eventId)`, `orderId: new OrderId(event.orderId)`, `occurredOn: new CreatedAt(event.occurredOn)` plus the fields it needs, decides the change (status constant, sums) and calls `await this.projection.apply(...)`.     |
| A-RM4 | Queries have no use case: the controller receives the query port and calls it.                                                                                                                                                                                                                                                                                                      |
| A-RM5 | One infrastructure class implements both ports and returns `structuredClone` copies (`InMemoryOrderSummaryStore`).                                                                                                                                                                                                                                                                  |

Reference reaction: `sales/application/order-summaries/mark-order-summary-paid/mark-order-summary-paid-on-order-paid.ts`.

## 4. Infrastructure layer (I)

### 4.1 Repositories (I-REPO)

| Id      | Rule                                                                                                                                                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I-REPO1 | `infrastructure/persistence/in-memory-<aggregate>-repository.ts`, `InMemory<Aggregate>Repository implements` the roles the use cases need (`AggregateFinder<X>`, `AggregateSaver<X>`, `AggregateRemover<X>`). No repository interface of its own.                  |
| I-REPO2 | Constructor: only its technology (none in memory); never an aggregate class or mapper.                                                                                                                                                                             |
| I-REPO3 | Storage: `private readonly rows = new Map<string, <Aggregate>Row>()` keyed by `id.value`, with a file-local `interface <Aggregate>Row { version: number; primitives: PrimitiveTypes<X> }`; `private readonly versions = new WeakMap<X, number>()`.                 |
| I-REPO4 | `findById`: missing → `null`; else `X.fromPrimitives(structuredClone(row.primitives))` and `versions.set(x, row.version)`.                                                                                                                                         |
| I-REPO5 | `save`: `version = versions.get(x) ?? 0`; if stored version (`?? 0`) ≠ `version` → `throw new ConcurrencyException('<Aggregate>', key, version)`; store `{ version: version + 1, primitives: structuredClone(x.toPrimitives()) }`; `versions.set(x, version + 1)`. |
| I-REPO6 | `remove`: same version check (MAY share a private `checkedVersion`), then `rows.delete(key)`.                                                                                                                                                                      |
| I-REPO7 | MUST NOT contain business queries, `nextId()`, events or rules. MAY expose read helpers (`versionOf(id)`).                                                                                                                                                         |

References: `payments/infrastructure/persistence/in-memory-payment-repository.ts`, `sales/infrastructure/persistence/in-memory-order-repository.ts`.

### 4.2 Port adapters (I-ADP)

| Id     | Rule                                                                                                                                           |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| I-ADP1 | `infrastructure/<area>/in-memory-<port>.ts`, `InMemory<Port> implements <Port>` (domain or application port).                                  |
| I-ADP2 | Receives raw data or technology by constructor; raw shapes are interfaces in the same file (`MarketingCampaign`).                              |
| I-ADP3 | Answers in value objects. Bad external data → `throw new InternalErrorException('<message>', { cause: error })` (500), never a business error. |

References: `sales/infrastructure/coupon/in-memory-coupon-catalog.ts`, `sales/infrastructure/read-model/in-memory-order-summary-store.ts`.

## 5. Interfaces layer (H)

### 5.1 Controllers (H-CTL)

| Id     | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H-CTL1 | `interfaces/http/<aggregates>-controller.ts`, class `<Aggregates>Controller`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| H-CTL2 | Constructor: user use cases (one param each, or one `<Aggregates>UseCases` interface declared in the same file when there are many: `OrdersUseCases`), query ports of read models, `logger: Logger` last; field `private readonly http: Http` set with `this.http = new Http(logger)`.                                                                                                                                                                                                                                                                               |
| H-CTL3 | One method per endpoint: `<name>(request: HttpRequest): Promise<HttpResponse>` returning `this.http.respond(async () => { … })`.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| H-CTL4 | Endpoint steps: (1) when the use case needs an actor: `request.auth?.userId` (customer) or `request.auth?.role` (staff) `=== undefined` → `return this.http.unauthenticated();`; (2) when there is a body: `this.http.jsonBody(request) === null`, or an expected list is not an array → `return this.http.badRequest('<English hint>');` (shape only, never values); (3) `await useCase.execute({ actorId \| actorRole, …request.params, …body })`; (4) response: create `{ status: 201, body: { id } }`, command `{ status: 204 }`, query `{ status: 200, body }`. |
| H-CTL5 | MUST NOT catch errors, map statuses or contain rules: `Http.respond` translates every error.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| H-CTL6 | Query endpoints read the query port directly; missing row → `{ status: 404, body: { code: 'NOT_FOUND', message: '<Aggregate> not found' } }`.                                                                                                                                                                                                                                                                                                                                                                                                                        |

References: `payments/interfaces/http/payments-controller.ts`, `sales/interfaces/http/orders-controller.ts`.

### 5.2 `platform/http/http.ts` (H-HTTP)

Technical helper shared by all contexts; holds no business rule. `HttpRequest { auth?: { userId?; role? }; params?; body? }`, `HttpResponse { status; body? }`, `Http.respond / jsonBody / badRequest / unauthenticated`. Errors are mapped with `ExceptionClassifier.classify(error)`:

| ExceptionKind | Status | Thrown as                                                                                                             |
| ------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| `Malformed`   | 400    | `TypePrimitiveException`, `RequiredValueException`                                                                    |
| `Rejected`    | 400    | any other `ApplicationException`                                                                                      |
| `NotAllowed`  | 403    | `NotAllowedException`                                                                                                 |
| `NotFound`    | 404    | `AggregateNotFoundException`                                                                                          |
| `Conflict`    | 409    | `ConcurrencyException`                                                                                                |
| `Invalid`     | 422    | `ValidationException` (from `ValueObjectBuilder`) and business errors (`DomainException`)                             |
| `Internal`    | 500    | anything else (`InternalErrorException`, unknown); logged as `logger.error('http_request_failed', …)`, message hidden |

Error body: `{ code, message, errors }` (`errors` only for `ValidationException`). Missing auth → 401 `UNAUTHENTICATED`; bad shape → 400 `BAD_REQUEST`.

## 6. Composition (C)

### 6.1 `composition.ts` (C-CMP)

| Id     | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-CMP1 | One class `<Context>Context` plus `export interface <Context>Settings { channel: EventChannel; clock: Clock; logger: Logger; …own data }`. Only place that instantiates classes of the context.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| C-CMP2 | `private constructor(readonly <repositories/stores>, readonly controller, private readonly subscriptions: Subscription[])`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| C-CMP3 | `static async start(settings)`: (1) `const bus = new DomainEventBus<EventBase>(channel, <Context>Context.registry(), logger);` (2) repositories, stores, adapters, domain services (`new OrderPricing(new InMemoryCouponCatalog(campaigns))`), projections; (3) every reaction use case with its dependencies (`new RequestPaymentOnOrderCreated(payments, bus, clock)`), each subscribed with `await bus.subscribe(listener)` and its `Subscription` kept; (4) the controller with the user use cases (`new ConfirmTransferReceived(payments, bus, clock)`), query ports and `logger`; (5) `return new <Context>Context(...)`. |
| C-CMP4 | `async stop()`: `for (const subscription of this.subscriptions.splice(0)) { await subscription.unsubscribe(); }`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| C-CMP5 | `private static registry(): EventRegistry<EventBase>` (C-REG).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

### 6.2 Event registry (C-REG)

- C-REG1: Register every event the context hears (copies of foreign events and own events heard by read models), each exactly once.
- C-REG2: The factory maps every field of the event class from the JSON with a cast and passes `eventId` and `occurredOn`:

```ts
      .register(
        OrderCreatedDomainEvent,
        (json) =>
          new OrderCreatedDomainEvent({
            orderId: json.orderId as string,
            total: json.total as MoneyData,
            paymentMethod: json.paymentMethod as string,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
```

### 6.3 `shop.ts` (C-SHOP)

`Shop.open({ clock, logger, campaigns = [] })`: one `new InMemoryEventChannel({ delivery: 'serial' })`, then `SalesContext.start`, `PaymentsContext.start`, `ShippingContext.start` with the same channel, clock and logger. `close()` stops them in reverse order. A new context is added here.

## 7. Recipes (R)

### R1 New user action on an existing aggregate

1. Domain: business error(s) in `exception/` (next code, 8.4); `<Aggregate><PastAction>DomainEvent` in `event/` and added to `<Aggregate>Event`; business method on the aggregate (D-AGG9, D-AGG10).
2. Application: `application/<action>/<action>.ts` (A-USR template).
3. Interfaces: endpoint method in the controller (H-CTL4).
4. Composition: pass `new <Action>(repo, …, bus, clock)` to the controller.
5. If another context or a read model reacts: R2 in that context.

### R2 New reaction to an event

1. Domain: reaction method on the aggregate (D-AGG11) and the event it records, if it changes state.
2. Application: folder `application/<action>/` with `<event>-domain-event.ts` (foreign event only, A-EVC) and `<action>-on-<event>.ts` (A-RUC template).
3. Composition: register the event in `registry()` if not registered yet; create the reaction with its dependencies; subscribe it.

### R3 New aggregate

1. `value-object/<Aggregate>Id.ts`, status enum, value objects of its fields.
2. `aggregate/<Aggregate>.ts` (D-AGG template), events + union, errors.
3. `infrastructure/persistence/in-memory-<aggregate>-repository.ts` (I-REPO).
4. Use cases (R1/R2), controller, composition.

### R4 New read model field

Extend `<row>.ts` and `<Row>Changes`, the default row in the projection, the reactions that set it; add a reaction (A-RM3) and register the event if a new event feeds it.

### R5 New context

`contexts/<context>/` with `domain/`, `application/`, `infrastructure/`, `interfaces/`, `composition.ts`; new error prefix; `<Context>Context.start` in `shop.ts`. Never import another context.

## 8. Current inventory

### 8.1 Contexts and aggregates

| Context             | Aggregate (id)                               | Child entities             | Repository roles       | Error prefix |
| ------------------- | -------------------------------------------- | -------------------------- | ---------------------- | ------------ |
| sales               | `Order` (`OrderId`, random)                  | `OrderLine` (`LineNumber`) | Finder, Saver, Remover | `SAL`        |
| payments            | `Payment` (`PaymentId.forOrder`)             | —                          | Finder, Saver          | `PAY`        |
| shipping            | `Shipment` (`ShipmentId.forOrder`)           | —                          | Finder, Saver          | `SHP`        |
| shared-kernel/money | `Money` composite (`Cents`, `MoneyCurrency`) | —                          | —                      | `MNY`        |

### 8.2 Events (producer → consumers)

| eventName                        | Producer class                           | Consumers (reaction use case)                                                                                                                        |
| -------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `order.created`                  | `OrderCreatedDomainEvent`                | payments `RequestPaymentOnOrderCreated`; sales `OpenOrderSummaryOnOrderCreated`                                                                      |
| `order.line_quantity_changed`    | `OrderLineQuantityChangedDomainEvent`    | payments `AdjustPaymentAmountOnOrderLineQuantityChanged`; sales `UpdateOrderSummaryTotalOnOrderLineQuantityChanged`                                  |
| `order.shipping_address_changed` | `OrderShippingAddressChangedDomainEvent` | —                                                                                                                                                    |
| `order.paid`                     | `OrderPaidDomainEvent`                   | shipping `PrepareShipmentOnOrderPaid`; sales `MarkOrderSummaryPaidOnOrderPaid`                                                                       |
| `order.cancelled`                | `OrderCancelledDomainEvent`              | payments `SettleCancelledOrderPaymentOnOrderCancelled`; shipping `CancelShipmentOnOrderCancelled`; sales `MarkOrderSummaryCancelledOnOrderCancelled` |
| `order.shipped`                  | `OrderShippedDomainEvent`                | sales `MarkOrderSummaryShippedOnOrderShipped`                                                                                                        |
| `order.delivered`                | `OrderDeliveredDomainEvent`              | sales `MarkOrderSummaryDeliveredOnOrderDelivered`                                                                                                    |
| `payment.created`                | `PaymentCreatedDomainEvent`              | —                                                                                                                                                    |
| `payment.captured`               | `PaymentCapturedDomainEvent`             | sales `MarkOrderPaidOnPaymentCaptured`                                                                                                               |
| `payment.rejected`               | `PaymentRejectedDomainEvent`             | sales `CancelUnpaidOrderOnPaymentRejected`                                                                                                           |
| `payment.awaiting_transfer`      | `PaymentAwaitingTransferDomainEvent`     | —                                                                                                                                                    |
| `payment.amount_adjusted`        | `PaymentAmountAdjustedDomainEvent`       | —                                                                                                                                                    |
| `payment.refunded`               | `PaymentRefundedDomainEvent`             | —                                                                                                                                                    |
| `payment.voided`                 | `PaymentVoidedDomainEvent`               | —                                                                                                                                                    |
| `shipment.created`               | `ShipmentCreatedDomainEvent`             | —                                                                                                                                                    |
| `shipment.dispatched`            | `ShipmentDispatchedDomainEvent`          | sales `MarkOrderShippedOnShipmentDispatched`                                                                                                         |
| `shipment.delivered`             | `ShipmentDeliveredDomainEvent`           | sales `MarkOrderDeliveredOnShipmentDelivered`                                                                                                        |
| `shipment.cancelled`             | `ShipmentCancelledDomainEvent`           | —                                                                                                                                                    |

### 8.3 User use cases and endpoints

| Context  | Controller method          | Use case                            | Actor check                                      | Repo roles      | Success               |
| -------- | -------------------------- | ----------------------------------- | ------------------------------------------------ | --------------- | --------------------- |
| sales    | `placeOrder`               | `PlaceOrder` (+ `OrderPricing`)     | `auth.userId` must equal `customerId` (use case) | Saver           | 201 `{ id }`          |
| sales    | `changeLineQuantity`       | `ChangeOrderLineQuantity`           | —                                                | Finder, Saver   | 204 (409 on conflict) |
| sales    | `changeShippingAddress`    | `ChangeShippingAddress` (retries 3) | —                                                | Finder, Saver   | 204                   |
| sales    | `cancelOrder`              | `CancelOrder`                       | `auth.userId` is the buyer (aggregate)           | Finder, Saver   | 204                   |
| sales    | `discardOrder`             | `DiscardCancelledOrder`             | `auth.role` = `admin` (use case)                 | Finder, Remover | 204                   |
| sales    | `getOrder`, `listMyOrders` | query port `OrderSummaries`         | — / `auth.userId`                                | —               | 200                   |
| payments | `confirmTransfer`          | `ConfirmTransferReceived`           | `auth.role` = `treasury` (use case)              | Finder, Saver   | 204                   |
| shipping | `dispatch`                 | `DispatchShipment`                  | `auth.role` = `warehouse` (use case)             | Finder, Saver   | 204                   |
| shipping | `deliver`                  | `DeliverShipment`                   | `auth.role` = `warehouse` (use case)             | Finder, Saver   | 204                   |

### 8.4 Business errors

| Code   | Class                         | Thrown by                                                              |
| ------ | ----------------------------- | ---------------------------------------------------------------------- |
| SAL001 | `OrderLineCountOutOfRange`    | `Order.create` (1–20 lines)                                            |
| SAL002 | `DuplicateSku`                | `Order.create`                                                         |
| SAL003 | `OrderTotalOutOfRange`        | `Order.create`, `changeLineQuantity` (0.01–10000.00)                   |
| SAL004 | `OrderNotModifiable`          | `changeLineQuantity`, `changeShippingAddress` (only `pending_payment`) |
| SAL005 | `OrderNotCancellable`         | `Order.cancel` (only `pending_payment` or `paid`)                      |
| SAL006 | `OrderOwnedByAnotherCustomer` | `Order.cancel`                                                         |
| SAL007 | `OrderLineNotFound`           | `changeLineQuantity`                                                   |
| SAL008 | `OrderNotDiscardable`         | `Order.assertDiscardable`                                              |
| SAL009 | `UnknownCoupon`               | `OrderPricing.discountFor`                                             |
| PAY001 | `PaymentNotAwaitingTransfer`  | `Payment.confirmTransfer`                                              |
| SHP001 | `ShipmentNotDispatchable`     | `Shipment.dispatch`                                                    |
| SHP002 | `TrackingNumberMissing`       | `Shipment.dispatch`                                                    |
| SHP003 | `ShipmentNotDeliverable`      | `Shipment.deliver`                                                     |
| MNY001 | `CurrencyMismatch`            | `Money.add`                                                            |

Next free codes: `SAL010`, `PAY002`, `SHP004`, `MNY002`.

### 8.5 Business rules and where they live

| Rule                                                                                           | Location                                                                 |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| money: whole cents ≥ 0, one currency per operation, discounts round down                       | `CentsAmount`, `Money`                                                   |
| order: 1–20 lines, no repeated SKU, total 0.01–10000.00                                        | `Order.create`                                                           |
| order changes only in `pending_payment`; a quantity that breaks the total is undone            | `Order.changeLineQuantity`, `changeShippingAddress`                      |
| coupons: at most 3, no repeats (list rules), known active campaign, total discount ≤ 50%       | `CouponCodeList`, `OrderPricing`                                         |
| free shipping: subtotal ≥ 50.00 or `PREMIUM-PASS` line, and no `GIFT-CARD` line                | `FreeShippingEligible`                                                   |
| card ≤ 500.00, transfer ≤ 5000.00, else rejected; a transfer must arrive with the exact amount | `Payment.process`, `Payment.confirmTransfer`                             |
| one payment and one shipment per order                                                         | `PaymentId.forOrder`, `ShipmentId.forOrder` + create-if-absent reactions |
| carrier and expected delivery by country; dispatch needs `preparing` and a tracking number     | `Shipment.create`, `Shipment.dispatch`                                   |

### 8.6 Flows (expected event sequences)

| Story               | Sequence                                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| card order          | `order.created` → `payment.created` → `payment.captured` → `order.paid` → `shipment.created` (all before `placeOrder` returns 201) |
| shipment            | `shipment.dispatched` → `order.shipped`; `shipment.delivered` → `order.delivered`                                                  |
| card over limit     | `order.created` → `payment.created` → `payment.rejected` → `order.cancelled` (logged)                                              |
| bank transfer       | `payment.awaiting_transfer`; `order.line_quantity_changed` → `payment.amount_adjusted`; `order.cancelled` → `payment.voided`       |
| cancel a paid order | `order.cancelled` → `payment.refunded` + `shipment.cancelled`                                                                      |

## 9. Review checklist

- [ ] G: English, no comments, named exports, `import type` split, no cross-context import, layer matrix (G9).
- [ ] D: value objects always valid through `@Validations`; aggregate member order and fields (D-AGG1, D-AGG3); `create` never computes ids; reaction methods return silently, user methods throw; `toPrimitives`/`fromPrimitives` cover every field; events primitive-only, inline types, added to the union; errors with the next code.
- [ ] A: user use case = `UseCase` with one `ValueObjectBuilder.build` in `toCommand` and the A-USR5 steps; reaction use case = one `EventListener` class with consumer `<context>.<file-name>` and the A-RUC5 steps; no use case calls another; one event copy per reaction folder.
- [ ] I: repositories implement roles only, version check with `WeakMap`, `structuredClone` both ways; adapters wrap bad data in `InternalErrorException`.
- [ ] H: controllers check only auth and shape, never catch.
- [ ] C: every reaction subscribed, every heard event registered once, controllers receive the user use cases.
- [ ] `npm run check:types` (packages/ddd) and `npm run check:format` (root) pass.
