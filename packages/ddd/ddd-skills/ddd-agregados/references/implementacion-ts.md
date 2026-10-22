# Implementar agregados en TypeScript

Contenido: 1. Raíz base · 2. Construcción paso a paso · 3. Agregado completo · 4. Dependencias de otros agregados · 5. Concurrencia optimista · 6. Variante funcional · 7. Tests

## 1. Raíz base

La raíz no se escribe a mano: se extiende `AggregateRoot<Id, Event>` de `@archi-code/ddd/domain`, que ya trae lo que IDDD cap. 10 describe para la raíz salvo la versión (identidad, igualdad por identidad y lista de eventos registrados); la versión para la concurrencia optimista la guarda el repositorio, no el agregado (sección 5) `[Fuera de los libros: convención de @archi-code/ddd]`.

```ts
import { AggregateRoot } from '@archi-code/ddd/domain';

export class Order extends AggregateRoot<OrderId, OrderEvent> {
  private constructor(
    id: OrderId,
    readonly customerId: CustomerId,
  ) {
    super(id);
  }
}
```

La clase completa está en la sección 3. Lo que da la base:

* `readonly id` y `equals(other)` (misma clase y mismo id) de `Entity<Id>`; un id sin valor lanza `RequiredValueException`.
* `protected record(event)`: guarda el evento congelado (los hechos no cambian [IDDD cap. 8]).
* `pullDomainEvents()`: devuelve los eventos en orden (tipados como `Event[]`) y vacía la lista; lo llama el caso de uso tras guardar.
La base no trae versión: el agregado no la declara, no la mapea en `toPrimitives()` y el caso de uso nunca la ve. Cada repositorio recuerda la versión de cada agregado que cargó o guardó en un `WeakMap<Order, number>` propio y la actualiza solo cuando la escritura ha ido bien; así un segundo `save` del mismo objeto (por ejemplo, dos comandos seguidos en el mismo proceso) no da un falso conflicto de concurrencia `[Fuera de los libros: convención de @archi-code/ddd]`. Lo cumplen todos los repositorios, también el `InMemoryOrderRepository` que el proyecto escribe en `test/support/` para los tests.

Por qué registrar en vez de publicar: IDDD publica desde el agregado con un publicador estático [IDDD cap. 8]. Registrar y dejar que la aplicación publique no requiere un singleton global en el dominio y, con una bandeja de salida (outbox), evita entregar eventos de cambios que no llegaron a guardarse. *DDD in PHP* discute ambas variantes [PHP: Domain Events]. Con el paquete, el caso de uso llama a `await this.orders.save(order)` y después a `events.publish(order.pullDomainEvents())`; la aplicación no abre transacciones, porque la transacción es del repositorio. Si `publish` falla tras `save`, el evento puede perderse; cuando eso no es admisible, el repositorio guarda el agregado y sus eventos pendientes en la misma escritura atómica (outbox) y un proceso aparte los entrega por un `EventChannel`, y el caso de uso no cambia `[Fuera de los libros: convención de @archi-code/ddd]`.

## 2. Construcción paso a paso

Orden que sigue Destilado para construir la raíz [Destilado cap. 5]:

1. Clase de la raíz (`extends AggregateRoot<OrderId, OrderEvent>`).
2. Identidad global única como value object (`class OrderId extends IdType<'OrderId'> {}`; en multi-tenant, también el `TenantId`).
3. Atributos intrínsecos necesarios para encontrarlo (nombre, descripción).
4. Getters solo si hacen falta; **sin setters públicos**. Con el paquete, cada campo que se guarda tiene un getter público con su nombre sin `_` (o es `readonly` público), porque `PrimitiveTypes` los lee para tipar `toPrimitives()`/`fromPrimitives()` (nada lo comprueba en tiempo de ejecución: lo cubre el test de ida y vuelta de cada agregado); los valores derivados son métodos (`total()`) `[Fuera de los libros: convención de @archi-code/ddd]`.
5. Comportamiento complejo con nombres del lenguaje (`planBacklogItem`, `scheduleRelease`).

## 3. Agregado completo: Order

Value objects del pedido (su diseño detallado está en `ddd-value-objects-entidades`):

```ts
import {
  Composite,
  DateType,
  EnumType,
  IdType,
  NumberType,
  Required,
  StringType,
} from '@archi-code/ddd/domain';
import { DomainException } from '@archi-code/ddd/exceptions';
import { Validations } from '@archi-code/validation';

export class OrderId extends IdType<'OrderId'> {}
export class CustomerId extends IdType<'CustomerId'> {}
export class ReservationId extends IdType<'ReservationId'> {}
export class PaymentId extends IdType<'PaymentId'> {}
export class Sku extends Required(StringType) {}
export class Street extends Required(StringType) {}
export class City extends Required(StringType) {}
export class CancellationReason extends Required(StringType) {}
export class ExpiresAt extends Required(DateType) {}

@Validations([{ validator: 'isInt', properties: { min: 1 } }])
export class Quantity extends Required(NumberType) {}

@Validations([{ validator: 'isInt' }])
export class Cents extends Required(NumberType) {}

@Validations([{ validator: 'isISO4217' }])
export class Currency extends Required(StringType) {
  protected filter(value: unknown): string {
    return super.filter(value).trim().toUpperCase();
  }
}

@Validations([{ validator: 'isISO31661Alpha2' }])
export class Country extends Required(StringType) {
  protected filter(value: unknown): string {
    return super.filter(value).trim().toUpperCase();
  }
}

export class CurrencyMismatch extends DomainException {
  constructor(expected: string, received: string) {
    super(`Cannot add ${received} to ${expected}`, ['PAY001']);
  }
}

export class Money extends Composite({ amount: Cents, currency: Currency }) {
  add(other: Money): Money {
    if (!this.currency.equals(other.currency)) {
      throw new CurrencyMismatch(this.currency.value, other.currency.value);
    }
    return new Money({
      amount: new Cents(this.amount.value + other.amount.value),
      currency: this.currency,
    });
  }

  times(quantity: Quantity): Money {
    return new Money({
      amount: new Cents(this.amount.value * quantity.value),
      currency: this.currency,
    });
  }

  covers(other: Money): boolean {
    return this.currency.equals(other.currency) && this.amount.value >= other.amount.value;
  }
}

export class OrderLine extends Composite({ sku: Sku, quantity: Quantity, unitPrice: Money }) {
  subtotal(): Money {
    return this.unitPrice.times(this.quantity);
  }
}

@Validations([
  {
    custom: 'hasLines',
    fn: (lines) => (lines as OrderLines).items.length > 0,
    message: 'An order needs at least one line',
  },
  {
    custom: 'uniqueSku',
    fn: (lines) => {
      const skus = (lines as OrderLines).items.map((line) => line.sku.value);
      return new Set(skus).size === skus.length;
    },
    message: 'Each SKU appears in one line only',
  },
])
export class OrderLines extends Composite({ items: [OrderLine] }) {
  withLine(line: OrderLine): OrderLines {
    return new OrderLines({ items: [...this.items, line] });
  }

  total(): Money {
    const [first, ...rest] = this.items;
    return rest.reduce((sum, line) => sum.add(line.subtotal()), first.subtotal());
  }
}

export class ShippingAddress extends Composite({ street: Street, city: City, country: Country }) {}

export class PaymentAuthorization extends Composite({
  paymentId: PaymentId,
  amount: Money,
  expiresAt: ExpiresAt,
}) {
  covers(total: Money): boolean {
    return this.amount.covers(total);
  }
}

export enum Status {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Cancelled = 'cancelled',
}

export class StatusType extends EnumType<Status> {
  protected getEnum(): typeof Status {
    return Status;
  }
}

export class OrderStatus extends Required(StatusType) {
  isPending(): boolean {
    return this.value === Status.Pending;
  }

  isConfirmed(): boolean {
    return this.value === Status.Confirmed;
  }

  canBeCancelled(): boolean {
    return this.value !== Status.Cancelled;
  }
}
```

Eventos (hechos en pasado, con primitivos tomados de los value objects) y errores de negocio:

```ts
import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';
import { DomainException } from '@archi-code/ddd/exceptions';

export interface MoneyData {
  readonly amount: number;
  readonly currency: string;
}

export interface OrderLineData {
  readonly sku: string;
  readonly quantity: number;
  readonly unitPrice: MoneyData;
}

export class OrderPlaced extends EventBase {
  static readonly eventName = 'OrderPlaced';

  constructor(
    readonly orderId: string,
    readonly customerId: string,
    readonly lines: readonly OrderLineData[],
    readonly total: MoneyData,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

export class OrderLineAdded extends EventBase {
  static readonly eventName = 'OrderLineAdded';

  constructor(
    readonly orderId: string,
    readonly sku: string,
    readonly quantity: number,
    readonly unitPrice: MoneyData,
    readonly total: MoneyData,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

export class OrderConfirmed extends EventBase {
  static readonly eventName = 'OrderConfirmed';

  constructor(
    readonly orderId: string,
    readonly total: MoneyData,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

export class OrderCancelled extends EventBase {
  static readonly eventName = 'OrderCancelled';

  constructor(
    readonly orderId: string,
    readonly reason: string,
    readonly reservationId: string | null,
    readonly paymentId: string | null,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

export class PaymentAuthorizationInsufficient extends EventBase {
  static readonly eventName = 'PaymentAuthorizationInsufficient';

  constructor(
    readonly orderId: string,
    readonly paymentId: string,
    readonly authorized: MoneyData,
    readonly required: MoneyData,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

export type OrderEvent =
  | OrderPlaced
  | OrderLineAdded
  | OrderConfirmed
  | OrderCancelled
  | PaymentAuthorizationInsufficient;

export class OrderNoLongerEditable extends DomainException {
  constructor(orderId: string) {
    super(`Order ${orderId} no longer accepts line changes`, ['ORD001']);
  }
}

export class OrderCannotBeCancelled extends DomainException {
  constructor(orderId: string, status: string) {
    super(`Order ${orderId} cannot be cancelled while ${status}`, ['ORD002']);
  }
}
```

La raíz:

```ts
import { AggregateRoot } from '@archi-code/ddd/domain';
import type { PrimitiveTypes } from '@archi-code/ddd/domain';

export class Order extends AggregateRoot<OrderId, OrderEvent> {
  private constructor(
    id: OrderId,
    readonly customerId: CustomerId,
    private _lines: OrderLines,
    readonly shippingAddress: ShippingAddress,
    private _status: OrderStatus,
    private _stockReservation: ReservationId | null,
    private _paymentAuthorization: PaymentAuthorization | null,
  ) {
    super(id);
  }

  static place(
    id: OrderId,
    customerId: CustomerId,
    lines: OrderLines,
    address: ShippingAddress,
    clock: { now(): Date },
  ): Order {
    const order = new Order(
      id,
      customerId,
      lines,
      address,
      new OrderStatus(Status.Pending),
      null,
      null,
    );
    order.record(
      new OrderPlaced(
        id.value,
        customerId.value,
        lines.items.map((line) => ({
          sku: line.sku.value,
          quantity: line.quantity.value,
          unitPrice: Order.moneyData(line.unitPrice),
        })),
        Order.moneyData(order.total()),
        { clock },
      ),
    );
    return order;
  }

  static fromPrimitives(primitives: PrimitiveTypes<Order>): Order {
    return new Order(
      new OrderId(primitives.id),
      new CustomerId(primitives.customerId),
      OrderLines.fromPrimitives(primitives.lines),
      ShippingAddress.fromPrimitives(primitives.shippingAddress),
      new OrderStatus(primitives.status),
      primitives.stockReservation === null ? null : new ReservationId(primitives.stockReservation),
      primitives.paymentAuthorization === null
        ? null
        : PaymentAuthorization.fromPrimitives(primitives.paymentAuthorization),
    );
  }

  get lines(): OrderLines {
    return this._lines;
  }

  get status(): OrderStatus {
    return this._status;
  }

  get stockReservation(): ReservationId | null {
    return this._stockReservation;
  }

  get paymentAuthorization(): PaymentAuthorization | null {
    return this._paymentAuthorization;
  }

  registerStockReservation(reservation: ReservationId, clock: { now(): Date }): void {
    if (!this._status.isPending()) {
      return;
    }
    this._stockReservation = reservation;
    this.tryToConfirm(clock);
  }

  registerPaymentAuthorization(authorization: PaymentAuthorization, clock: { now(): Date }): void {
    if (!this._status.isPending()) {
      return;
    }
    if (!authorization.covers(this.total())) {
      this.record(
        new PaymentAuthorizationInsufficient(
          this.id.value,
          authorization.paymentId.value,
          Order.moneyData(authorization.amount),
          Order.moneyData(this.total()),
          { clock },
        ),
      );
      return;
    }
    this._paymentAuthorization = authorization;
    this.tryToConfirm(clock);
  }

  cancel(reason: CancellationReason, clock: { now(): Date }): void {
    if (!this._status.canBeCancelled()) {
      throw new OrderCannotBeCancelled(this.id.value, this._status.value);
    }
    this._status = new OrderStatus(Status.Cancelled);
    this.record(
      new OrderCancelled(
        this.id.value,
        reason.value,
        this._stockReservation?.value ?? null,
        this._paymentAuthorization?.paymentId.value ?? null,
        { clock },
      ),
    );
  }

  addLine(line: OrderLine, clock: { now(): Date }): void {
    if (!this._status.isPending()) {
      throw new OrderNoLongerEditable(this.id.value);
    }
    this._lines = this._lines.withLine(line);
    this.record(
      new OrderLineAdded(
        this.id.value,
        line.sku.value,
        line.quantity.value,
        Order.moneyData(line.unitPrice),
        Order.moneyData(this.total()),
        { clock },
      ),
    );
  }

  total(): Money {
    return this._lines.total();
  }

  isConfirmed(): boolean {
    return this._status.isConfirmed();
  }

  toPrimitives(): PrimitiveTypes<Order> {
    return {
      id: this.id.value,
      customerId: this.customerId.value,
      lines: this._lines.toPrimitives(),
      shippingAddress: this.shippingAddress.toPrimitives(),
      status: this._status.value,
      stockReservation: this._stockReservation?.value ?? null,
      paymentAuthorization: this._paymentAuthorization?.toPrimitives() ?? null,
    };
  }

  private tryToConfirm(clock: { now(): Date }): void {
    if (this._stockReservation !== null && this._paymentAuthorization !== null) {
      this._status = new OrderStatus(Status.Confirmed);
      this.record(new OrderConfirmed(this.id.value, Order.moneyData(this.total()), { clock }));
    }
  }

  private static moneyData(money: Money): MoneyData {
    return { amount: money.amount.value, currency: money.currency.value };
  }
}
```

Cómo encaja con las reglas:

* `customerId` es una referencia por identidad (regla 3); `stockReservation` es la identidad de otro agregado de otro contexto, y `paymentAuthorization` un value object con lo mínimo que el pedido necesita de Pagos.
* Las líneas son un value object (`OrderLines`, parte reemplazable entera); `addLine` sustituye la colección por la que devuelve `withLine`, y la regla de SKU único la comprueba el propio value object.
* Constructor privado, una factoría de negocio (`place`, que registra `OrderPlaced`) y `fromPrimitives`, que reconstruye sin reglas de creación ni eventos; `toPrimitives()` devuelve solo datos planos. La conversión es solo del propio agregado (instantánea): el repositorio, cuyo constructor recibe solo las dependencias de su tecnología, llama directamente a `order.toPrimitives()` al escribir y a `Order.fromPrimitives(row.primitives)` al leer (la versión de la fila la guarda en su `WeakMap`, no en el agregado), sin mapper ni comprobación de forma en medio, y no lee los campos. Quien añade un campo lo añade a `toPrimitives`/`fromPrimitives`, y el spec del agregado comprueba la ida y vuelta `[Fuera de los libros: convención de @archi-code/ddd]`.
* Cada método recibe el reloj (`clock: { now(): Date }`) y lo pasa a los eventos (`{ clock }`): el dominio no llama a `new Date()` y los tests son deterministas.

### Comandos frente a hechos

`registerStockReservation` y `registerPaymentAuthorization` no son peticiones que el agregado pueda denegar: los invoca una política cuando **ya ha ocurrido** algo en otro contexto. Un comando se puede rechazar; un evento es un hecho y no se puede negar [Destilado cap. 6]. Si estos métodos lanzaran una excepción de negocio, el mensaje fallaría, la mensajería lo reenviaría y se reintentaría sin fin [IDDD cap. 10 describe el reintento hasta un límite]. Por eso:

* Los métodos que reaccionan a hechos son **idempotentes** y **no lanzan errores de negocio**.
* Si el hecho no encaja con las reglas, el agregado registra un evento con nombre del negocio (`PaymentAuthorizationInsufficient`) y otra política decide la compensación (anular la autorización, avisar al cliente). Así el problema queda visible en el modelo en vez de perdido en una cola de errores.
* Los errores de negocio con excepción (`DomainException` con su código) quedan para comandos de usuario (`cancel`, `addLine`), donde alguien puede recibir la respuesta (`ExceptionClassifier.classify(error)` los clasifica como `ExceptionKind.Invalid`, 422 en HTTP, y el punto de entrada puede dar otro estado a su código).

Qué protege este agregado (sus invariantes, regla 1):
* El total es siempre la suma de sus líneas (las líneas son un value object con su regla).
* Un pedido confirmado tiene reserva y autorización que cubre el total.
* Las líneas solo cambian en estado pendiente.

Qué **no** protege (y por eso no contiene): el stock del almacén ni el estado de la pasarela. Son otros agregados en otros contextos; llegan por identidad o como value object mínimo.

## 4. Dependencias de otros agregados

No inyectes repositorios ni servicios en el agregado. Busca antes lo necesario y pásalo al método [IDDD cap. 10]. El "modelo de dominio desconectado" (usar un repositorio desde dentro del agregado) es una forma de carga perezosa y es la opción menos recomendada [IDDD cap. 10].

El caso de uso construye los valores en `toCommand` y se los pasa al agregado en `handle`:

```ts
import { ValueObjects } from '@archi-code/ddd/domain';
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import { UseCase } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';

interface PaymentAuthorizationInput {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  expiresAt: string;
}

interface PaymentAuthorizationCommand {
  orderId: OrderId;
  authorization: PaymentAuthorization;
}

export class RegisterPaymentAuthorization extends UseCase<
  PaymentAuthorizationInput,
  PaymentAuthorizationCommand,
  void
> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: PaymentAuthorizationInput): PaymentAuthorizationCommand {
    return ValueObjects.build({
      orderId: () => new OrderId(input.orderId),
      authorization: () =>
        PaymentAuthorization.fromPrimitives({
          paymentId: input.paymentId,
          amount: { amount: input.amount, currency: input.currency },
          expiresAt: input.expiresAt,
        }),
    });
  }

  protected async handle(command: PaymentAuthorizationCommand): Promise<void> {
    const order = await this.orders.findById(command.orderId);
    if (order === null) {
      return;
    }
    order.registerPaymentAuthorization(command.authorization, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
```

La fecha llega como texto y se pasa tal cual (`DateType` acepta `Date | string`) para que `ExpiresAt` la convierta y rechace una fecha-hora sin zona; `new Date(input.expiresAt)` la aceptaría en la hora local del servidor y un texto inválido llegaría como `Date(Invalid)` en el mensaje de error.

El agregado recibe valores, no repositorios. Como registra un hecho (lo ejecuta un listener), el caso de uso vuelve sin error si el pedido no existe en vez de lanzar `AggregateNotFoundException`, que haría reintentar al canal sin fin.

## 5. Concurrencia optimista

* Versión en la raíz, incrementada con cada comando que cambie estado en cualquier parte del agregado [IDDD cap. 10]. Con el paquete la versión es solo del repositorio: el agregado no la declara ni la mapea y el caso de uso nunca la ve. El repositorio recuerda la versión de cada agregado que cargó o guardó en un `WeakMap<Order, number>` (`0` si no la conoce: es nuevo), escribe solo donde la versión guardada es esa, guarda `version + 1` junto a los primitivos (nunca dentro) y actualiza el `WeakMap` solo cuando la escritura ha ido bien (en SQL, tras el `COMMIT`) `[Fuera de los libros: convención de @archi-code/ddd]`.
* Si las partes internas son entidades y el ORM no detecta su cambio como cambio de la raíz, es una señal más para reducir el agregado a raíz más value objects [IDDD cap. 10].
* En almacenes de documentos o clave-valor el agregado se guarda entero y la versión se comprueba en una sola operación [IDDD cap. 10].

En SQL `[Fuera de los libros]`:

```sql
UPDATE orders
   SET status = $2, lines = $3, version = version + 1
 WHERE id = $1 AND version = $4;
```

`$4` es la versión que el repositorio recordaba (`this.versions.get(order) ?? 0`). Si la sentencia no afecta a ninguna fila, el repositorio lanza `new ConcurrencyException('Order', order.id.value, version)` (de `@archi-code/ddd/exceptions`; `ExceptionKind.Conflict`, 409 en HTTP; el nombre del agregado va como texto literal porque los minificadores renombran las clases); un agregado nuevo (versión `0`) se inserta y un id que ya existe es también un conflicto. Si escribe, hace `this.versions.set(order, version + 1)`. En los tests lo cumple el `InMemoryOrderRepository` que el proyecto escribe en `test/support/`; el repositorio real y su suite de contrato están en `ddd-repositorios-persistencia`.

Reintentar automáticamente solo es seguro si el comando es idempotente o se vuelve a evaluar contra el estado recargado: con el paquete, un bucle con límite en `handle` en el que cada intento vuelve a cargar el agregado y vuelve a guardarlo (unos pocos intentos y después se relanza); un caso de uso que ejecuta un listener no reintenta por su cuenta, lo hace la reentrega del canal `[Fuera de los libros: convención de @archi-code/ddd]`. Ejemplo en `ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`.

## 6. Variante funcional

`[Fuera de los libros como código; la idea está en Destilado cap. 5]`

El paquete no la da: `AggregateRoot` y `PrimitiveTypes` necesitan clases `[Fuera de los libros: convención de @archi-code/ddd]`. Si se elige, se escribe en el proyecto con los mismos value objects y eventos, y su persistencia queda a cargo del proyecto:

```ts
type OrderState = Readonly<{
  id: OrderId;
  status: OrderStatus;
  lines: OrderLines;
  reservation: ReservationId | null;
  authorization: PaymentAuthorization | null;
}>;

export function registerStockReservation(
  state: OrderState,
  reservation: ReservationId,
  clock: { now(): Date },
): [OrderState, OrderEvent[]] {
  if (!state.status.isPending()) {
    return [state, []];
  }
  const next = { ...state, reservation };
  if (next.authorization === null) {
    return [next, []];
  }
  const total = state.lines.total();
  return [
    { ...next, status: new OrderStatus(Status.Confirmed) },
    [
      new OrderConfirmed(
        state.id.value,
        { amount: total.amount.value, currency: total.currency.value },
        { clock },
      ),
    ],
  ];
}
```

Mismas reglas: un estado, un límite de consistencia, eventos como salida.

## 7. Tests

Los agregados deben ser unidades fáciles de probar; uno complejo es difícil de verificar [Destilado cap. 5]. Los tests unitarios del agregado van **después** de los tests de aceptación de los escenarios y comprueban que hace bien lo que debe [Destilado cap. 5].

Fábricas de datos en `test/support/` del proyecto, con un reloj fijo:

```ts
import { FixedClock } from '@archi-code/ddd/infrastructure';

export const clock = new FixedClock('2026-03-01T09:30:00Z');

export function aPendingOrderOf(cents: number): Order {
  return Order.place(
    OrderId.generate(),
    CustomerId.generate(),
    OrderLines.fromPrimitives({
      items: [{ sku: 'MUG-350', quantity: 1, unitPrice: { amount: cents, currency: 'EUR' } }],
    }),
    ShippingAddress.fromPrimitives({ street: 'Calle Mayor 1', city: 'Huelva', country: 'ES' }),
    clock,
  );
}

export function anAuthorizationOf(cents: number): PaymentAuthorization {
  return PaymentAuthorization.fromPrimitives({
    paymentId: '0b8e4f2a-6c1d-4e7f-9a3b-5d2c8e1f4a6b',
    amount: { amount: cents, currency: 'EUR' },
    expiresAt: new Date('2026-03-08T09:30:00Z'),
  });
}

export function aReservation(): ReservationId {
  return new ReservationId('7c3d9e1f-2a4b-4c6d-8e0f-1a2b3c4d5e6f');
}

export function aConfirmedOrder(): Order {
  const order = aPendingOrderOf(1700);
  order.registerStockReservation(aReservation(), clock);
  order.registerPaymentAuthorization(anAuthorizationOf(1700), clock);
  order.pullDomainEvents();
  return order;
}
```

```ts
import { describe, expect, it } from 'vitest';

describe('Order', () => {
  it('is confirmed when the reservation and the authorization arrive, in any order', () => {
    const order = aPendingOrderOf(1700);
    order.registerPaymentAuthorization(anAuthorizationOf(1700), clock);
    expect(order.isConfirmed()).toBe(false);
    order.registerStockReservation(aReservation(), clock);
    expect(order.isConfirmed()).toBe(true);
    expect(order.pullDomainEvents().map((event) => event.eventName)).toContain('OrderConfirmed');
  });

  it('records an insufficient authorization without throwing and without confirming', () => {
    const order = aPendingOrderOf(1700);
    order.registerStockReservation(aReservation(), clock);
    order.registerPaymentAuthorization(anAuthorizationOf(1000), clock);
    expect(order.isConfirmed()).toBe(false);
    expect(order.pullDomainEvents().map((event) => event.eventName)).toContain(
      'PaymentAuthorizationInsufficient',
    );
  });

  it('ignores a repeated reservation (duplicated message)', () => {
    const order = aConfirmedOrder();
    order.registerStockReservation(aReservation(), clock);
    expect(order.pullDomainEvents()).toHaveLength(0);
  });

  it('accepts no new lines once confirmed', () => {
    const line = OrderLine.fromPrimitives({
      sku: 'PLATE-27',
      quantity: 3,
      unitPrice: { amount: 900, currency: 'EUR' },
    });
    expect(() => aConfirmedOrder().addLine(line, clock)).toThrow(OrderNoLongerEditable);
  });

  it('keeps every field when stored and loaded', () => {
    const order = aConfirmedOrder();
    expect(Order.fromPrimitives(order.toPrimitives()).toPrimitives()).toEqual(order.toPrimitives());
  });
});
```

El último test es el de ida y vuelta que exige el paquete para cada agregado `[Fuera de los libros: convención de @archi-code/ddd]`.
