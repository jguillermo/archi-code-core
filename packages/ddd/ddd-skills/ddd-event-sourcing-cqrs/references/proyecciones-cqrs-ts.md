# Proyecciones y CQRS en TypeScript

El paquete da la entrega (`EventListener`, `@ListensTo`, `DomainEventBus`, `EventRegistry`, `EventChannel`); el read model es del proyecto. Eventos de `ddd-skills/ddd-agregados/references/implementacion-ts.md`.

## Piezas

`[Fuera de los libros: convención de @archi-code/ddd]` En `application/order-summaries/`:

| Fichero | Contiene |
|---|---|
| `order-summary.ts` | Fila `OrderSummary` (primitivos) y `OrderSummaryChanges` |
| `order-summary-store.ts` | `find(orderId)`, `hasApplied(eventId)`, `save(row, eventId)` |
| `order-summaries.ts` | Consulta: `byId`, `ofCustomer` |
| `order-summary-projection.ts` | `OrderSummaryProjection.apply`, idempotente; no es caso de uso ni escucha eventos |
| `<acción>/<acción>-on-<evento>.ts` | Una reacción por evento que cambia la fila |

Infraestructura (`infrastructure/read-model/`) implementa store y consulta. Vista desnormalizada para la pantalla; filtros antes que una vista por usuario [IDDD cap. 4]. `lastEventAt` muestra la antigüedad [IDDD cap. 4].

## Proyección idempotente

```ts
export class OrderSummaryProjection {
  constructor(private readonly store: OrderSummaryStore) {}

  async apply({ eventId, orderId, occurredOn, changes }: OrderSummaryChange): Promise<void> {
    if (await this.store.hasApplied(eventId.toString())) {
      return;
    }
    const lastEventAt = occurredOn.toString();
    const current = (await this.store.find(orderId.value)) ?? {
      orderId: orderId.value,
      customerId: null,
      status: 'unknown',
      total: null,
      lastEventAt,
    };
    await this.store.save({ ...current, ...changes, lastEventAt }, eventId.toString());
  }
}
```

```ts
@ListensTo(OrderLineAddedDomainEvent, { consumer: 'sales.update-order-summary-total-on-order-line-added' })
export class UpdateOrderSummaryTotalOnOrderLineAdded extends EventListener<OrderLineAddedDomainEvent> {
  constructor(private readonly projection: OrderSummaryProjection) {
    super();
  }

  async handle(event: OrderLineAddedDomainEvent): Promise<void> {
    const { eventId, orderId, occurredOn, total } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      orderId: () => new OrderId(event.orderId),
      occurredOn: () => new CreatedAt(event.occurredOn),
      total: () => Money.fromPrimitives(event.total),
    });
    await this.projection.apply({ eventId, orderId, occurredOn, changes: { total: total.toPrimitives() } });
  }
}
```

* Una clase por reacción; el evento propio si la vista es del contexto, la copia local si viene de otro.
* Cambios absolutos (`total`), no sumas; además la bandeja por `eventId`.
* La reacción recibe siempre el evento reconstruido por `EventRegistry`, también en memoria: lo que funciona con `InMemoryEventChannel` funciona con un broker.
* Un canal solo garantiza el orden de un mismo `send` para un consumidor. Si un evento llega antes que el que crea la fila, se parte de la fila por defecto; si la vista no lo admite, compara `occurredOn` con `lastEventAt` `[Fuera de los libros]`.
* El store anota el `eventId` en `projection_inbox (projection, event_id)` con `ON CONFLICT DO NOTHING` y escribe la fila solo si insertó, en la misma transacción `[Fuera de los libros]`.
* El composition root registra cada evento una vez (conservando `eventId` y `occurredOn`) y suscribe las reacciones con `bus.subscribe`; el controlador recibe el store como puerto de consulta.

## Reconstruir

Crear `order_summaries_v2`, proyectar desde 0 en segundo plano, cambiar la consulta cuando alcance el presente y borrar la antigua: la vista cambia sin tocar el agregado [IDDD apéndice A]. `[Fuera de los libros: convención de @archi-code/ddd]` Un `EventChannel` es entrega, no historial: hace falta un log de eventos propio, ordenado y que nunca se borra (el event store por `global_seq`, `ddd-skills/ddd-event-sourcing-cqrs/references/event-sourcing-ts.md`, o una tabla donde el canal anexa cada `SerializedEvent`). Se reproduce suscribiendo las reacciones a un `DomainEventBus` sobre un `InMemoryEventChannel` aparte y enviando el log por páginas con `replay.send(page)`. El canal en memoria entrega en serie y en orden; si un evento falla, `send` rechaza y la reconstrucción se detiene. Las reacciones de la v2 son clases nuevas con su propio `consumer` (su identidad y su cola), y la bandeja por `eventId` absorbe lo que llegue por las dos vías hasta alcanzar el presente.

## Lado de consulta

Sin agregados, repositorios ni caso de uso: el controlador llama a `OrderSummaries`; una fila que falta es un 404 que decide él. Los comandos sí pasan por casos de uso y agregados. Para filtros y orden que elige el usuario, `Criteria` (`@archi-code/ddd/domain`, `defineCriteriaSchema` para la entrada de fuera) en vez de un método por combinación; sirve cuando la consulta lee la colección de los agregados (`Criteria<Order>`); una tabla de proyección se filtra con los métodos del puerto.

## CQRS sin Event Sourcing

Las proyecciones se alimentan de los eventos que los casos de uso publican tras `save` (`ddd-skills/ddd-eventos-dominio/GUIA.md`); mismo patrón. Si la vista debe reconstruirse, guarda cada evento en un log propio desde el primer día `[Fuera de los libros: convención de @archi-code/ddd]`.

## Proyecciones para otros agregados

Un caso de uso puede leer una proyección (`CustomerBillingView`) por un puerto de aplicación para dar datos de referencia a un agregado sin acoplarlo a otro [IDDD apéndice A; allí lo hace un servicio de dominio con su interfaz, aquí no existen puertos de dominio `[Fuera de los libros: convención de @archi-code/ddd]`]: la infraestructura implementa el puerto sobre la tabla y el caso de uso pasa los datos ya cargados al método del agregado o al servicio de dominio; nunca para invariantes que exijan consistencia inmediata.
