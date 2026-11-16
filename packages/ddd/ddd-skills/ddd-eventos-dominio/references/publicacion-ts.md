# Guardar y publicar eventos en TypeScript

## Flujo

```
Caso de uso: findById → comportamiento (record) → save → events.publish(pullDomainEvents())
Repositorio con outbox: BEGIN → UPDATE orders (versión) → INSERT stored_events → COMMIT
OutboxForwarder (aparte): lee lo no publicado en orden → delivery.send → marca publicado
```

Guardar agregado y evento juntos y publicar después [Destilado cap. 6]; event store propio + reenviador fuera de banda [IDDD cap. 8]. `[Fuera de los libros: convención de @archi-code/ddd]` La aplicación no abre transacciones: la escritura atómica está dentro de `save`.

Qué subpath exporta cada pieza (`EventBase`, `EventBus`, `DomainEventBus`, `EventRegistry`, `EventChannel`, `InMemoryEventChannel`): `ddd-skills/archi-code-ddd/imports.md`. El paquete no trae outbox, reenviador, deduplicación, lenguaje publicado ni canal de broker: los escribe el proyecto `[Fuera de los libros: convención de @archi-code/ddd]`.

## Publicar desde el caso de uso

Código del caso de uso (cargar, comportamiento, `save` y después `publish(pullDomainEvents())`): `ddd-skills/archi-code-ddd/use-cases.md`, apartado Code.

Si `save` falla no se publica nada y los eventos nunca salen dos veces. Si `publish` falla tras `save`, el evento se pierde; cuando no es aceptable, el outbox va en el repositorio (es persistencia, nunca del caso de uso) y el caso de uso no cambia: pasar de memoria a outbox o a un broker cambia solo el repositorio y el `EventChannel` del cableado `[Fuera de los libros: convención de @archi-code/ddd]`. En tests, `InMemoryEventChannel` deja lo publicado en `channel.sent`.

## Outbox en el repositorio

`[Fuera de los libros: esquema propio; IDDD cap. 8 usa una tabla equivalente]`

```sql
CREATE TABLE stored_events (
  sequence BIGSERIAL PRIMARY KEY, event_id UUID NOT NULL UNIQUE, aggregate_id TEXT NOT NULL,
  event_name TEXT NOT NULL, occurred_on TIMESTAMPTZ NOT NULL, body JSONB NOT NULL,
  published_at TIMESTAMPTZ NULL
);
```

Dentro de `save` de `PostgresOrderRepository` (las guías del paquete no muestran un outbox; el resto del adaptador sigue `ddd-skills/archi-code-ddd/repositories.md`: versión en un `WeakMap`, `ConcurrencyException`, errores del driver en `InternalErrorException` con `cause`; el repositorio completo en `ddd-skills/ddd-repositorios-persistencia/references/implementacion-ts.md`):

```ts
const version = this.versions.get(order) ?? 0;
const primitives = order.toPrimitives();
const storedOn = new Date().toISOString();
const events = order.pullDomainEvents().map((event) => ({ ...event, occurredOn: event.occurredOn ?? storedOn }));
const client = await this.pool.connect();
try {
  await client.query('BEGIN');
  const { rowCount } =
    version === 0
      ? await client.query(
          'INSERT INTO orders (id, version, customer_id, status, data) VALUES ($1, 1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
          [primitives.id, primitives.customerId, primitives.status, primitives],
        )
      : await client.query(
          'UPDATE orders SET version = version + 1, status = $3, data = $4 WHERE id = $1 AND version = $2',
          [primitives.id, version, primitives.status, primitives],
        );
  if (rowCount === 0) {
    throw new ConcurrencyException('Order', order.id.value, version);
  }
  for (const event of events) {
    await client.query(
      'INSERT INTO stored_events (event_id, aggregate_id, event_name, occurred_on, body) VALUES ($1, $2, $3, $4, $5)',
      [event.eventId, order.id.value, event.eventName, event.occurredOn, JSON.stringify(event)],
    );
  }
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  if (error instanceof ConcurrencyException) {
    throw error;
  }
  throw new InternalErrorException('saving order', { cause: error });
} finally {
  client.release();
}
this.versions.set(order, version + 1);
```

* Pedido y eventos se confirman o deshacen juntos [IDDD cap. 10]; la versión recordada se actualiza solo tras el `COMMIT`. Si falla, el caso de uso termina con el error y el agregado se descarta con sus eventos.
* `body` es el `SerializedEvent` (`{ ...event }`) con el `occurredOn` que pone `save`, porque un evento nuevo aún no lo tiene (sin outbox lo pone `DomainEventBus` al enviar).
* El `publish` del caso de uso recibe una lista vacía. `remove` no escribe eventos.

Con MongoDB, un array de eventos pendientes en el mismo documento `[Fuera de los libros: convención de @archi-code/ddd]`.

## Reenviador

`OutboxForwarder.forwardBatch()` en una transacción: toma `pg_try_advisory_xact_lock` (un solo reenviador a la vez, para no desordenar `[Fuera de los libros: el cierre consultivo]`), lee `published_at IS NULL ORDER BY sequence LIMIT n`, llama a `delivery.send(bodies)` y marca `published_at`. `body` es `JSONB` y el driver lo devuelve como objeto: sin `JSON.parse`. El composition root lo lanza con un temporizador y un `catch` (un lote que falla queda en el outbox para la pasada siguiente y el rechazo no tumba el proceso).

* Si cae entre entregar y marcar, o una reacción falla y el lote se deshace, reenvía, también a quien ya procesó: los consumidores deduplican [IDDD cap. 8].
* Con `delivery` = `InMemoryEventChannel`, solo entrega en proceso lo que el reenviador sacó tras el commit; un agregado cuyo repositorio no tiene outbox publica directo por `delivery`, sin esa garantía. Reacciones en otro proceso: canal de broker.
* Un evento que siempre falla: contador de intentos y apartarlo pasado un límite [IDDD cap. 10] `[Fuera de los libros: el contador y el límite]`.
* Cada reacción hace su propia escritura después del commit [IDDD cap. 8].

## Lenguaje publicado en el adaptador del broker

Los sistemas de fuera reciben un contrato versionado, no el evento interno [IDDD cap. 13]. Un `EventChannel` del proyecto envuelve al canal interno y, en `send`, traduce campo a campo cada `SerializedEvent` que sale del contexto (`'order.created'` → `sales.order.OrderPlaced`) y lo publica con `messageId` = `eventId`; los internos no producen mensaje. El contrato publicado conserva su nombre aunque cambie el interno, y un campo nuevo del evento interno no se filtra. `SerializedEvent` no lleva campo de versión: una v2 incompatible lleva otro nombre (`sales.order.OrderPlacedV2`) y, en la transición, un evento puede producir un mensaje por versión `[Fuera de los libros: convención de @archi-code/ddd]`. El consumidor lo lee con su propia clase (`ddd-skills/ddd-context-mapping/references/anticorrupcion-ts.md`). Canal de broker: `ddd-skills/archi-code-ddd/composition-and-entry-points.md`, apartado "Another event channel".

## Consumidor idempotente

Entrega al menos una vez: el consumidor anota el `eventId` procesado en la misma transacción que su efecto [IDDD cap. 8]. `[Fuera de los libros: convención de @archi-code/ddd]` Es persistencia: el caso de uso por reacción construye el `eventId` como value object (como `ChargeKey` en `ddd-skills/archi-code-ddd/reactions.md`, apartado "External side effect"), se lo pasa a su puerto y el adaptador hace ambas cosas en una escritura: `INSERT INTO processed_events (consumer, event_id) … ON CONFLICT DO NOTHING` y el efecto solo si insertó, en la misma transacción. Si el efecto ya es idempotente (método de reacción que vuelve sin cambios, id derivado del evento), basta con eso. Si el agregado no existe, la reacción retorna para que el canal no reentregue sin fin. Forma de la reacción: `ddd-skills/archi-code-ddd/reactions.md`, apartado Code.

## Orden y causalidad

* `sequence` conserva el orden causal y el reenviador entrega en ese orden [Destilado cap. 6]. Un consumidor recibe los eventos de un `send` en su orden.
* El bus puede desordenar: particionar por id de agregado, o que el consumidor aparque lo que llega antes que su causa `[Fuera de los libros]` [Destilado cap. 6]. Puede ignorar eventos superados [Destilado cap. 6].

## Despacho interno y REST

* Políticas del mismo contexto: el mismo reenviador o un despachador en proceso que corra **después** del commit; una política que modifica otro agregado nunca corre dentro de la transacción [IDDD cap. 8]; `InMemoryEventChannel` entrega en el acto y no guarda nada: solo tests y prototipos `[Fuera de los libros: convención de @archi-code/ddd]`.
* Alternativa al bus: exponer `stored_events` como log de notificaciones REST paginado por `sequence` [IDDD cap. 8 y cap. 13]. Ver `ddd-skills/ddd-context-mapping/GUIA.md`.
