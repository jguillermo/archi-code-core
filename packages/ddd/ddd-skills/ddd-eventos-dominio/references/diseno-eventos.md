# Diseñar eventos de dominio

## Nombre

* Pasado, con el lenguaje del contexto de origen [Destilado cap. 6; IDDD cap. 8].
* Normalmente derivado del comando que lo causa: `PlaceOrder` → `OrderPlaced`, `AddOrderLine` → `OrderLineAdded` [Destilado cap. 6].
* Tan compacto como permita el lenguaje. IDDD prefiere `BacklogItemCommitted` a `BacklogItemCommittedToSprint` porque en Scrum un elemento solo se compromete en un sprint; si el equipo prefiere el nombre largo en algún caso, vale [IDDD cap. 8].
* La combinación del nombre y sus propiedades cuenta por completo lo que pasó en el modelo [Destilado cap. 6].
* Con el paquete, la clase se llama `<Agregado><AcciónEnPasado>DomainEvent` (`OrderLineAddedDomainEvent`, la de creación `<Agregado>CreatedDomainEvent`) y su `static readonly eventName` es `'<agregado>.<acción_en_pasado>'` en snake_case (`'order.line_added'`), único en el sistema; el nombre `sales.order.OrderPlaced` queda para el contrato publicado fuera del sistema [IDDD cap. 13] `[Fuera de los libros: convención de @archi-code/ddd]`. Las tablas de abajo usan el nombre corto del hecho, que es lo que decide el diseño.

| Mal | Bien | Por qué |
|---|---|---|
| `OrderUpdated` | `OrderLineAdded`, `ShippingAddressChanged` | Dice qué cambió |
| `PlaceOrder` | `OrderPlaced` | Es un hecho, no una orden |
| `OrderStatusChangedToConfirmed` | `OrderConfirmed` | El lenguaje ya tiene la palabra |
| `PaymentWebhookReceived` | `PaymentAuthorized` | Lenguaje del dominio, no del transporte |
| `TimerElapsed` | `PaymentAuthorizationExpired` | El paso del tiempo con nombre de negocio [Destilado cap. 6] |

## Datos

Pregunta guía: ¿qué estimuló la publicación del evento? Normalmente un comando, y el evento debería llevar las propiedades que llevaba ese comando [Destilado cap. 6]. IDDD añade [IDDD cap. 8]:

* Marca de tiempo de cuándo ocurrió (`occurredOn`, que pone `EventBase`).
* Lo necesario para "volver a disparar" el evento: identidad del agregado (un campo del payload que declara el evento, como `orderId`; `EventBase` no la pone) y de los agregados implicados.
* Parámetros del comando si se demuestran útiles.
* Valores del estado resultante que ayuden a los suscriptores.
* En entornos multi-tenant, siempre el `tenantId`, aunque no viniera en el comando.

Ejemplo de IDDD: `BacklogItemCommitted` lleva `tenantId`, `backlogItemId` y `sprintId`. El `sprintId` es imprescindible porque el requisito dice que el sprint debe enterarse [IDDD cap. 8].

Lista de comprobación `[Fuera de los libros]`:
* ¿Un consumidor puede decidir qué hacer sin consultar al origen? Si no, ¿es aceptable que consulte (query-back)?
* ¿Hay datos personales? ¿Los necesita cada consumidor?
* ¿Los importes llevan moneda? ¿Las fechas, zona horaria?
* ¿Algún valor cambia a menudo y quedará obsoleto enseguida? Mejor fuera.

## Forma en TypeScript

Un evento extiende `EventBase` de `@archi-code/ddd/domain`, declara `static readonly eventName` y recibe sus datos en un único objeto, como primitivos sacados de los value objects (el dinero como `{ amount, currency }` en céntimos, las fechas como texto ISO), nunca value objects ni el `toPrimitives()` del agregado. Los tipos van en línea: el fichero del evento no declara interfaces ni importa tipos de datos `[Fuera de los libros: convención de @archi-code/ddd]`. En `domain/event/OrderConfirmedDomainEvent.ts`:

```ts
import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

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
```

Va en su propio fichero de `domain/event/`, sin unión de eventos que actualizar. El agregado lo registra en el método que causa el hecho, pasando el reloj que recibió para que `occurredOn` sea determinista en los tests. En el `Order` de `ddd-skills/ddd-agregados/references/implementacion-ts.md` el pedido se confirma solo cuando ya tiene reserva y autorización, desde `registerStockReservation` o `registerPaymentAuthorization`:

```ts
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
```

`EventBase` pone `eventName`, `eventId` (UUID v4) y `occurredOn` (texto ISO en UTC, del `clock` o de la hora del sistema), y `record()` guarda el evento tal cual: sus campos son `readonly` y el constructor está completo [IDDD cap. 8]. No generes tú el id ni la fecha de un evento nuevo; pasa `eventId` y `occurredOn` solo al reconstruir uno que entregó un canal. El evento ya es la forma que viaja:

```ts
const [confirmed] = order.pullDomainEvents();
({ ...confirmed });
// { eventName: 'order.confirmed', eventId: '…', occurredOn: '2026-03-01T09:30:00.000Z',
//   orderId: '9b2f6c1e-…', total: { amount: 7000, currency: 'EUR' } }
```

## Identidad del evento

* Dentro del contexto rara vez hace falta comparar eventos; el tipo, las identidades implicadas y la fecha suelen bastar, como en un value object [IDDD cap. 8].
* Fuera, con mensajería que puede reenviar, una identidad única permite deduplicar. Algunos buses la ponen en la cabecera; si no, la asigna el publicador [IDDD cap. 8]. Con el paquete es el `eventId` que pone `EventBase`: viaja en el JSON, `EventRegistry` lo conserva al reconstruir el evento (la fábrica pasa `eventId: json.eventId` y `occurredOn: json.occurredOn`) y el adaptador del broker lo usa como `messageId`.

## Eventos con características de agregado

A veces un evento no resulta de un comando sobre un agregado sino que un usuario lo origina directamente. Entonces puede modelarse como agregado inmutable en su propio repositorio, que no permite borrarlo, con identidad generada [IDDD cap. 8]. Ejemplo: una `IncidenciaDeEntregaReportada` por el transportista que se archiva y se consulta. Con el paquete sería un `AggregateRoot` cuyo repositorio abstracto declara solo `findById` y `save` (nunca `remove`, ni implementa `AggregateRemover`), con id `XId.generate()`.

## Versionado

* Los eventos publicados llevan versión. Diseñados con cuidado, muchos consumidores pueden leer cualquier versión como si fuera la 1 [IDDD cap. 13].
* Cambios compatibles `[Fuera de los libros]`: añadir campos opcionales. Incompatibles: renombrar, quitar o cambiar el significado → nueva versión o nuevo evento, publicando ambas durante la transición.
* Con el paquete, los eventos no llevan número de versión `[Fuera de los libros: convención de @archi-code/ddd]`. Un cambio incompatible de la forma interna se publica como un evento nuevo con otro `eventName` (`'order.cancelled_with_refund'`), o la fábrica del `EventRegistry`, que recibe cada evento guardado tal como se escribió, reconoce la forma antigua por sus campos:

```ts
import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';
import { EventRegistry } from '@archi-code/ddd/infrastructure';

export class OrderCancelledDomainEvent extends EventBase {
  static readonly eventName = 'order.cancelled';

  readonly orderId: string;
  readonly reason: string;
  readonly refund: { amount: number; currency: string };

  constructor({
    orderId,
    reason,
    refund,
    eventId,
    occurredOn,
    clock,
  }: {
    orderId: string;
    reason: string;
    refund: { amount: number; currency: string };
  } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.orderId = orderId;
    this.reason = reason;
    this.refund = refund;
  }
}

export const cancellations = new EventRegistry().register(
  OrderCancelledDomainEvent,
  (json) =>
    new OrderCancelledDomainEvent({
      orderId: json.orderId as string,
      reason: json.reason as string,
      refund:
        typeof json.refundCents === 'number'
          ? { amount: json.refundCents, currency: 'EUR' }
          : (json.refund as { amount: number; currency: string }),
      eventId: json.eventId,
      occurredOn: json.occurredOn,
    }),
);
```

La versión del contrato publicado a otros contextos es otra cosa: la decide el adaptador del broker, que puede seguir emitiendo la v1 del contrato aunque cambie la forma del evento interno (ver `ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`).
