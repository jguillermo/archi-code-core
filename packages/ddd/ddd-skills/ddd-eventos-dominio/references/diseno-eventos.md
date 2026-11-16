# Diseñar eventos de dominio

## Nombre

* Pasado, lenguaje del contexto de origen, derivado del comando (`PlaceOrder` → `OrderPlaced`) [Destilado cap. 6; IDDD cap. 8].
* Tan compacto como permita el lenguaje (`BacklogItemCommitted`; el largo también vale si el equipo lo prefiere) [IDDD cap. 8]. Nombre y propiedades cuentan por completo lo que pasó [Destilado cap. 6].
* Con el paquete: `OrderLineAddedDomainEvent`, `eventName` `'order.line_added'`; `sales.order.OrderPlaced` queda para el contrato publicado [IDDD cap. 13] `[Fuera de los libros: convención de @archi-code/ddd]`.

| Mal | Bien |
|---|---|
| `OrderUpdated` | `OrderLineAdded`, `ShippingAddressChanged` |
| `PlaceOrder` | `OrderPlaced` |
| `OrderStatusChangedToConfirmed` | `OrderConfirmed` |
| `PaymentWebhookReceived` | `PaymentAuthorized` |
| `TimerElapsed` | `PaymentAuthorizationExpired` [Destilado cap. 6] |

## Datos

Lo que llevaba el comando que lo causó [Destilado cap. 6], más [IDDD cap. 8]: cuándo ocurrió (`occurredOn`, lo pone `DomainEventBus` `[Fuera de los libros: convención de @archi-code/ddd]`), identidad del agregado y de los implicados, valores útiles del estado resultante y, en multi-tenant, `tenantId`.

`[Fuera de los libros]` ¿Puede el consumidor decidir sin consultar al origen? ¿Hay datos personales que no necesita? ¿Importes con moneda y fechas con zona? ¿Valores que caducan enseguida?

## Forma en TypeScript

`domain/event/OrderConfirmedDomainEvent.ts`, un fichero por evento, tipos en línea, sin interfaces propias, dinero en céntimos `[Fuera de los libros: convención de @archi-code/ddd]`:

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
  }: { orderId: string; total: { amount: number; currency: string } } & EventMetadata) {
    super({ eventId, occurredOn });
    this.orderId = orderId;
    this.total = total;
  }
}
```

El agregado lo registra sin fecha: `this.record(new OrderConfirmedDomainEvent({ orderId: this.id.value, total: this.total().toPrimitives() }))`. No generes id ni fecha de un evento nuevo; pásalos solo al reconstruir uno entregado.

## Identidad

Dentro del contexto rara vez se comparan eventos; fuera, una identidad única permite deduplicar [IDDD cap. 8]. Algunos buses la ponen en la cabecera; si no, el publicador. Con el paquete es el `eventId` de `EventBase`, que `EventRegistry` conserva y el broker usa como `messageId`.

## Eventos con características de agregado

Un hecho que origina directamente un usuario puede ser un agregado inmutable con repositorio sin borrado [IDDD cap. 8]: un `AggregateRoot` con id `XId.generate()` cuyo repositorio declara solo `findById` y `save` (nunca `remove` ni `AggregateRemover`).

## Versionado

* Los eventos publicados llevan versión; bien diseñados, se leen como la v1 [IDDD cap. 13]. Compatible: añadir campos opcionales; incompatible (renombrar, quitar, cambiar significado): versión o evento nuevo, publicando ambos en la transición `[Fuera de los libros]`.
* Los eventos internos no llevan versión `[Fuera de los libros: convención de @archi-code/ddd]`: otro `eventName` (`'order.cancelled_with_refund'`) o una fábrica que reconoce la forma antigua:

```ts
export const cancellations = new EventRegistry().register(
  OrderCancelledDomainEvent,
  (json) =>
    new OrderCancelledDomainEvent({
      orderId: json.orderId as string,
      refund:
        typeof json.refundCents === 'number'
          ? { amount: json.refundCents, currency: 'EUR' }
          : (json.refund as { amount: number; currency: string }),
      eventId: json.eventId,
      occurredOn: json.occurredOn,
    }),
);
```

La versión del contrato publicado la decide el adaptador del broker, que puede seguir emitiendo la v1 aunque cambie el evento interno (`ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`).
