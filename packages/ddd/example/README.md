# Online shop: an end-to-end example of @archi-code/ddd

An academic example of `@archi-code/ddd` in a small online shop with three
bounded contexts (Sales, Payments and Shipping) that only talk through domain events. Everything runs
in memory: repositories, the event channel, the read model and the HTTP entry points (simulated
controllers that return `{ status, body }`).

It lives in the package's `example/` folder, which is not published to npm. It is only code: it
has no specs and no command line, and the package's `check:types` type-checks it
(`tsc -p example/tsconfig.json`).

## Context map

```
                 sales.order.OrderPlaced ───────────────► Payments
   Sales  ◄───── payments.payment.PaymentCaptured / PaymentRejected
          ───── sales.order.OrderLineQuantityChanged ──► Payments (adjusts a waiting transfer)
          ───── sales.order.OrderCancelled ────────────► Payments (refund or void)
          ───── sales.order.OrderPaid ─────────────────► Shipping
          ───── sales.order.OrderCancelled ────────────► Shipping (cancel while preparing)
          ◄───── shipping.shipment.ShipmentDispatched / ShipmentDelivered
```

- One `InMemoryEventChannel({ delivery: 'serial' })` is shared by the three contexts (`src/shop.ts`);
  each context has its own `DomainEventBus` and `EventRegistry` (`src/contexts/<context>/composition.ts`).
- Published events are named `'<context>.<module>.<Event>'`. A context never imports another one: the
  consumer declares its own class for each event it reads, with the same `eventName` and only the
  fields it needs (published language, tolerant reader). For example
  `payments/application/request-payment/order-placed.ts` reads only `orderId`, `total` and
  `paymentMethod` of `sales.order.OrderPlaced`.
- `contexts/shared-kernel/money` (`Money`, `Cents`, `Currency`) is the only code two contexts share.
- `platform/http/http.ts` is the technical helper every controller uses to translate errors with
  `ExceptionClassifier`; it holds no business rule.

## The flows

| Story                           | What happens                                                                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Card order                      | `OrderPlaced` → `PaymentCaptured` → `OrderPaid` → `ShipmentPrepared`, all before `placeOrder` answers 201                                |
| Shipment                        | warehouse dispatches (`ShipmentDispatched` → `OrderShipped`) and delivers (`ShipmentDelivered` → `OrderDelivered`)                       |
| Card over 500.00 (compensation) | `PaymentRejected` (`limit_exceeded`) → `OrderCancelled`; no shipment is prepared                                                         |
| Bank transfer                   | `PaymentAwaitingTransfer`; quantity changes adjust the payment; treasury confirms the exact amount → paid, or a wrong amount → cancelled |
| Cancellation                    | a paid order is refunded and its shipment cancelled; a waiting transfer is voided                                                        |
| Read model                      | `UpdateOrderSummaryOn<Event>` listeners run `ProjectOrderSummary`, which skips an `eventId` it already applied                           |

## Business rules

| Context  | Rule                                                                                                                                    | Where                                    |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Money    | whole cents ≥ 0; never mixes currencies (`MNY001`); discounts round down                                                                | `Money`, `Cents` (custom `AbstractType`) |
| Sales    | 1 to 20 lines (`SAL001`), no repeated SKU (`SAL002`), one currency, total from 0.01 to 10000.00 (`SAL003`)                              | `Order.place`                            |
| Sales    | quantities and address change only while `pending_payment` (`SAL004`); a quantity that breaks the total is undone                       | `Order`, `OrderLine` (child entity)      |
| Sales    | only the buyer cancels (`SAL006`, business rule → 422), only before shipping (`SAL005`); only an admin discards a cancelled order (403) | `Order.cancel`, `DiscardCancelledOrder`  |
| Sales    | coupons: up to 3, no repeats (list rules), known active campaigns (`SAL009`), discount capped at 50%                                    | `CouponCodes`, `OrderPricing`            |
| Sales    | free shipping: subtotal ≥ 50.00 or a premium pass, and no gift card                                                                     | `FreeShippingEligible` (specification)   |
| Sales    | only the signed-in customer places their own orders (`NotAllowedException`, 403)                                                        | `PlaceOrder`                             |
| Payments | card up to 500.00, transfer up to 5000.00, else rejected; a transfer must arrive with the exact amount                                  | `Payment.request`, `confirmTransfer`     |
| Payments | only treasury confirms transfers (403); one payment per order (id derived from the order)                                               | `ConfirmTransferReceived`, `PaymentId`   |
| Shipping | carrier and delivery date by country; dispatch needs a tracking number (`SHP002`) and a preparing shipment (`SHP001`)                   | `Shipment`                               |
| Shipping | only the warehouse dispatches and delivers (403)                                                                                        | `DispatchShipment`, `DeliverShipment`    |

Reactions to events (`markPaid`, `cancelForRejectedPayment`, `settleForCancelledOrder`,
`cancelForCancelledOrder`…) are facts: they are idempotent and never throw a business error. Use
cases run by a listener return quietly when their aggregate does not exist.

## Where each piece of the package is used

| Piece                                                     | In the example                                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `StringType`, `NumberType`, `BooleanType`, `Required`     | `Sku`, `Quantity`, `GiftWrap`, address fields                                              |
| `DateType`, `CreatedAt`, `UpdatedAt`                      | `ExpectedDelivery`, every aggregate                                                        |
| `UuidType`, `IdType` (with brand)                         | `PaymentReference` (optional), `OrderReference`, `OrderId`, `PaymentId.forOrder` (v5)      |
| `EnumType`                                                | statuses, `Currency`, `PaymentMethod`, `Carrier`, `RejectionCodeType` (optional)           |
| `JsonType`, `ArrayType`, custom `AbstractType`            | `CarrierLabel`, `CouponCodes` (with list rules), `CentsAmount`                             |
| `Composite` (nested and with a list)                      | `Money`, `ShippingAddress` → `Recipient`, `ShipmentContents` → `[ShipmentItem]`            |
| `Entity`, `AggregateRoot`, `PrimitiveTypes`               | `OrderLine`; `Order`, `Payment`, `Shipment` with `toPrimitives` / `fromPrimitives`         |
| `Specification` (`and`, `or`, `not`)                      | `FreeShippingEligible`, `SubtotalAtLeast`, `ContainsSku`                                   |
| Domain service and domain port                            | `OrderPricing` over `CouponCatalog`                                                        |
| `AggregateFinder` / `Saver` / `Remover`                   | use cases ask only for the roles they use; in-memory repositories with optimistic versions |
| `UseCase`, `ValueObjectBuilder.build` / `buildList`       | every use case; `PlaceOrder` reports `lines.1.quantity`                                    |
| `EventBase`, `EventListener`, `@ListensTo`, `EventBus`    | `order-events.ts`, `<Action>On<Event>` listeners next to their use case                    |
| `DomainEventBus`, `EventRegistry`, `InMemoryEventChannel` | each `composition.ts` and `shop.ts`                                                        |
| `Clock`, `Logger`, loggers and clocks                     | `CancelUnpaidOrder` logs; controllers log internal failures                                |
| `ConcurrencyException` (retry and 409)                    | `ChangeShippingAddress` retries; `ChangeOrderLineQuantity` answers 409                     |
| `AggregateNotFoundException`, `NotAllowedException`       | 404 and 403 of the controllers                                                             |
| `InternalErrorException`                                  | the coupon catalog wraps bad campaign data (500)                                           |
| `ExceptionClassifier`, `ExceptionKind`                    | `platform/http/http.ts`                                                                    |

Not shown, because they only matter in tests, in production wiring or for mistakes in the wiring:
`ConsoleLogger`, `SystemClock`, `FixedClock`,
`InMemoryLogger`, `SilentLogger`, `UnexpectedErrorException`, `RequiredValueException`,
`InvalidEventDefinitionException`, `UnknownEventException`, `EventDeliveryException` and the
exception code enums.

## Layout

```
src/
  ddd/                       re-exports src/<layer>/index of the package, as @archi-code/ddd/<layer>
  platform/http/             error translation shared by the controllers
  contexts/
    shared-kernel/money/
    sales/      domain/ application/ infrastructure/ interfaces/ composition.ts
    payments/   domain/ application/ infrastructure/ interfaces/ composition.ts
    shipping/   domain/ application/ infrastructure/ interfaces/ composition.ts
  shop.ts                    opens the three contexts on one channel
```
