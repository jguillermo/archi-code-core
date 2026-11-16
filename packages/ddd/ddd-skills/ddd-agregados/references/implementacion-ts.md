# Implementar agregados en TypeScript

## La base

`AggregateRoot<Id>` de `@archi-code/ddd/domain` da lo que IDDD cap. 10 pide a la raíz salvo la versión `[Fuera de los libros: convención de @archi-code/ddd]`:
* `readonly id` y `equals` (clase e id); id vacío → `RequiredValueException`.
* `protected record(event)`: guarda el evento tal cual (campos `readonly`, los hechos no cambian [IDDD cap. 8]).
* `pullDomainEvents()`: devuelve `EventBase[]` en orden y vacía la lista.

El agregado no declara ni mapea la versión: la recuerda cada repositorio en un `WeakMap` (también el de memoria) y la actualiza solo tras escribir con éxito.

IDDD publica desde el agregado con un publicador estático [IDDD cap. 8]; registrar y publicar desde la aplicación evita un singleton en el dominio y, con outbox, entregar cambios no guardados [PHP: Domain Events]. Aquí, `save` y luego `events.publish(order.pullDomainEvents())`; si no puede perderse, el repositorio escribe agregado y eventos en la misma escritura `[Fuera de los libros: convención de @archi-code/ddd]`.

Orden de construcción [Destilado cap. 5]: raíz → identidad global como value object (en multi-tenant, también el `TenantId`) → atributos para encontrarlo → getters solo si hacen falta, sin setters → comportamiento con nombres del lenguaje. Orden de la clase `[Fuera de los libros: convención de @archi-code/ddd]`: constantes → campos (`createdAt`, `_updatedAt` al final) → constructor → `create` → `fromPrimitives` → getters → consultas → métodos de negocio → `toPrimitives` → privados.

## Order

Value objects, cada uno en su fichero: `OrderId`/`CustomerId` (`IdType`), `ReservationReference` (`UuidType` opcional: `null` sin reserva; referencia otro contexto con un tipo propio `[Fuera de los libros: convención de @archi-code/ddd]`), `PaymentReference` (`Required(UuidType)`), `CancellationReason` (`Required(StringType)`), `ExpiresAt` (`Required(DateType)`), `ShippingAddress` (`Composite` de `Street`, `City`, `Country`) y `PaymentAuthorization` (`Composite` de `paymentId`, `amount: Money`, `expiresAt`, con `covers(total)`). `Money`, `Quantity`, `OrderLine`, `OrderLines` y `OrderStatusType` están en `ddd-skills/ddd-value-objects-entidades/references/value-objects-ts.md`.

Eventos en `domain/event/` como en `ddd-skills/ddd-eventos-dominio/GUIA.md` (`EventBase`, `static readonly eventName`, campos primitivos `readonly` y constructor `{ …campos } & EventMetadata`) y errores en `domain/exception/` (`extends DomainException`, sin sufijo `Exception`) `[Fuera de los libros: convención de @archi-code/ddd]`: `OrderCreatedDomainEvent` (`'order.created'`), `OrderLineAddedDomainEvent` (`'order.line_added'`), `OrderConfirmedDomainEvent` (`'order.confirmed'`), `OrderCancelledDomainEvent` (`'order.cancelled'`), `OrderPaymentAuthorizationRejectedDomainEvent` (`'order.payment_authorization_rejected'`), `OrderNotModifiable` (`SAL001`), `OrderNotCancellable` (`SAL002`) y `NotTheCustomerOfOrder` (`SAL021`). Campos de evento primitivos tipados en línea, sin interfaces ni tipos propios.

`domain/aggregate/Order.ts`:

```ts
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

  static create(id: OrderId, customerId: CustomerId, lines: OrderLines, shippingAddress: ShippingAddress): Order {
    const order = new Order(
      id, customerId, lines, shippingAddress, new OrderStatusType(OrderStatus.PENDING),
      new ReservationReference(null), null, CreatedAt.now(), UpdatedAt.now(),
    );
    order.record(
      new OrderCreatedDomainEvent({
        orderId: order.id.value,
        customerId: customerId.value,
        lines: lines.toPrimitives().items,
        total: order.total().toPrimitives(),
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
      primitives.paymentAuthorization === null ? null : PaymentAuthorization.fromPrimitives(primitives.paymentAuthorization),
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

  addLine(line: OrderLine): void {
    if (!this.isIn(OrderStatus.PENDING)) {
      throw new OrderNotModifiable(this.id.value, this._status.value);
    }
    this._lines = this._lines.withLine(line);
    this.touch();
    this.record(
      new OrderLineAddedDomainEvent({
        orderId: this.id.value,
        sku: line.sku.value,
        quantity: line.quantity.value,
        total: this.total().toPrimitives(),
      }),
    );
  }

  cancel(requester: CustomerId, reason: CancellationReason): void {
    if (!this.customerId.equals(requester)) {
      throw new NotTheCustomerOfOrder(this.id.value);
    }
    if (this.isIn(OrderStatus.CANCELLED)) {
      throw new OrderNotCancellable(this.id.value, this._status.value);
    }
    this.moveTo(OrderStatus.CANCELLED);
    this.record(
      new OrderCancelledDomainEvent({
        orderId: this.id.value,
        reason: reason.value,
        reservationId: this._stockReservation.value,
        paymentId: this._paymentAuthorization?.paymentId.value ?? null,
      }),
    );
  }

  registerStockReservation(reservation: ReservationReference): void {
    if (!this.isIn(OrderStatus.PENDING)) {
      return;
    }
    this._stockReservation = reservation;
    this.touch();
    this.tryToConfirm();
  }

  registerPaymentAuthorization(authorization: PaymentAuthorization): void {
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
        }),
      );
      return;
    }
    this._paymentAuthorization = authorization;
    this.touch();
    this.tryToConfirm();
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

  private tryToConfirm(): void {
    if (this._stockReservation.value !== null && this._paymentAuthorization !== null) {
      this.moveTo(OrderStatus.CONFIRMED);
      this.record(new OrderConfirmedDomainEvent({ orderId: this.id.value, total: this.total().toPrimitives() }));
    }
  }

  private moveTo(status: OrderStatus): void {
    this._status = new OrderStatusType(status);
    this.touch();
  }

  private touch(): void {
    this._updatedAt = UpdatedAt.now();
  }
}
```

* Protege: total = suma de líneas, confirmado solo con reserva y autorización suficiente, líneas solo en pendiente. No contiene el stock ni la pasarela: llegan por identidad o como valor mínimo.
* El constructor solo asigna (sin comprobaciones, eventos ni valores por defecto); `create` recibe el id del caso de uso y nunca lo genera ni lo calcula. "Solo el comprador cancela" depende del estado, así que es `cancel(requester, reason)`, no un servicio.
* El repositorio, cuyo constructor recibe solo su tecnología, llama a `toPrimitives()`/`fromPrimitives()` sin mapper; quien añade un campo lo añade a ambos y el test de ida y vuelta lo prueba `[Fuera de los libros: convención de @archi-code/ddd]`.

### Comandos frente a hechos

Un comando se puede rechazar; un hecho no [Destilado cap. 6]. Si un método de reacción lanzara, el mensaje se reintentaría sin fin [IDDD cap. 10]. Por eso:
* `register…` son idempotentes, no lanzan errores de negocio y vuelven sin cambios si no aplican.
* Si el hecho no encaja, registran un evento de negocio (`OrderPaymentAuthorizationRejectedDomainEvent`) y otra reacción compensa.
* Los errores de negocio quedan para lo que pide un usuario (`cancel`, `addLine`): `ExceptionKind.Invalid`, 422, y el punto de entrada puede dar otro estado a su código.

## Dependencias de otros agregados

Busca antes y pasa valores; el repositorio dentro del agregado es la opción menos recomendada [IDDD cap. 10]. La autorización llega de Pagos; Ventas declara su copia `PaymentAuthorizedDomainEvent` (`'payment.authorized'`: `paymentId`, `orderId`, `amount`, `expiresAt`) junto a la reacción `[Fuera de los libros: convención de @archi-code/ddd]`:

```ts
// application/register-payment-authorization/register-payment-authorization-on-payment-authorized.ts
@ListensTo(PaymentAuthorizedDomainEvent, { consumer: 'sales.register-payment-authorization-on-payment-authorized' })
export class RegisterPaymentAuthorizationOnPaymentAuthorized extends EventListener<PaymentAuthorizedDomainEvent> {
  constructor(private readonly orders: OrderRepository, private readonly events: EventBus) {
    super();
  }

  async handle(event: PaymentAuthorizedDomainEvent): Promise<void> {
    const { orderId, authorization } = ValueObjectBuilder.build({
      orderId: () => new OrderId(event.orderId),
      authorization: () =>
        PaymentAuthorization.fromPrimitives({ paymentId: event.paymentId, amount: event.amount, expiresAt: event.expiresAt }),
    });
    const order = await this.orders.findById(orderId);
    if (order === null) {
      return;
    }
    order.registerPaymentAuthorization(authorization);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
```

* La fecha se pasa como texto para que `ExpiresAt` rechace una fecha-hora sin zona.
* Vuelve si falta el pedido (no `AggregateNotFoundException`), sin autorización ni `catch`; si algo falla, el bus lo registra y la reentrega del canal reintenta.

## Concurrencia optimista

* Versión incrementada con cada comando que cambie el agregado [IDDD cap. 10]. Aquí `[Fuera de los libros: convención de @archi-code/ddd]`: el repositorio recuerda la versión de cada objeto (`0` si es nuevo), escribe solo si coincide (`UPDATE … WHERE id = $1 AND version = $4`), guarda `version + 1` junto a los primitivos y actualiza el `WeakMap` solo tras escribir (en SQL, tras `COMMIT`); si no afecta a ninguna fila, o el id ya existe para uno nuevo, lanza `new ConcurrencyException('Order', id, version)` (`Conflict`, 409; nombre literal porque los minificadores renombran clases).
* Partes internas como entidades que el ORM no detecta: otra razón para raíz + valores [IDDD cap. 10]. En documentos, versión comprobada en una sola operación [IDDD cap. 10].

Reintentar solo si el comando es idempotente o se reevalúa sobre el estado recargado: bucle con límite en `handle` que recarga y guarda en cada intento (unos pocos, luego relanza); una reacción no reintenta, lo hace el canal `[Fuera de los libros: convención de @archi-code/ddd]`. Ejemplo en `ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`.

## Variante funcional

`[Fuera de los libros como código; la idea está en Destilado cap. 5]` El paquete no la da; con los mismos value objects y eventos, funciones `(estado, …) => [estado, EventBase[]]`, con un estado, un límite de consistencia y eventos como salida; su persistencia es del proyecto (`AggregateRoot` y `PrimitiveTypes` necesitan clases).

## Tests

Unitarios después de los de aceptación [Destilado cap. 5]. Fábricas en `test/support/`; fechas conocidas explícitas y de las de `now()` solo que sean válidas `[Fuera de los libros: convención de @archi-code/ddd]`:

```ts
export function aPendingOrderOf(cents: number): Order {
  return Order.create(
    OrderId.generate(),
    CustomerId.generate(),
    OrderLines.fromPrimitives({ items: [{ sku: 'MUG-350', quantity: 1, unitPrice: { amount: cents, currency: 'EUR' } }] }),
    ShippingAddress.fromPrimitives({ street: 'Calle Mayor 1', city: 'Huelva', country: 'ES' }),
  );
}

it('keeps every field when stored and loaded', () => {
  const order = aPendingOrderOf(1700);
  expect(Order.fromPrimitives(order.toPrimitives()).toPrimitives()).toEqual(order.toPrimitives());
});
```

`aReservation()` y `anAuthorizationOf(cents)` son fábricas del mismo estilo. Cubre también: autorización insuficiente sin lanzar ni confirmar, confirmación en cualquier orden, mensaje duplicado sin eventos, `OrderNotModifiable` tras confirmar. El de ida y vuelta es obligatorio en cada agregado `[Fuera de los libros: convención de @archi-code/ddd]`.
