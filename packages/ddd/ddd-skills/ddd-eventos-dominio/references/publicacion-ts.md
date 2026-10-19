# Guardar y publicar eventos en TypeScript

## Flujo completo

```
Caso de uso ─┬─ carga agregado
             ├─ invoca comportamiento → el agregado registra eventos
             ├─ BEGIN
             │    guarda agregado (con versión)
             │    inserta eventos en event_store / outbox
             └─ COMMIT
Reenviador (proceso aparte) ── lee no publicados → publica en el bus → marca publicados
Despachador interno (opcional) ── entrega a políticas del propio contexto, fuera de la transacción
```

Base en los libros: guardar agregado y evento en la misma transacción y publicar después [Destilado cap. 6]; event store propio en la base del modelo con un componente fuera de banda que reenvía lo no publicado [IDDD cap. 8].

## Tabla

`[Fuera de los libros: esquema propio; IDDD cap. 8 usa una tabla equivalente con id secuencial, tipo, cuerpo y fecha]`

```sql
CREATE TABLE stored_events (
  sequence      BIGSERIAL PRIMARY KEY,          -- orden causal dentro del contexto
  event_id      UUID        NOT NULL UNIQUE,
  aggregate_id  TEXT        NOT NULL,
  type_name     TEXT        NOT NULL,
  version       INT         NOT NULL,
  occurred_on   TIMESTAMPTZ NOT NULL,
  body          JSONB       NOT NULL,
  published_at  TIMESTAMPTZ NULL
);
CREATE INDEX stored_events_unpublished ON stored_events (sequence) WHERE published_at IS NULL;
```

## Guardar en la transacción

```ts
export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly tx: PgTransactionRunner) {}

  async save(order: Order): Promise<void> {
    const db = this.tx.current();                    // conexión de la transacción en curso
    const row = OrderMapper.toRow(order);
    const result = await db.query(
      `UPDATE orders SET status=$2, lines=$3, version=version+1 WHERE id=$1 AND version=$4`,
      [row.id, row.status, row.lines, order.version],
    );
    if (result.rowCount === 0 && order.version > 0) throw new ConcurrencyConflict('Order', row.id);
    if (order.version === 0) await db.query(`INSERT INTO orders (...) VALUES (...)`, [/* ... */]);

    for (const event of order.pullEvents()) {
      await db.query(
        `INSERT INTO stored_events (event_id, aggregate_id, type_name, version, occurred_on, body)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [event.eventId, row.id, event.type, event.version, event.occurredOn, EventSerializer.toJson(event)],
      );
    }
    order.markPersisted();
  }
}
```

Que el repositorio vacíe los eventos al guardar es una opción cómoda `[Fuera de los libros]`. La alternativa es que el caso de uso llame a `pullEvents()` y a un `EventStore.append` dentro de la misma transacción. Elige una y sé consistente.

## Reenviador

```ts
export class StoredEventForwarder {
  constructor(private readonly db: Pool, private readonly bus: MessageBus, private readonly translate: PublishedLanguageMapper) {}

  async forwardBatch(limit = 100): Promise<number> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `SELECT * FROM stored_events WHERE published_at IS NULL
         ORDER BY sequence LIMIT $1 FOR UPDATE SKIP LOCKED`, [limit]);
      for (const r of rows) {
        const message = this.translate.toPublished(r);      // null si el evento es solo interno
        if (message) await this.bus.publish(message.topic, message.body, { messageId: r.event_id });
      }
      await client.query(
        `UPDATE stored_events SET published_at = now() WHERE sequence = ANY($1)`,
        [rows.map((r) => r.sequence)]);
      await client.query('COMMIT');
      return rows.length;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
```

Si el proceso cae tras publicar y antes de marcar, el mensaje se volverá a enviar. Es la razón por la que los consumidores deben deduplicar [IDDD cap. 8].

`PublishedLanguageMapper` traduce el evento interno al esquema publicado y decide qué eventos salen del contexto (ver "Eventos internos y eventos publicados" en `ddd-skills/ddd-eventos-dominio/GUIA.md`).

## Consumidor idempotente

```ts
export class InboxGuard {
  constructor(private readonly tx: PgTransactionRunner) {}

  /** Ejecuta `work` una sola vez por messageId, dentro de la transacción del cambio. */
  async once(messageId: string, work: () => Promise<void>): Promise<void> {
    await this.tx.run(async () => {
      const inserted = await this.tx.current().query(
        `INSERT INTO processed_messages (message_id) VALUES ($1) ON CONFLICT DO NOTHING`, [messageId]);
      if (inserted.rowCount === 0) return;           // ya procesado
      await work();
    });
  }
}
```

## Orden y causalidad

* El `sequence` de la tabla conserva el orden causal dentro del contexto [Destilado cap. 6].
* El bus puede desordenar. Opciones `[Fuera de los libros]`: particionar por `aggregate_id` (Kafka, sesiones de Service Bus) para mantener el orden por agregado; o que el consumidor compare versiones y aparque los eventos que llegan antes que su causa [Destilado cap. 6 describe la responsabilidad del consumidor].
* Si un evento posterior hace irrelevante uno anterior, el consumidor puede ignorar el anterior [Destilado cap. 6].

## Despacho interno

Para políticas del mismo contexto se puede usar el mismo reenviador (más simple y robusto) o un despachador en proceso que se ejecute **después** del commit. Nunca dentro de la transacción si la política modifica otro agregado [IDDD cap. 8].

## Notificaciones por REST

Alternativa a un bus: exponer el event store como un log de notificaciones REST (actual y archivados), que los consumidores leen a su ritmo [IDDD cap. 8 y cap. 13]. Útil cuando los consumidores no comparten infraestructura de mensajería. Ver `ddd-skills/ddd-context-mapping/GUIA.md`.
