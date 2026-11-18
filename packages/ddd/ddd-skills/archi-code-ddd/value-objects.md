# Value objects

Part of the `archi-code-ddd` skill: read it only when that skill routes here. Value objects, ids,
enums, lists, JSON and `Composite` (money, addresses, ranges).

## Rules

- Value objects are **optional by default** (`value: T | null`) `[Fuera de los libros: convención
  de @archi-code/ddd]`: the books build every value object with a value and model an optional one
  as a field that may be `null` (`reservation: ReservationId | null`) [IDDD ch. 5 and 6]; both
  forms work here. `Required(XType)` makes them required: the constructor demands `T` and, if it
  receives an empty value (`null` or `undefined`), throws `RequiredValueException` with the class
  name. An optional value object with no value is built with `null` (`new PaymentReference(null)`).
  A blank text is a value: `StringType` keeps it and the other types refuse it with
  `TypePrimitiveException`. `Required(...)` also declares the `isRequired` validation. An id is
  always required. A missing simple value is an optional value object holding `null`; only a
  missing composite or child entity is an `X | null` field.
- A domain VO is always a named subclass (`class Email extends ...`), one per file (the only
  exception is an enum, whose file `<Enum>Type.ts` holds the enum, `<Enum>Option` and
  `<Enum>Type` together): the name
  appears in the error messages, and `equals` compares the class too (`BillingCountry('ES')` is
  not a `ShippingCountry('ES')`). Never use a base type (`Required(StringType)`) as a property
  type. Each context declares its own, even when another context has a similar one.
- **A value object that exists is valid.** The constructor converts (or throws
  `TypePrimitiveException`), checks `Required` (or throws `RequiredValueException`) and runs every
  `@Validations` rule, throwing one `ValidationException` with all the broken rules
  (`errors: [{ field: null, code: 'isEmail', message: '<Class>: <message>' }]`; `code` is the
  validator or custom rule name, or the code of the exception). There is no `assertValid()` nor
  `ensure…()`; `validate()` only re-runs the rules and is always ok on a built VO. A VO rule never
  moves to the controller or a request schema, and nobody catches its `ValidationException` to
  keep an invalid value.
- Rules are `@Validations([...])` from `@archi-code/validation` above the class:
  `{ validator: 'matches', properties: { pattern }, message? }` (a validator's parameters go in a
  single `properties` object) or `{ custom: '<camelCaseName>', fn, message }` for list and
  composite rules. Write an English `message` when the validator's own is not clear. Subclasses
  inherit validations, and one with the same name replaces the parent's. The validators and their
  options are in the `archi-code-validation` skill and the README of `@archi-code/validation`.
- **Report every field, never only the first.** In `toCommand` (or as the first step of a reaction
  use case), build the value objects with `ValueObjectBuilder.build({ field: () => new X(input.field), … })`
  from `@archi-code/ddd/application` (the domain never uses it): it runs every factory and throws
  one `ValidationException` whose `errors` carry the `field` and `code` of each problem (required
  `DOM004`, conversion `DOM003`, a rule name, or the code of any `DomainException`);
  `ValueObjectBuilder.buildList(list, (item) => …)` names list items by position
  (`lines.1.quantity`). It returns the value objects typed field by field. Factories are
  synchronous (one that returns a Promise does not compile and is refused at run time with
  `UnexpectedErrorException`), and an error that is not a `DomainException` is a bug that wins
  over the validation errors already collected. Never build them one by one with `new`, never
  inside `handle` from raw input, and never pass raw values into an aggregate.
- Kinds of value object and their base:
  - Text, number, boolean, date: `Required(StringType | NumberType | BooleanType | DateType)` or
    the bare base when optional.
  - Id of an aggregate: `class OrderId extends IdType<'OrderId'> {}`, the class name as brand so
    the compiler never takes a `CustomerId` for an `OrderId`. A new random id is
    `OrderId.generate()`, called by the use case. An id derived from other data is a static
    method of the id class over a UUID v5:
    `static forOrder(order: OrderReference): PaymentId { return new PaymentId(UuidType.fromValue(`payment-of-order:${order.value}`)); }`
    (one payment per order, found again by the same id). `UuidType`/`IdType` store lowercase and
    refuse the nil and max UUIDs.
  - Reference to an aggregate of another context: `<Other>Reference extends Required(UuidType)`
    (`OrderReference` in payments), never the other context's id class.
  - Enum: one file `<Enum>Type.ts` with `export enum <Enum>` (snake_case string values, except
    a code of an external standard such as an ISO currency or country, written as the standard
    writes it: `EUR = 'EUR'`),
    `<Enum>Option extends EnumType<<Enum>>` (`protected getEnum()`) and
    `<Enum>Type extends Required(<Enum>Option)`; an optional enum is one class,
    `<Enum>Type extends EnumType<<Enum>>` with its `getEnum()`, without `<Enum>Option`. Its primitive is the enum option, so
    `new OrderStatusType(primitives.status)` needs no cast; from text input cast it
    (`new PaymentMethodType(input.paymentMethod as PaymentMethod)`).
  - List of simple values: `<Item>List extends ArrayType<<Item>>` (`createItem`, list rules as
    `custom` validations) plus `<Item>s extends Required(<Item>List)`. An `ArrayType` receives
    items that are already valid: it does not collect item errors and lets the error of the first
    invalid item through as the item throws it. A list of composites is never an `ArrayType`: it is
    a composite list field or an array of child entities.
  - Custom conversion: `extends AbstractType<T>` implementing only
    `protected filter(value: unknown): T` (it receives input already known to be non-empty and
    returns the value or throws `TypePrimitiveException('<what>', value)`), paired with a
    `Required(...)` class in a second file (`CentsAmount` + `Cents`). To restrict an existing type
    extend it and use `@Validations`; to normalize (trim, lower case) override `filter` and call
    `super.filter(value)` first.
  - Several fields: a composite (below).
  - Free-form JSON stored as it is: three files, `interface <Name>Data extends JsonTypeValue`,
    `<Name>Json extends JsonType<<Name>Data>` and `<Name> extends Required(<Name>Json)`. A JSON
    value is a non-empty object, never a composite, and a composite is never a JSON value.
- Values are **immutable**: `_value` is `readonly`; behavior returns new instances
  (`money.add(other)`, `money.lessPercent(10)`); `ArrayType.withItem/withoutItem` return a new
  instance; `UpdatedAt` is replaced with `UpdatedAt.now()`. Values are frozen and date setters
  throw.
- `toString()` is a method, `equals(other)` compares class and value (dates by instant, arrays
  and objects by content); never compare with `===`. An optional value object with no value
  answers `isNull` (`if (trackingNumber.isNull)`), and a `DateType` gives its ISO text with
  `toString()` (`expectedDeliveryOn: shipment.expectedDelivery.toString()` in an event, a date
  field named `…On` like `occurredOn`). Template literals work on VOs; `JSON.stringify` does not
  unwrap them: serialize `value` or the aggregate's `toPrimitives()`.
- **Every value object has `slug()`**, the slug of its `toString()`, safe to pass in a
  URL as it is (`StringSanitizer.slug(this.toString())`, declared once in `AbstractType`): lowercase
  `a-z`, `0-9` and single inner `-`, accents removed (`Máscara Año` → `mascara-ano`), ordinals
  dropped (`1.º piso` → `1-piso`), `''` when the value object holds null. `JsonType` sorts its keys
  first, so equal JSON values give the same slug. A subclass that overrides `toString()` changes its
  slug. For a plain string use `StringSanitizer.slug(text)`; never write a slug regex of your own.
  A slug is not an id: two titles can give the same one.
- **One-line text is `StringSanitizer.singleLine(text)`**: every run of spaces, tabs and line
  breaks becomes one space and the ends are trimmed; every other character stays. A value object
  that must hold one line (a title, a name) cleans itself by overriding `filter`
  (`return StringSanitizer.singleLine(super.filter(value))`), so its `@Validations` rules, `equals`
  and `slug()` see the clean text; `toCommand` and controllers never clean values by hand.
- Dates: `DateType` accepts `Date`, ISO dates (`'2024-01-31'`, UTC midnight) and ISO date-times
  **with** a zone (`Z` or offset); a date-time without a zone throws `TypePrimitiveException`.
- **Concepts of several attributes are composite value objects**, not entities nor loose fields:
  `class Money extends Composite({ amount: Cents, currency: MoneyCurrency }) {}`. The schema names
  each field's class: a value object class, another composite, or a list `[ShipmentItem]`. Fields
  are exposed read-only with their value object type; the instance is frozen; `equals` compares
  class and every field; `toPrimitives()` gives plain data (dates stay `Date`);
  `X.fromPrimitives(data)` rebuilds it reporting every invalid field with its path
  (`items.1.quantity`), and `new X({ field: vo })` builds it from value objects. Rules over
  several fields are `custom` validations whose `fn` receives the built composite. A collection
  with rules of its own is a composite with a list field
  (`Composite({ items: [ShipmentItem] })` with an `atLeastOneItem` rule). A field of a composite
  may hold an optional value object whose value is `null`; only a missing instance is refused. An
  optional composite is an `X | null` field of the aggregate, never `Required(Composite(...))`.
- **Money is a composite with whole minor units** (`Composite({ amount: Cents, currency:
  MoneyCurrency })`, `Cents` a whole number of cents ≥ 0), never a decimal amount; it is exact up
  to `Number.MAX_SAFE_INTEGER` cents (the books use `bigint`, `[Fuera de los libros: convención de
  @archi-code/ddd]`); rounding is explicit (discounts round down), and mixing currencies throws a
  business error (`CurrencyMismatch`, code `MNY<NNN>`). `MoneyCurrency` is an enum value object
  (`enum Currency`, `CurrencyOption`, `MoneyCurrency` in `MoneyCurrency.ts`), never a validated
  text. It lives in `shared-kernel/money/`.
- **Derived values are methods, never getters** (`total()`, `units()`), on aggregates, child
  entities and composites: `PrimitiveTypes` sees every getter as a field, so a computed getter
  breaks `toPrimitives()` at compile time.

## Code

### Value objects

Optional by default, required with `Required(XType)`:

```ts
class Nickname extends StringType {} // value: string | null; constructor accepts string | null | nothing
class Name extends Required(StringType) {} // value: string; constructor demands string
class FullName extends Name {} // still required
```

Always valid: the `@Validations` rules run in the constructor, and `ValueObjectBuilder.build`
reports every field at once:

```ts
import { NumberType, Required, StringType } from '@archi-code/ddd/domain';
import { Validations } from '@archi-code/validation';

@Validations([
  {
    validator: 'matches',
    properties: { pattern: /^[A-Z0-9-]{3,20}$/ },
    message: 'A SKU has 3 to 20 capital letters, digits or dashes',
  },
])
export class Sku extends Required(StringType) {}

@Validations([
  { validator: 'isInt', properties: { min: 1, max: 99 }, message: 'From 1 to 99 units' },
])
export class Quantity extends Required(NumberType) {}

new Sku('x');
// ValidationException: Validation failed, Sku: A SKU has 3 to 20 capital letters, digits or dashes

ValueObjectBuilder.build({
  sku: () => new Sku(input.sku),
  quantity: () => new Quantity(input.quantity),
});
// input { sku: 'x', quantity: 0 } → one ValidationException with every field:
// errors: [
//   { field: 'sku', code: 'matches', message: 'Sku: A SKU has 3 to 20 capital letters, digits or dashes' },
//   { field: 'quantity', code: 'isInt', message: 'Quantity: From 1 to 99 units' },
// ]
```

Ids: a random one, a reference to another context's aggregate, and one derived from another
aggregate (one payment per order, found again by the same id):

```ts
import { IdType, Required, UuidType } from '@archi-code/ddd/domain';

export class OrderId extends IdType<'OrderId'> {}

export class OrderReference extends Required(UuidType) {}

export class PaymentId extends IdType<'PaymentId'> {
  static forOrder(order: OrderReference): PaymentId {
    return new PaymentId(UuidType.fromValue(`payment-of-order:${order.value}`));
  }
}
```

An enum, `value-object/PaymentStatusType.ts` (the primitive is the enum option, so the round trip
needs no cast; an optional enum is one class, `class RejectionCodeType extends EnumType<RejectionCode>` with
its `getEnum()`):

```ts
import { EnumType, Required } from '@archi-code/ddd/domain';

export enum PaymentStatus {
  PENDING = 'pending',
  CAPTURED = 'captured',
  REJECTED = 'rejected',
  AWAITING_TRANSFER = 'awaiting_transfer',
  REFUNDED = 'refunded',
  VOIDED = 'voided',
}

export class PaymentStatusOption extends EnumType<PaymentStatus> {
  protected getEnum(): typeof PaymentStatus {
    return PaymentStatus;
  }
}

export class PaymentStatusType extends Required(PaymentStatusOption) {}
```

A list of simple values (`CouponCodeList.ts` + `CouponCodes.ts`):

```ts
import { ArrayType, Required } from '@archi-code/ddd/domain';
import { Validations } from '@archi-code/validation';

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

export class CouponCodes extends Required(CouponCodeList) {}
```

A custom conversion (`CentsAmount.ts` + `Cents.ts`), the currency enum and money as a composite
with behavior, in `shared-kernel/money/`:

```ts
import {
  AbstractType,
  Composite,
  DomainException,
  EnumType,
  Required,
  TypePrimitiveException,
} from '@archi-code/ddd/domain';

export class CentsAmount extends AbstractType<number> {
  protected filter(value: unknown): number {
    const cents = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    if (typeof cents !== 'number' || !Number.isSafeInteger(cents) || cents < 0) {
      throw new TypePrimitiveException('amount in cents', value);
    }
    return cents;
  }
}

export class Cents extends Required(CentsAmount) {}

export enum Currency {
  EUR = 'EUR',
  USD = 'USD',
}

export class CurrencyOption extends EnumType<Currency> {
  protected getEnum(): typeof Currency {
    return Currency;
  }
}

export class MoneyCurrency extends Required(CurrencyOption) {}

export class CurrencyMismatch extends DomainException {
  constructor(expected: string, received: string) {
    super(`Cannot combine ${received} with ${expected}`, ['MNY001']);
  }
}

export class Money extends Composite({ amount: Cents, currency: MoneyCurrency }) {
  static zero(currency: Currency): Money {
    return new Money({ amount: new Cents(0), currency: new MoneyCurrency(currency) });
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return this.withAmount(this.amount.value + other.amount.value);
  }

  times(factor: number): Money {
    return this.withAmount(this.amount.value * factor);
  }

  lessPercent(percent: number): Money {
    return this.withAmount(this.amount.value - Math.floor((this.amount.value * percent) / 100));
  }

  isAtLeast(cents: number): boolean {
    return this.amount.value >= cents;
  }

  private assertSameCurrency(other: Money): void {
    if (!this.currency.equals(other.currency)) {
      throw new CurrencyMismatch(this.currency.value, other.currency.value);
    }
  }

  private withAmount(cents: number): Money {
    return new Money({ amount: new Cents(cents), currency: this.currency });
  }
}

const price = Money.fromPrimitives({ amount: 1250, currency: Currency.EUR });
price.toPrimitives(); // { amount: 1250, currency: 'EUR' }
```

A composite with a list field and a rule over the whole value:

```ts
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

Free-form JSON stored as it is (three files; never a composite):

```ts
import { JsonType, Required } from '@archi-code/ddd/domain';
import type { JsonTypeValue } from '@archi-code/ddd/domain';

export interface CarrierLabelData extends JsonTypeValue {
  carrier: string;
  service: 'standard' | 'gift';
  country: string;
  units: number;
}

export class CarrierLabelJson extends JsonType<CarrierLabelData> {}

export class CarrierLabel extends Required(CarrierLabelJson) {}
```

Slugs and one-line text: every value object has `slug()` (the slug of its `toString()`), and a
value object that must hold one line cleans its own input in `filter` with
`StringSanitizer.singleLine`, so its rules, `equals` and `slug()` see the clean text:

```ts
import { Required, StringSanitizer, StringType } from '@archi-code/ddd/domain';
import { Validations } from '@archi-code/validation';

@Validations([
  { validator: 'isLength', properties: { min: 3, max: 80 }, message: 'From 3 to 80 characters' },
])
export class ProductTitle extends Required(StringType) {
  protected filter(value: unknown): string {
    return StringSanitizer.singleLine(super.filter(value));
  }
}

const title = new ProductTitle('  Máscara   de\r\n\tsoldar  ');
title.value; // 'Máscara de soldar'
title.slug(); // 'mascara-de-soldar'
new ProductTitle('  a \n '); // ValidationException: ProductTitle: From 3 to 80 characters
new ProductTitle('Casco pro').equals(new ProductTitle(' Casco\npro ')); // true

new CreatedAt('2026-11-15T10:30:00+01:00').slug(); // '2026-11-15t09-30-00-000z'
new CarrierLabelJson({ country: 'ES', carrier: 'Correos', service: 'gift', units: 2 }).slug();
// 'carrier-correos-country-es-service-gift-units-2' (keys sorted)

StringSanitizer.slug('1.º piso «Huelva»'); // '1-piso-huelva', for a plain string
StringSanitizer.singleLine(' Línea uno.\r\n Línea dos. '); // 'Línea uno. Línea dos.'
```

A slug is not unique: two titles can give the same one (`Casco Pro`, `casco-pro`). Aggregates are
still looked up by their id; to find one by its slug, store the slug as a value object of its own
with a unique index in the repository.

## What not to do

- Using `Required(StringType)` directly as a property type instead of a named subclass, or two
  value objects in one file (except the two classes of an enum in its `<Enum>Type.ts`).
- `ensure…()`/`validate…()` methods of your own, or calling `assertValid()` (it does not exist):
  the constructor already throws `ValidationException`.
- Building the value objects of an input one after another with `new` in `toCommand` (or at the
  start of a reaction): the first invalid field hides the rest. Use `ValueObjectBuilder.build`.
- Building value objects inside `handle` from raw input, or passing raw strings to aggregates.
- Moving a value object's rule to the request schema or the controller (`isEmail` in a DTO
  validator instead of the `Email` value object): the controller checks only the shape.
- Catching the `ValidationException` of a value object to keep an invalid value, or creating
  `ValidationException` by hand from `validate()` results.
- An enum split over several files, or named against the convention: one `<Enum>Type.ts` with
  `enum <Enum>`, `<Enum>Option` and `<Enum>Type`.
- `MoneyCurrency` as a validated text instead of the `Currency` enum value object.
- Using another context's id class for a reference: declare `<Other>Reference extends
  Required(UuidType)` in the context that holds it.
- An id class without its brand (`class OrderId extends IdType {}`): a `CustomerId` is then
  accepted where an `OrderId` is expected. Write `class OrderId extends IdType<'OrderId'> {}`.
- An optional value object (`class Code extends StringType {}`) as the id of an entity or
  aggregate: an id is always required.
- `IdType` with `00000000-0000-0000-0000-000000000000` or `ffffffff-ffff-ffff-ffff-ffffffffffff`:
  throws `TypePrimitiveException`.
- Mutating a VO or its value (`vo.value.setFullYear(...)`, pushing to `vo.value`): values are
  frozen and date setters throw. Build a new VO; for arrays keep what `withItem`/`withoutItem`
  return.
- Comparing VOs or entities with `===`: use `equals()`.
- `vo.toString` without parentheses: it is a method.
- Sending local date-times without a zone (`'2024-01-31T10:00:00'`) to `DateType`.
- Passing unconverted values with their static type (`new NumberType('1.5')`): type error;
  conversion is for `any`/`unknown` input.
- `JsonType` with `{}` or with an array: throws `TypePrimitiveException` (it must be a non-empty
  object).
- Modeling an amount with its currency, a date range or an address as loose fields of the
  aggregate, as a `JsonType`, or as a child entity with an id nobody looks up: use `Composite`.
  And never turn a free-form JSON value into a composite, nor the other way round.
- `ArrayType<OrderLine>` with a composite item: a list of composites is a `Composite` list field
  (`Composite({ items: [ShipmentItem] })`) or an array of child entities in the aggregate.
- `Required(Composite(...))`, or `Composite({ amount: Required(NumberType) })` without a named
  class: every field class is a named subclass; an optional composite is a `Money | null` field.
- Mutating a composite or adding state to it: it is frozen; return a new instance.
- A computed getter (`get total()`) on an aggregate, a child entity or a composite:
  `PrimitiveTypes` takes it for a field and `toPrimitives()` stops compiling; write a method.
- Importing `@Validations` from `@archi-code/ddd/domain`: it comes from `@archi-code/validation`.
- A slug or whitespace cleanup of your own (regexes, `slugify`-like libraries, `.trim()` and
  `.replace(/\s+/g, ' ')` in a controller or `toCommand`): use `vo.slug()`,
  `StringSanitizer.slug(text)` and `StringSanitizer.singleLine(text)`.
- Cleaning a value object's text in `toCommand` or in the aggregate instead of its `filter`: every
  other place that builds it (`fromPrimitives`, reactions, tests) gets the dirty text.
- A slug as the id of an aggregate, or a lookup by slug without a unique index: two titles can give
  the same slug (`Casco Pro` and `casco-pro`). Keep the id and treat the slug as a field.
- Expecting `slug()` to keep what it drops: the sign of a number (`-3` → `3`), letters of other
  scripts (`溶接` → `''`) and ordinals (`1.º` → `1`); a slug identifies nothing on its own.
