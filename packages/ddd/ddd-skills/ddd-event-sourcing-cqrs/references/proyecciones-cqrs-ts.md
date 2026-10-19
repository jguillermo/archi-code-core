# Proyecciones y CQRS en TypeScript

## Modelo de lectura

Pensado para la pantalla: desnormalizado, una tabla o documento por vista, tantas vistas como hagan falta (sin caer en una por usuario: IDDD recomienda filtros cuando el número de vistas sería impracticable) [IDDD cap. 4].

```sql
CREATE TABLE order_summaries (
  order_id      TEXT PRIMARY KEY,
  customer_id   TEXT NOT NULL,
  status        TEXT NOT NULL,
  total         TEXT NOT NULL,
  item_count    INT  NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL,   -- permite mostrar la antigüedad del dato [IDDD cap. 4]
  last_seq      BIGINT NOT NULL         -- última posición aplicada: idempotencia
);
CREATE TABLE projection_checkpoints (name TEXT PRIMARY KEY, position BIGINT NOT NULL);
```

## Proyección idempotente

```ts
export class OrderSummaryProjection {
  readonly name = 'order_summaries.v1';

  async handle(e: StoredEvent, db: Queryable): Promise<void> {
    switch (e.type) {
      case 'OrderPlaced':
        await db.query(
          `INSERT INTO order_summaries (order_id, customer_id, status, total, item_count, updated_at, last_seq)
           VALUES ($1,$2,'PENDING',$3,$4,$5,$6) ON CONFLICT (order_id) DO NOTHING`,
          [e.body.orderId, e.body.customerId, e.body.total.amount, e.body.lines.length, e.occurredOn, e.seq]);
        break;
      case 'OrderConfirmed':
      case 'OrderCancelled':
        await db.query(
          `UPDATE order_summaries SET status=$2, updated_at=$3, last_seq=$4 WHERE order_id=$1 AND last_seq < $4`,
          [e.body.orderId, e.type === 'OrderConfirmed' ? 'CONFIRMED' : 'CANCELLED', e.occurredOn, e.seq]);
        break;
    }
  }
}
```

El proyector lee eventos desde el último checkpoint, aplica cada uno y avanza el checkpoint en la misma transacción `[Fuera de los libros]`.

## Reconstruir

Para cambiar una vista: crear `order_summaries_v2`, proyectar desde la posición 0 en segundo plano, cambiar la consulta cuando alcance el presente y borrar la antigua. Es la ventaja que destaca IDDD: cambiar lo que se ofrece sin modificar el agregado [IDDD apéndice A].

## Lado de consulta

```ts
export class OrderSummaries {                       // capa de aplicación, solo lectura
  constructor(private readonly db: Queryable) {}
  async ofCustomer(customerId: string, page: Page): Promise<OrderSummaryDto[]> {
    const { rows } = await this.db.query(
      `SELECT * FROM order_summaries WHERE customer_id=$1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
      [customerId, page.size, page.offset]);
    return rows.map(toDto);
  }
}
```

Las consultas no pasan por agregados ni repositorios. Los comandos sí.

## CQRS sin Event Sourcing

Con persistencia de estado normal, las proyecciones se alimentan de los eventos del outbox (`ddd-skills/ddd-eventos-dominio/GUIA.md`). Mismo patrón: checkpoint, idempotencia, reconstrucción desde el log de eventos guardados.

## Proyecciones para otros agregados

IDDD muestra una proyección (`CustomerBillingView`) que un agregado `Invoice` consulta a través de un servicio de dominio para obtener datos de cliente sin acoplarse al agregado `Customer` [IDDD apéndice A]. Úsalo para datos de referencia, nunca para proteger invariantes que exijan consistencia inmediata.
