# Diseñar eventos de dominio

## Nombre

* Pasado, con el lenguaje del contexto de origen [Destilado cap. 6; IDDD cap. 8].
* Normalmente derivado del comando que lo causa: `PlaceOrder` → `OrderPlaced`, `AddOrderLine` → `OrderLineAdded` [Destilado cap. 6].
* Tan compacto como permita el lenguaje. IDDD prefiere `BacklogItemCommitted` a `BacklogItemCommittedToSprint` porque en Scrum un elemento solo se compromete en un sprint; si el equipo prefiere el nombre largo en algún caso, vale [IDDD cap. 8].
* La combinación del nombre y sus propiedades cuenta por completo lo que pasó en el modelo [Destilado cap. 6].
* Con el paquete, el nombre es la clase y su `static readonly eventName` (`'OrderPlaced'`); el nombre `sales.order.OrderPlaced` queda para el contrato publicado a otros contextos [IDDD cap. 13] `[Fuera de los libros: convención de @archi-code/ddd]`.

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
* Lo necesario para "volver a disparar" el evento: identidad del agregado (`aggregateId`, el primer argumento de `super`) y de los agregados implicados.
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

Un evento extiende `EventBase` de `@archi-code/ddd/domain`, declara `static readonly eventName` y recibe sus datos como primitivos sacados de los value objects (el dinero como `{ amount, currency }` en céntimos), nunca value objects ni el `toPrimitives()` del agregado `[Fuera de los libros: convención de @archi-code/ddd]`:

```ts
import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export interface MoneyData {
  readonly amount: number;
  readonly currency: string;
}

export class OrderConfirmed extends EventBase {
  static readonly eventName = 'OrderConfirmed';

  constructor(
    orderId: string,
    readonly total: MoneyData,
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }
}
```

El agregado lo registra en el método que causa el hecho, pasando el reloj que recibió para que `occurredOn` sea determinista en los tests. En el `Order` de `ddd-skills/ddd-agregados/references/implementacion-ts.md` el pedido se confirma solo cuando ya tiene reserva y autorización, desde `registerStockReservation` o `registerPaymentAuthorization`:

```ts
private tryToConfirm(clock: { now(): Date }): void {
  if (this._stockReservation !== null && this._paymentAuthorization !== null) {
    this._status = new OrderStatus(Status.Confirmed);
    this.record(new OrderConfirmed(this.id.value, Order.moneyData(this.total()), { clock }));
  }
}
```

`EventBase` pone `eventId` (UUID v4) y `occurredOn` (del `clock`, o la hora del sistema), y `record()` congela el evento: inmutable y con constructor completo [IDDD cap. 8]. No generes tú el id ni la fecha de un evento nuevo; pasa `{ eventId, occurredOn }` (o el JSON entero) solo al reconstruir uno que entregó un canal. `toJSON()` da la forma que viaja:

```ts
const [confirmed] = order.pullDomainEvents();
confirmed.toJSON();
// { eventName: 'OrderConfirmed', eventVersion: 1, eventId: '…', aggregateId: '9b2f6c1e-…',
//   occurredOn: '2026-03-01T09:30:00.000Z', total: { amount: 7000, currency: 'EUR' } }
```

## Identidad del evento

* Dentro del contexto rara vez hace falta comparar eventos; el tipo, las identidades implicadas y la fecha suelen bastar, como en un value object [IDDD cap. 8].
* Fuera, con mensajería que puede reenviar, una identidad única permite deduplicar. Algunos buses la ponen en la cabecera; si no, la asigna el publicador [IDDD cap. 8]. Con el paquete es el `eventId` que pone `EventBase`: viaja en el JSON, `EventRegistry` lo conserva al reconstruir el evento (la fábrica pasa el JSON como metadatos) y el adaptador del broker lo usa como `messageId`.

## Eventos con características de agregado

A veces un evento no resulta de un comando sobre un agregado sino que un usuario lo origina directamente. Entonces puede modelarse como agregado inmutable en su propio repositorio, que no permite borrarlo, con identidad generada [IDDD cap. 8]. Ejemplo: una `IncidenciaDeEntregaReportada` por el transportista que se archiva y se consulta. Con el paquete sería un `AggregateRoot` cuyo repositorio implementa solo `AggregateFinder` y `AggregateSaver` (nunca `AggregateRemover`), con id `XId.generate()`.

## Versionado

* Los eventos publicados llevan versión. Diseñados con cuidado, muchos consumidores pueden leer cualquier versión como si fuera la 1 [IDDD cap. 13].
* Cambios compatibles `[Fuera de los libros]`: añadir campos opcionales. Incompatibles: renombrar, quitar o cambiar el significado → nueva versión o nuevo evento, publicando ambas durante la transición.
* Con el paquete, la versión de la forma interna es `static readonly eventVersion` (1 si no se declara; `toJSON()` la escribe). Los eventos guardados conservan la versión con la que se escribieron, así que la fábrica del `EventRegistry` lee las formas antiguas a partir de `json.eventVersion`:

```ts
import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';
import { EventRegistry } from '@archi-code/ddd/application';

export class OrderCancelled extends EventBase {
  static readonly eventName = 'OrderCancelled';
  static readonly eventVersion = 2;

  constructor(
    orderId: string,
    readonly reason: string,
    readonly refund: MoneyData,
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }
}

export const cancellations = new EventRegistry<OrderCancelled>().register(
  OrderCancelled,
  (json) =>
    json.eventVersion === 1
      ? new OrderCancelled(
          json.aggregateId,
          json.reason as string,
          { amount: json.refundCents as number, currency: 'EUR' },
          json,
        )
      : new OrderCancelled(json.aggregateId, json.reason as string, json.refund as MoneyData, json),
);
```

La versión del contrato publicado a otros contextos es otra cosa: la decide el adaptador del broker, que puede seguir emitiendo la v1 del contrato aunque el evento interno esté en la v2 (ver `ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`).
