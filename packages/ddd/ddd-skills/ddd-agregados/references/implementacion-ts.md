# Implementar agregados en TypeScript

Contenido: 1. Raíz base · 2. Construcción paso a paso · 3. Agregado completo · 4. Dependencias de otros agregados · 5. Concurrencia optimista · 6. Variante funcional · 7. Tests

## 1. Raíz base

La raíz no se escribe a mano: se extiende `AggregateRoot<Id>` de `@archi-code/ddd/domain` (solo el tipo del id; los eventos son `EventBase`, sin unión por agregado), que ya trae lo que IDDD cap. 10 describe para la raíz salvo la versión (identidad, igualdad por identidad y lista de eventos registrados); la versión para la concurrencia optimista la guarda el repositorio, no el agregado (sección 5) `[Fuera de los libros: convención de @archi-code/ddd]`.

```ts
import { AggregateRoot, CreatedAt, UpdatedAt } from '@archi-code/ddd/domain';

interface Clock {
  now(): Date;
}

export class Order extends AggregateRoot<OrderId> {
  readonly customerId: CustomerId;
  readonly createdAt: CreatedAt;
  private _updatedAt: UpdatedAt;

  constructor(id: OrderId, customerId: CustomerId, createdAt: CreatedAt, updatedAt: UpdatedAt) {
    super(id);
    this.customerId = customerId;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }
}
```

La clase completa está en la sección 3. Lo que da la base:

* `readonly id` y `equals(other)` (misma clase y mismo id) de `Entity<Id>`; un id sin valor lanza `RequiredValueException`.
* `protected record(event)`: guarda el evento tal cual (los hechos no cambian [IDDD cap. 8]: sus campos son `readonly`).
* `pullDomainEvents()`: devuelve los eventos en orden (tipados como `EventBase[]`) y vacía la lista; lo llama el caso de uso tras guardar.
La base no trae versión: el agregado no la declara, no la mapea en `toPrimitives()` y el caso de uso nunca la ve. Cada repositorio recuerda la versión de cada agregado que cargó o guardó en un `WeakMap<Order, number>` propio y la actualiza solo cuando la escritura ha ido bien; así un segundo `save` del mismo objeto (por ejemplo, dos comandos seguidos en el mismo proceso) no da un falso conflicto de concurrencia `[Fuera de los libros: convención de @archi-code/ddd]`. Lo cumplen todos los repositorios, también el `InMemoryOrderRepository` en memoria (en `infrastructure/persistence/` si la aplicación corre en memoria, o en `test/support/` como doble de test).

Por qué registrar en vez de publicar: IDDD publica desde el agregado con un publicador estático [IDDD cap. 8]. Registrar y dejar que la aplicación publique no requiere un singleton global en el dominio y, con una bandeja de salida (outbox), evita entregar eventos de cambios que no llegaron a guardarse. *DDD in PHP* discute ambas variantes [PHP: Domain Events]. Con el paquete, el caso de uso llama a `await this.orders.save(order)` y después a `events.publish(order.pullDomainEvents())`; la aplicación no abre transacciones, porque la transacción es del repositorio. Si `publish` falla tras `save`, el evento puede perderse; cuando eso no es admisible, el repositorio guarda el agregado y sus eventos pendientes en la misma escritura atómica (outbox) y un proceso aparte los entrega por un `EventChannel`, y el caso de uso no cambia `[Fuera de los libros: convención de @archi-code/ddd]`.

## 2. Construcción paso a paso

Orden que sigue Destilado para construir la raíz [Destilado cap. 5]:

1. Clase de la raíz (`extends AggregateRoot<OrderId>`).
2. Identidad global única como value object (`class OrderId extends IdType<'OrderId'> {}`; en multi-tenant, también el `TenantId`).
3. Atributos intrínsecos necesarios para encontrarlo (nombre, descripción).
4. Getters solo si hacen falta; **sin setters públicos**. Con el paquete, cada campo que se guarda es `readonly` público (si no cambia) o `private _campo` con un getter público con su nombre sin `_`, porque `PrimitiveTypes` los lee para tipar `toPrimitives()`/`fromPrimitives()` (nada lo comprueba en tiempo de ejecución: lo cubre el test de ida y vuelta de cada agregado); los valores derivados son métodos (`total()`) `[Fuera de los libros: convención de @archi-code/ddd]`.
5. Comportamiento complejo con nombres del lenguaje (`planBacklogItem`, `scheduleRelease`).

Con el paquete, la clase sigue siempre el mismo orden `[Fuera de los libros: convención de @archi-code/ddd]`: la interfaz local `Clock` encima de la clase (el dominio no importa el puerto `Clock` de `/application`; este encaja por estructura) → constantes de negocio `private static readonly` → campos (`createdAt` y `_updatedAt` los últimos) → constructor público que solo asigna → `static create` → `static fromPrimitives` → getters → consultas → métodos de negocio → `toPrimitives` → ayudantes privados.

## 3. Agregado completo: Order

Value objects del pedido, cada uno en su fichero de `domain/value-object/` (su diseño detallado está en `ddd-value-objects-entidades`); `Money` y `CurrencyMismatch` viven en `shared-kernel/money/`:

```ts
import {
  AbstractType,
  Composite,
  DateType,
  IdType,
  NumberType,
  Required,
  StringType,
  TypePrimitiveException,
  UuidType,
} from '@archi-code/ddd/domain';
import { DomainException } from '@archi-code/ddd/domain';
import { Validations } from '@archi-code/validation';

export class OrderId extends IdType<'OrderId'> {}
export class CustomerId extends IdType<'CustomerId'> {}
export class ReservationReference extends UuidType {}
export class PaymentReference extends Required(UuidType) {}
export class Sku extends Required(StringType) {}
export class Street extends Required(StringType) {}
export class City extends Required(StringType) {}
export class CancellationReason extends Required(StringType) {}
export class ExpiresAt extends Required(DateType) {}

@Validations([{ validator: 'isInt', properties: { min: 1 } }])
export class Quantity extends Required(NumberType) {}

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

@Validations([{ validator: 'isISO4217' }])
export class MoneyCurrency extends Required(StringType) {
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
    super(`Cannot combine ${received} with ${expected}`, ['MNY001']);
  }
}

export class Money extends Composite({ amount: Cents, currency: MoneyCurrency }) {
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
  paymentId: PaymentReference,
  amount: Money,
  expiresAt: ExpiresAt,
}) {
  covers(total: Money): boolean {
    return this.amount.covers(total);
  }
}
```

`ReservationReference` es opcional (`UuidType`, se construye con `null` mientras no hay reserva) y `PaymentReference` obligatorio: ambos referencian agregados de otros contextos con un `UuidType` propio, nunca con la clase de id del otro contexto `[Fuera de los libros: convención de @archi-code/ddd]`.

El estado es un enum en un único fichero, `value-object/OrderStatusType.ts`, con el enum, su opción y el tipo obligatorio `[Fuera de los libros: convención de @archi-code/ddd]`:

```ts
import { EnumType, Required } from '@archi-code/ddd/domain';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export class OrderStatusOption extends EnumType<OrderStatus> {
  protected getEnum(): typeof OrderStatus {
    return OrderStatus;
  }
}

export class OrderStatusType extends Required(OrderStatusOption) {}
```

Eventos (hechos en pasado, `<Agregado><AcciónEnPasado>DomainEvent` con `eventName` `'<agregado>.<acción_en_pasado>'`, campos primitivos tipados en línea, sin interfaces ni tipos propios) y errores de negocio (lo que salió mal, sin sufijo `Exception`, con el prefijo del contexto) `[Fuera de los libros: convención de @archi-code/ddd]`; cada clase en su fichero de `domain/event/` o `domain/exception/`:

```ts
import { DomainException, EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class OrderCreatedDomainEvent extends EventBase {
  static readonly eventName = 'order.created';

  readonly orderId: string;
  readonly customerId: string;
  readonly lines: { sku: string; quantity: number; unitPrice: { amount: number; currency: string } }[];
  readonly total: { amount: number; currency: string };

  constructor({
    orderId,
    customerId,
    lines,
    total,
    eventId,
    occurredOn,
    clock,
  }: {
    orderId: string;
    customerId: string;
    lines: { sku: string; quantity: number; unitPrice: { amount: number; currency: string } }[];
    total: { amount: number; currency: string };
  } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.orderId = orderId;
    this.customerId = customerId;
    this.lines = lines;
    this.total = total;
  }
}

export class OrderLineAddedDomainEvent extends EventBase {
  static readonly eventName = 'order.line_added';

  readonly orderId: string;
  readonly sku: string;
  readonly quantity: number;
  readonly total: { amount: number; currency: string };

  constructor({
    orderId,
    sku,
    quantity,
    total,
    eventId,
    occurredOn,
    clock,
  }: {
    orderId: string;
    sku: string;
    quantity: number;
    total: { amount: number; currency: string };
  } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.orderId = orderId;
    this.sku = sku;
    this.quantity = quantity;
    this.total = total;
  }
}

export class OrderConfirmedDomainEvent extends EventBase {
  static readonly eventName = 'order.confirmed';

  readonly orderId: string;
  readonly total: { amount: number; currency: string };

  constructor({
    orderId,
    total,
    eventId,
    occurredOn,
    clock,
  }: { orderId: string; total: { amount: number; currency: string } } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.orderId = orderId;
    this.total = total;
  }
}

export class OrderCancelledDomainEvent extends EventBase {
  static readonly eventName = 'order.cancelled';

  readonly orderId: string;
  readonly reason: string;
  readonly reservationId: string | null;
  readonly paymentId: string | null;

  constructor({
    orderId,
    reason,
    reservationId,
    paymentId,
    eventId,
    occurredOn,
    clock,
  }: {
    orderId: string;
    reason: string;
    reservationId: string | null;
    paymentId: string | null;
  } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.orderId = orderId;
    this.reason = reason;
    this.reservationId = reservationId;
    this.paymentId = paymentId;
  }
}

export class OrderPaymentAuthorizationRejectedDomainEvent extends EventBase {
  static readonly eventName = 'order.payment_authorization_rejected';

  readonly orderId: string;
  readonly paymentId: string;
  readonly authorized: { amount: number; currency: string };
  readonly required: { amount: number; currency: string };

  constructor({
    orderId,
    paymentId,
    authorized,
    required,
    eventId,
    occurredOn,
    clock,
  }: {
    orderId: string;
    paymentId: string;
    authorized: { amount: number; currency: string };
    required: { amount: number; currency: string };
  } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.orderId = orderId;
    this.paymentId = paymentId;
    this.authorized = authorized;
    this.required = required;
  }
}

export class OrderNotModifiable extends DomainException {
  constructor(orderId: string, status: string) {
    super(`Order ${orderId} is ${status} and no longer accepts line changes`, ['SAL001']);
  }
}

export class OrderNotCancellable extends DomainException {
  constructor(orderId: string, status: string) {
    super(`Order ${orderId} cannot be cancelled while ${status}`, ['SAL002']);
  }
}
```

La raíz, `domain/aggregate/Order.ts`:

```ts
import { AggregateRoot, CreatedAt, UpdatedAt } from '@archi-code/ddd/domain';
import type { PrimitiveTypes } from '@archi-code/ddd/domain';

interface Clock {
  now(): Date;
}

export class Order extends AggregateRoot<OrderId> {
  readonly customerId: CustomerId;
  private _lines: OrderLines;
  readonly shippingAddress: ShippingAddress;
  private _status: OrderStatusType;
  private _stockReservation: ReservationReference;
  private _paymentAuthorization: PaymentAuthorization | null;
  readonly createdAt: CreatedAt;
  private _updatedAt: UpdatedAt;

  constructor(
    id: OrderId,
    customerId: CustomerId,
    lines: OrderLines,
    shippingAddress: ShippingAddress,
    status: OrderStatusType,
    stockReservation: ReservationReference,
    paymentAuthorization: PaymentAuthorization | null,
    createdAt: CreatedAt,
    updatedAt: UpdatedAt,
  ) {
    super(id);
    this.customerId = customerId;
    this._lines = lines;
    this.shippingAddress = shippingAddress;
    this._status = status;
    this._stockReservation = stockReservation;
    this._paymentAuthorization = paymentAuthorization;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static create(
    id: OrderId,
    customerId: CustomerId,
    lines: OrderLines,
    shippingAddress: ShippingAddress,
    clock: Clock,
  ): Order {
    const order = new Order(
      id,
      customerId,
      lines,
      shippingAddress,
      new OrderStatusType(OrderStatus.PENDING),
      new ReservationReference(null),
      null,
      CreatedAt.now(clock),
      UpdatedAt.now(clock),
    );
    order.record(
      new OrderCreatedDomainEvent({
        orderId: order.id.value,
        customerId: order.customerId.value,
        lines: order._lines.items.map((line) => ({
          sku: line.sku.value,
          quantity: line.quantity.value,
          unitPrice: line.unitPrice.toPrimitives(),
        })),
        total: order.total().toPrimitives(),
        clock,
      }),
    );
    return order;
  }

  static fromPrimitives(primitives: PrimitiveTypes<Order>): Order {
    return new Order(
      new OrderId(primitives.id),
      new CustomerId(primitives.customerId),
      OrderLines.fromPrimitives(primitives.lines),
      ShippingAddress.fromPrimitives(primitives.shippingAddress),
      new OrderStatusType(primitives.status),
      new ReservationReference(primitives.stockReservation),
      primitives.paymentAuthorization === null
        ? null
        : PaymentAuthorization.fromPrimitives(primitives.paymentAuthorization),
      new CreatedAt(primitives.createdAt),
      new UpdatedAt(primitives.updatedAt),
    );
  }

  get lines(): OrderLines {
    return this._lines;
  }

  get status(): OrderStatusType {
    return this._status;
  }

  get stockReservation(): ReservationReference {
    return this._stockReservation;
  }

  get paymentAuthorization(): PaymentAuthorization | null {
    return this._paymentAuthorization;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  total(): Money {
    return this._lines.total();
  }

  isIn(status: OrderStatus): boolean {
    return this._status.value === status;
  }

  addLine(line: OrderLine, clock: Clock): void {
    if (!this.isIn(OrderStatus.PENDING)) {
      throw new OrderNotModifiable(this.id.value, this._status.value);
    }
    this._lines = this._lines.withLine(line);
    this.touch(clock);
    this.record(
      new OrderLineAddedDomainEvent({
        orderId: this.id.value,
        sku: line.sku.value,
        quantity: line.quantity.value,
        total: this.total().toPrimitives(),
        clock,
      }),
    );
  }

  cancel(reason: CancellationReason, clock: Clock): void {
    if (this.isIn(OrderStatus.CANCELLED)) {
      throw new OrderNotCancellable(this.id.value, this._status.value);
    }
    this.moveTo(OrderStatus.CANCELLED, clock);
    this.record(
      new OrderCancelledDomainEvent({
        orderId: this.id.value,
        reason: reason.value,
        reservationId: this._stockReservation.value,
        paymentId: this._paymentAuthorization?.paymentId.value ?? null,
        clock,
      }),
    );
  }

  registerStockReservation(reservation: ReservationReference, clock: Clock): void {
    if (!this.isIn(OrderStatus.PENDING)) {
      return;
    }
    this._stockReservation = reservation;
    this.touch(clock);
    this.tryToConfirm(clock);
  }

  registerPaymentAuthorization(authorization: PaymentAuthorization, clock: Clock): void {
    if (!this.isIn(OrderStatus.PENDING)) {
      return;
    }
    if (!authorization.covers(this.total())) {
      this.record(
        new OrderPaymentAuthorizationRejectedDomainEvent({
          orderId: this.id.value,
          paymentId: authorization.paymentId.value,
          authorized: authorization.amount.toPrimitives(),
          required: this.total().toPrimitives(),
          clock,
        }),
      );
      return;
    }
    this._paymentAuthorization = authorization;
    this.touch(clock);
    this.tryToConfirm(clock);
  }

  toPrimitives(): PrimitiveTypes<Order> {
    return {
      id: this.id.value,
      customerId: this.customerId.value,
      lines: this._lines.toPrimitives(),
      shippingAddress: this.shippingAddress.toPrimitives(),
      status: this._status.value,
      stockReservation: this._stockReservation.value,
      paymentAuthorization: this._paymentAuthorization?.toPrimitives() ?? null,
      createdAt: this.createdAt.value,
      updatedAt: this._updatedAt.value,
    };
  }

  private tryToConfirm(clock: Clock): void {
    if (this._stockReservation.value !== null && this._paymentAuthorization !== null) {
      this.moveTo(OrderStatus.CONFIRMED, clock);
      this.record(
        new OrderConfirmedDomainEvent({
          orderId: this.id.value,
          total: this.total().toPrimitives(),
          clock,
        }),
      );
    }
  }

  private moveTo(status: OrderStatus, clock: Clock): void {
    this._status = new OrderStatusType(status);
    this.touch(clock);
  }

  private touch(clock: Clock): void {
    this._updatedAt = UpdatedAt.now(clock);
  }
}
```

Cómo encaja con las reglas:

* `customerId` es una referencia por identidad (regla 3); `stockReservation` es la identidad de un agregado de otro contexto, y `paymentAuthorization` un value object con lo mínimo que el pedido necesita de Pagos.
* Las líneas son un value object (`OrderLines`, parte reemplazable entera); `addLine` sustituye la colección por la que devuelve `withLine`, y la regla de SKU único la comprueba el propio value object.
* Constructor público que solo asigna (sin comprobaciones, eventos ni valores por defecto), `static create(id, …valueObjects, clock)` que fija el estado inicial, comprueba las invariantes de creación y registra `OrderCreatedDomainEvent`, y `fromPrimitives`, que reconstruye sin reglas de creación ni eventos; `toPrimitives()` devuelve solo datos planos. El id lo pasa el caso de uso (`OrderId.generate()`); `create` nunca lo genera ni lo calcula. La conversión es solo del propio agregado (instantánea): el repositorio, cuyo constructor recibe solo las dependencias de su tecnología, llama directamente a `order.toPrimitives()` al escribir y a `Order.fromPrimitives(row.primitives)` al leer (la versión de la fila la guarda en su `WeakMap`, no en el agregado), sin mapper ni comprobación de forma en medio, y no lee los campos. Quien añade un campo lo añade a `toPrimitives`/`fromPrimitives`, y el spec del agregado comprueba la ida y vuelta `[Fuera de los libros: convención de @archi-code/ddd]`. IDDD usa un constructor privado y una fábrica con nombre del negocio [IDDD cap. 11]; el paquete hace público el constructor para que `create` y `fromPrimitives` usen el mismo.
* Cada método recibe el reloj (`clock: Clock`, la interfaz local) y lo pasa a los eventos (`clock` en el objeto del constructor) y a `UpdatedAt.now(clock)`: el dominio no llama a `new Date()` y los tests son deterministas.

### Comandos frente a hechos

`registerStockReservation` y `registerPaymentAuthorization` no son peticiones que el agregado pueda denegar: los invoca un caso de uso por reacción cuando **ya ha ocurrido** algo en otro contexto. Un comando se puede rechazar; un evento es un hecho y no se puede negar [Destilado cap. 6]. Si estos métodos lanzaran una excepción de negocio, el mensaje fallaría, la mensajería lo reenviaría y se reintentaría sin fin [IDDD cap. 10 describe el reintento hasta un límite]. Por eso:

* Los métodos que reaccionan a hechos son **idempotentes**, **no lanzan errores de negocio** y, si no aplican en el estado actual, vuelven sin cambiar nada.
* Si el hecho no encaja con las reglas, el agregado registra un evento con nombre del negocio (`OrderPaymentAuthorizationRejectedDomainEvent`) y otro caso de uso por reacción decide la compensación (anular la autorización, avisar al cliente). Así el problema queda visible en el modelo en vez de perdido en una cola de errores.
* Los errores de negocio (`DomainException` con su código) quedan para los métodos que pide un usuario (`cancel`, `addLine`), donde alguien puede recibir la respuesta (`ExceptionClassifier.classify(error)` los clasifica como `ExceptionKind.Invalid`, 422 en HTTP, y el punto de entrada puede dar otro estado a su código).

Qué protege este agregado (sus invariantes, regla 1):
* El total es siempre la suma de sus líneas (las líneas son un value object con su regla).
* Un pedido confirmado tiene reserva y autorización que cubre el total.
* Las líneas solo cambian en estado pendiente.

Qué **no** protege (y por eso no contiene): el stock del almacén ni el estado de la pasarela. Son otros agregados en otros contextos; llegan por identidad o como value object mínimo.

## 4. Dependencias de otros agregados

No inyectes repositorios ni servicios en el agregado. Busca antes lo necesario y pásalo al método [IDDD cap. 10]. El "modelo de dominio desconectado" (usar un repositorio desde dentro del agregado) es una forma de carga perezosa y es la opción menos recomendada [IDDD cap. 10].

La autorización llega de Pagos como evento. Ventas declara su propia copia del evento junto al caso de uso que lo escucha, con el mismo nombre de clase y `eventName` que el productor y solo los campos que lee, en `application/register-payment-authorization/payment-authorized-domain-event.ts` `[Fuera de los libros: convención de @archi-code/ddd]`:

```ts
import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class PaymentAuthorizedDomainEvent extends EventBase {
  static readonly eventName = 'payment.authorized';

  readonly paymentId: string;
  readonly orderId: string;
  readonly amount: { amount: number; currency: string };
  readonly expiresAt: string;

  constructor({
    paymentId,
    orderId,
    amount,
    expiresAt,
    eventId,
    occurredOn,
    clock,
  }: {
    paymentId: string;
    orderId: string;
    amount: { amount: number; currency: string };
    expiresAt: string;
  } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.paymentId = paymentId;
    this.orderId = orderId;
    this.amount = amount;
    this.expiresAt = expiresAt;
  }
}
```

El caso de uso por reacción es el propio listener: una sola clase que construye los valores con `ValueObjectBuilder.build`, carga el pedido y se los pasa al agregado `[Fuera de los libros: convención de @archi-code/ddd]`. En `application/register-payment-authorization/register-payment-authorization-on-payment-authorized.ts`:

```ts
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';
import { PaymentAuthorizedDomainEvent } from './payment-authorized-domain-event';

@ListensTo(PaymentAuthorizedDomainEvent, {
  consumer: 'sales.register-payment-authorization-on-payment-authorized',
})
export class RegisterPaymentAuthorizationOnPaymentAuthorized extends EventListener<PaymentAuthorizedDomainEvent> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus,
    private readonly clock: Clock,
  ) {
    super();
  }

  async handle(event: PaymentAuthorizedDomainEvent): Promise<void> {
    const { orderId, authorization } = ValueObjectBuilder.build({
      orderId: () => new OrderId(event.orderId),
      authorization: () =>
        PaymentAuthorization.fromPrimitives({
          paymentId: event.paymentId,
          amount: event.amount,
          expiresAt: event.expiresAt,
        }),
    });
    const order = await this.orders.findById(orderId);
    if (order === null) {
      return;
    }
    order.registerPaymentAuthorization(authorization, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
```

La fecha llega como texto y se pasa tal cual (`DateType` acepta `Date | string`) para que `ExpiresAt` la convierta y rechace una fecha-hora sin zona; `new Date(event.expiresAt)` la aceptaría en la hora local del servidor y un texto inválido llegaría como `Date(Invalid)` en el mensaje de error.

El agregado recibe valores, no repositorios. Como registra un hecho, el caso de uso por reacción vuelve sin error si el pedido no existe en vez de lanzar `AggregateNotFoundException`, que haría reintentar al canal sin fin; tampoco comprueba autorización, no captura errores y no tiene un `UseCase` detrás: si algo falla, `DomainEventBus` lo registra en el log y lo relanza al canal, cuya reentrega es el reintento.

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

`$4` es la versión que el repositorio recordaba (`this.versions.get(order) ?? 0`). Si la sentencia no afecta a ninguna fila, el repositorio lanza `new ConcurrencyException('Order', order.id.value, version)` (de `@archi-code/ddd/application`; `ExceptionKind.Conflict`, 409 en HTTP; el nombre del agregado va como texto literal porque los minificadores renombran las clases); un agregado nuevo (versión `0`) se inserta y un id que ya existe es también un conflicto. Si escribe, hace `this.versions.set(order, version + 1)`. En memoria lo cumple el `InMemoryOrderRepository` (en `infrastructure/persistence/` o en `test/support/`); el repositorio real y su suite de contrato están en `ddd-repositorios-persistencia`.

Reintentar automáticamente solo es seguro si el comando es idempotente o se vuelve a evaluar contra el estado recargado: con el paquete, un bucle con límite en `handle` en el que cada intento vuelve a cargar el agregado y vuelve a guardarlo (unos pocos intentos y después se relanza); un caso de uso por reacción no reintenta por su cuenta, lo hace la reentrega del canal `[Fuera de los libros: convención de @archi-code/ddd]`. Ejemplo en `ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`.

## 6. Variante funcional

`[Fuera de los libros como código; la idea está en Destilado cap. 5]`

El paquete no la da: `AggregateRoot` y `PrimitiveTypes` necesitan clases `[Fuera de los libros: convención de @archi-code/ddd]`. Si se elige, se escribe en el proyecto con los mismos value objects y eventos, y su persistencia queda a cargo del proyecto:

```ts
type OrderState = Readonly<{
  id: OrderId;
  status: OrderStatusType;
  lines: OrderLines;
  reservation: ReservationReference;
  authorization: PaymentAuthorization | null;
}>;

export function registerStockReservation(
  state: OrderState,
  reservation: ReservationReference,
  clock: { now(): Date },
): [OrderState, EventBase[]] {
  if (state.status.value !== OrderStatus.PENDING) {
    return [state, []];
  }
  const next = { ...state, reservation };
  if (next.authorization === null) {
    return [next, []];
  }
  return [
    { ...next, status: new OrderStatusType(OrderStatus.CONFIRMED) },
    [
      new OrderConfirmedDomainEvent({
        orderId: state.id.value,
        total: state.lines.total().toPrimitives(),
        clock,
      }),
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
  return Order.create(
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

export function aReservation(): ReservationReference {
  return new ReservationReference('7c3d9e1f-2a4b-4c6d-8e0f-1a2b3c4d5e6f');
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
    expect(order.isIn(OrderStatus.CONFIRMED)).toBe(false);
    order.registerStockReservation(aReservation(), clock);
    expect(order.isIn(OrderStatus.CONFIRMED)).toBe(true);
    expect(order.pullDomainEvents().map((event) => event.eventName)).toContain('order.confirmed');
  });

  it('records an insufficient authorization without throwing and without confirming', () => {
    const order = aPendingOrderOf(1700);
    order.registerStockReservation(aReservation(), clock);
    order.registerPaymentAuthorization(anAuthorizationOf(1000), clock);
    expect(order.isIn(OrderStatus.CONFIRMED)).toBe(false);
    expect(order.pullDomainEvents().map((event) => event.eventName)).toContain(
      'order.payment_authorization_rejected',
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
    expect(() => aConfirmedOrder().addLine(line, clock)).toThrow(OrderNotModifiable);
  });

  it('keeps every field when stored and loaded', () => {
    const order = aConfirmedOrder();
    expect(Order.fromPrimitives(order.toPrimitives()).toPrimitives()).toEqual(order.toPrimitives());
  });
});
```

El último test es el de ida y vuelta que exige el paquete para cada agregado `[Fuera de los libros: convención de @archi-code/ddd]`.
