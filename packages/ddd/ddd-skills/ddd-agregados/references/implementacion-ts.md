# Implementar agregados en TypeScript

Contenido: 1. Raíz base · 2. Construcción paso a paso · 3. Agregado completo · 4. Dependencias de otros agregados · 5. Concurrencia optimista · 6. Variante funcional · 7. Tests

## 1. Raíz base

`[Fuera de los libros: implementación propia de lo que IDDD cap. 10 describe]`

```ts
export abstract class AggregateRoot<Id extends ValueObject<any>> extends Entity<Id> {
  private pending: DomainEvent[] = [];
  protected constructor(id: Id, private _version: number) {
    super(id);
  }

  protected record(event: DomainEvent): void {
    this.pending.push(event);
  }

  /** Lo llama la capa de aplicación (o el repositorio) tras guardar; con el paquete, solo el caso de uso. */
  pullEvents(): DomainEvent[] {
    const events = this.pending;
    this.pending = [];
    return events;
  }

  get version(): number { return this._version; }

  /** Solo para repositorios: el estado se ha guardado con éxito y la versión persistida ha avanzado. */
  markPersisted(): void {
    this._version += 1;
  }
}
```

Sin `markPersisted`, el objeto en memoria conserva la versión antigua tras guardar y un segundo `save` del mismo objeto (por ejemplo, dos comandos seguidos en el mismo proceso) daría un falso conflicto de concurrencia `[Fuera de los libros]`.

Por qué registrar en vez de publicar: IDDD publica desde el agregado con un publicador estático [IDDD cap. 8]. Registrar y dejar que la aplicación los guarde en la misma transacción (outbox) y se entreguen tras confirmar evita publicar eventos de cambios que luego se revierten (con el paquete, `events.publish(...)` dentro de `transactions.run`; nunca después `[Fuera de los libros: convención de @archi-code/ddd]`), y no requiere un singleton global en el dominio. *DDD in PHP* discute ambas variantes [PHP: Domain Events].

## 2. Construcción paso a paso

Orden que sigue Destilado para construir la raíz [Destilado cap. 5]:

1. Clase de la raíz.
2. Identidad global única como value object (en multi-tenant, también el `TenantId`).
3. Atributos intrínsecos necesarios para encontrarlo (nombre, descripción).
4. Getters solo si hacen falta; **sin setters públicos**. Con el paquete, cada campo que se guarda tiene un getter público `[Fuera de los libros: convención de @archi-code/ddd]`.
5. Comportamiento complejo con nombres del lenguaje (`planBacklogItem`, `scheduleRelease`).

## 3. Agregado completo: Order

```ts
export class Order extends AggregateRoot<OrderId> {
  private constructor(
    id: OrderId,
    version: number,
    private readonly customerId: CustomerId,           // referencia por identidad (regla 3)
    private lines: OrderLines,                          // value object (parte reemplazable)
    private shippingAddress: ShippingAddress,
    private status: OrderStatus,
    private stockReservation: ReservationId | null,     // identidad de otro agregado, otro contexto
    private paymentAuthorization: PaymentAuthorization | null, // value object con lo mínimo
  ) {
    super(id, version);
  }

  static place(id: OrderId, customerId: CustomerId, lines: OrderLine[], address: ShippingAddress): Order {
    const order = new Order(id, 0, customerId, OrderLines.of(lines), address, OrderStatus.Pending, null, null);
    order.record(new OrderPlaced(id, customerId, order.lines.toSnapshot(), order.total()));
    return order;
  }

  static reconstitute(s: OrderSnapshot): Order {
    return new Order(s.id, s.version, s.customerId, s.lines, s.shippingAddress, s.status, s.stockReservation, s.paymentAuthorization);
  }

  registerStockReservation(reservation: ReservationId): void {
    if (!this.status.equals(OrderStatus.Pending)) return;     // llegó tarde o repetido: idempotente
    this.stockReservation = reservation;
    this.tryToConfirm();
  }

  registerPaymentAuthorization(authorization: PaymentAuthorization): void {
    if (!this.status.equals(OrderStatus.Pending)) return;
    if (!authorization.covers(this.total())) {
      // Un hecho de otro contexto no se rechaza: se registra su consecuencia de negocio.
      this.record(new PaymentAuthorizationInsufficient(this.id, authorization.paymentId, authorization.amount, this.total()));
      return;
    }
    this.paymentAuthorization = authorization;
    this.tryToConfirm();
  }

  cancel(reason: CancellationReason): void {
    if (!this.status.canBeCancelled()) throw new OrderCannotBeCancelled(this.id, this.status);
    this.status = OrderStatus.Cancelled;
    this.record(new OrderCancelled(this.id, reason, this.stockReservation, this.paymentAuthorization?.paymentId ?? null));
  }

  changeQuantity(sku: Sku, quantity: Quantity): void {
    if (!this.status.allowsLineChanges()) throw new OrderNoLongerEditable(this.id);
    this.lines = this.lines.withQuantity(sku, quantity);
    this.record(new OrderLinesChanged(this.id, this.lines.toSnapshot(), this.total()));
  }

  total(): Money { return this.lines.total(); }
  isConfirmed(): boolean { return this.status.equals(OrderStatus.Confirmed); }

  private tryToConfirm(): void {
    if (this.stockReservation && this.paymentAuthorization) {
      this.status = OrderStatus.Confirmed;
      this.record(new OrderConfirmed(this.id, this.total()));
    }
  }
}
```

### Comandos frente a hechos

`registerStockReservation` y `registerPaymentAuthorization` no son peticiones que el agregado pueda denegar: los invoca una política cuando **ya ha ocurrido** algo en otro contexto. Un comando se puede rechazar; un evento es un hecho y no se puede negar [Destilado cap. 6]. Si estos métodos lanzaran una excepción de negocio, el mensaje fallaría, la mensajería lo reenviaría y se reintentaría sin fin [IDDD cap. 10 describe el reintento hasta un límite]. Por eso:

* Los métodos que reaccionan a hechos son **idempotentes** y **no lanzan errores de negocio**.
* Si el hecho no encaja con las reglas, el agregado registra un evento con nombre del negocio (`PaymentAuthorizationInsufficient`) y otra política decide la compensación (anular la autorización, avisar al cliente). Así el problema queda visible en el modelo en vez de perdido en una cola de errores.
* Los errores de negocio con excepción quedan para comandos de usuario (`cancel`, `changeQuantity`), donde alguien puede recibir la respuesta.

Qué protege este agregado (sus invariantes, regla 1):
* El total es siempre la suma de sus líneas (las líneas son un value object con su regla).
* Un pedido confirmado tiene reserva y autorización que cubre el total.
* Las líneas solo cambian en estado pendiente.

Qué **no** protege (y por eso no contiene): el stock del almacén ni el estado de la pasarela. Son otros agregados en otros contextos; llegan por identidad o como value object mínimo.

## 4. Dependencias de otros agregados

No inyectes repositorios ni servicios en el agregado. Busca antes lo necesario y pásalo al método [IDDD cap. 10]. El "modelo de dominio desconectado" (usar un repositorio desde dentro del agregado) es una forma de carga perezosa y es la opción menos recomendada [IDDD cap. 10].

```ts
// Servicio de aplicación
const order = await this.orders.byId(orderId);
const authorization = PaymentAuthorization.of(event.paymentId, Money.of(event.amount, event.currency), new Date(event.expiresAt));
order.registerPaymentAuthorization(authorization);   // el agregado recibe valores, no repositorios
await this.orders.save(order);
```

## 5. Concurrencia optimista

* Versión en la raíz, incrementada con cada comando que cambie estado en cualquier parte del agregado [IDDD cap. 10].
* Si las partes internas son entidades y el ORM no detecta su cambio como cambio de la raíz, es una señal más para reducir el agregado a raíz más value objects [IDDD cap. 10].
* En almacenes de documentos o clave-valor el agregado se guarda entero y la versión se comprueba en una sola operación [IDDD cap. 10].

En SQL `[Fuera de los libros]`:

```sql
UPDATE orders
   SET status = $2, lines = $3, version = version + 1
 WHERE id = $1 AND version = $4;
-- 0 filas afectadas → ConcurrencyConflict: recargar y reintentar el comando, o informar al usuario.
```

Reintentar automáticamente solo es seguro si el comando es idempotente o se vuelve a evaluar contra el estado recargado.

## 6. Variante funcional

`[Fuera de los libros como código; la idea está en Destilado cap. 5]`

```ts
type OrderState = Readonly<{ id: OrderId; status: OrderStatus; lines: OrderLines; reservation: ReservationId | null; authorization: PaymentAuthorization | null }>;

export function registerStockReservation(s: OrderState, r: ReservationId): [OrderState, DomainEvent[]] {
  if (!s.status.equals(OrderStatus.Pending)) return [s, []];
  const next = { ...s, reservation: r };
  return next.authorization
    ? [{ ...next, status: OrderStatus.Confirmed }, [new OrderConfirmed(s.id, s.lines.total())]]
    : [next, []];
}
```

Mismas reglas: un estado, un límite de consistencia, eventos como salida.

## 7. Tests

Los agregados deben ser unidades fáciles de probar; uno complejo es difícil de verificar [Destilado cap. 5]. Los tests unitarios del agregado van **después** de los tests de aceptación de los escenarios y comprueban que hace bien lo que debe [Destilado cap. 5].

```ts
describe('Order', () => {
  it('se confirma cuando llegan reserva y autorización, en cualquier orden', () => {
    const order = aPendingOrderOf('17.00');
    order.registerPaymentAuthorization(anAuthorizationOf('17.00'));
    expect(order.isConfirmed()).toBe(false);
    order.registerStockReservation(aReservation());
    expect(order.isConfirmed()).toBe(true);
    expect(order.pullEvents().map((e) => e.type)).toContain('OrderConfirmed');
  });

  it('registra una autorización insuficiente sin lanzar error y sin confirmar', () => {
    const order = aPendingOrderOf('17.00');
    order.registerStockReservation(aReservation());
    order.registerPaymentAuthorization(anAuthorizationOf('10.00'));
    expect(order.isConfirmed()).toBe(false);
    expect(order.pullEvents().map((e) => e.type)).toContain('PaymentAuthorizationInsufficient');
  });

  it('ignora una reserva repetida (mensaje duplicado)', () => {
    const order = aConfirmedOrder();
    order.registerStockReservation(aReservation());
    expect(order.pullEvents()).toHaveLength(0);
  });

  it('no admite cambios de cantidad una vez confirmado', () => {
    expect(() => aConfirmedOrder().changeQuantity(Sku.of('TAZA-350'), Quantity.of(3))).toThrow(OrderNoLongerEditable);
  });
});
```
