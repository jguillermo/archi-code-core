# Proyecciones y CQRS en TypeScript

El paquete da las piezas de la entrega (`EventListener`, `@ListensTo`, `DomainEventBus`, `EventRegistry`, `EventChannel`); el modelo de lectura, su escritura idempotente, la reconstrucción y las consultas son código del proyecto. Los ejemplos usan los eventos `OrderPlaced` (`customerId`, `lines`, `total`) y `OrderLineAdded` (`sku`, `quantity`, `unitPrice`, `total`) del pedido de `ddd-skills/ddd-agregados/references/implementacion-ts.md`, subclases de `EventBase` como en `ddd-skills/ddd-eventos-dominio/GUIA.md`.

## Modelo de lectura

Pensado para la pantalla: desnormalizado, una tabla o documento por vista, tantas vistas como hagan falta (sin caer en una por usuario: IDDD recomienda filtros cuando el número de vistas sería impracticable) [IDDD cap. 4].

```sql
CREATE TABLE order_summaries (
  order_id    TEXT PRIMARY KEY,
  customer    TEXT        NOT NULL,
  line_count  INT         NOT NULL,
  units       INT         NOT NULL,
  total_cents BIGINT      NOT NULL,
  currency    TEXT        NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL
);
CREATE TABLE projection_inbox (
  projection  TEXT NOT NULL,
  event_id    UUID NOT NULL,
  PRIMARY KEY (projection, event_id)
);
```

`updated_at` (el `occurredOn` del último evento aplicado) permite mostrar la antigüedad del dato [IDDD cap. 4]. `projection_inbox` guarda el `eventId` de cada evento ya aplicado: la entrega es al menos una vez, así que la proyección es idempotente por `eventId`.

## Proyección idempotente

`[Fuera de los libros: convención de @archi-code/ddd]` Una proyección se suscribe al bus como cualquier listener: un `EventListener` por evento, marcado con `@ListensTo(Event, { consumer })`, con nombre `<Action>On<Event>`. Como no cambia ningún agregado, no ejecuta un caso de uso: llama a un puerto de la aplicación (`OrderSummaryProjection`) que la infraestructura implementa sobre la tabla de lectura.

```ts
import { EventListener, ListensTo } from '@archi-code/ddd/application';

export interface OrderSummaryProjection {
  orderPlaced(event: OrderPlaced): Promise<void>;
  orderLineAdded(event: OrderLineAdded): Promise<void>;
}

@ListensTo(OrderPlaced, { consumer: 'order-summaries.v1.order-placed' })
export class ProjectOrderSummaryOnOrderPlaced extends EventListener<OrderPlaced> {
  constructor(private readonly summaries: OrderSummaryProjection) {
    super();
  }

  handle(event: OrderPlaced): Promise<void> {
    return this.summaries.orderPlaced(event);
  }
}

@ListensTo(OrderLineAdded, { consumer: 'order-summaries.v1.order-line-added' })
export class ProjectOrderSummaryOnOrderLineAdded extends EventListener<OrderLineAdded> {
  constructor(private readonly summaries: OrderSummaryProjection) {
    super();
  }

  handle(event: OrderLineAdded): Promise<void> {
    return this.summaries.orderLineAdded(event);
  }
}
```

La implementación registra el `eventId` en `projection_inbox` y aplica el cambio en la misma transacción; si el `eventId` ya estaba, no hace nada `[Fuera de los libros]`:

```ts
import type { EventBase } from '@archi-code/ddd/domain';
import { InfrastructureException } from '@archi-code/ddd/infrastructure';

interface Sql {
  query<Row>(text: string, values: readonly unknown[]): Promise<{ rows: Row[]; rowCount: number }>;
}

interface SqlDatabase {
  transaction<Result>(work: (sql: Sql) => Promise<Result>): Promise<Result>;
}

export class PgOrderSummaryProjection implements OrderSummaryProjection {
  constructor(
    private readonly database: SqlDatabase,
    private readonly table = 'order_summaries',
  ) {}

  orderPlaced(event: OrderPlaced): Promise<void> {
    return this.once(event, async (sql) => {
      await sql.query(
        `INSERT INTO ${this.table}
           (order_id, customer, line_count, units, total_cents, currency, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (order_id) DO NOTHING`,
        [
          event.orderId,
          event.customerId,
          event.lines.length,
          event.lines.reduce((units, line) => units + line.quantity, 0),
          event.total.amount,
          event.total.currency,
          event.occurredOn,
        ],
      );
    });
  }

  orderLineAdded(event: OrderLineAdded): Promise<void> {
    return this.once(event, async (sql) => {
      const { rowCount } = await sql.query(
        `UPDATE ${this.table}
         SET line_count = line_count + 1, units = units + $2, total_cents = total_cents + $3,
             updated_at = GREATEST(updated_at, $4)
         WHERE order_id = $1`,
        [
          event.orderId,
          event.quantity,
          event.quantity * event.unitPrice.amount,
          event.occurredOn,
        ],
      );
      if (rowCount === 0) {
        throw new InfrastructureException(
          `${this.table}: order ${event.orderId} is not projected yet`,
        );
      }
    });
  }

  private once(event: EventBase, work: (sql: Sql) => Promise<void>): Promise<void> {
    return this.database.transaction(async (sql) => {
      const { rowCount } = await sql.query(
        'INSERT INTO projection_inbox (projection, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [this.table, event.eventId],
      );
      if (rowCount === 1) {
        await work(sql);
      }
    });
  }
}
```

* Sumar unidades e importes no es idempotente por sí mismo; la bandeja por `eventId` lo hace idempotente. Se suma el subtotal de la línea (`quantity` × `unitPrice`) en vez de copiar el `total` del evento, para que dos `OrderLineAdded` del mismo pedido entregados en otro orden dejen el mismo resultado.
* Un canal solo garantiza el orden de los eventos de un mismo `send` para un consumidor. Si `OrderLineAdded` llega antes que `OrderPlaced`, la actualización no encuentra fila: lanzar deshace la transacción (también la marca en la bandeja) y el canal lo entrega de nuevo más tarde.
* El listener recibe siempre el evento reconstruido por el `EventRegistry` desde su JSON, también en memoria: lo que funciona con `InMemoryEventChannel` funciona igual con un broker.

En la composición se suscriben como cualquier listener (`channel` es el `EventChannel` del proyecto: `InMemoryEventChannel` en pruebas, tu canal duradero o de broker en producción):

```ts
import { DomainEventBus, EventRegistry } from '@archi-code/ddd/infrastructure';

export const orderEvents = new EventRegistry<OrderEvent>()
  .register(
    OrderPlaced,
    (json) =>
      new OrderPlaced(
        json.orderId as string,
        json.customerId as string,
        json.lines as OrderLineData[],
        json.total as MoneyData,
        json,
      ),
  )
  .register(
    OrderLineAdded,
    (json) =>
      new OrderLineAdded(
        json.orderId as string,
        json.sku as string,
        json.quantity as number,
        json.unitPrice as MoneyData,
        json.total as MoneyData,
        json,
      ),
  );

const bus = new DomainEventBus<OrderEvent>(channel, orderEvents);
const projection = new PgOrderSummaryProjection(database);
await bus.subscribe(new ProjectOrderSummaryOnOrderPlaced(projection));
await bus.subscribe(new ProjectOrderSummaryOnOrderLineAdded(projection));
```

## Reconstruir

Para cambiar una vista: crear `order_summaries_v2`, proyectar desde la posición 0 en segundo plano, cambiar la consulta cuando alcance el presente y borrar la antigua. Es la ventaja que destaca IDDD: cambiar lo que se ofrece sin modificar el agregado [IDDD apéndice A].

`[Fuera de los libros: convención de @archi-code/ddd]` Un `EventChannel` es un camino de entrega, no un historial: reconstruir exige un log de eventos propio, ordenado. Con Event Sourcing es el propio event store (por `global_seq`, ver `ddd-skills/ddd-event-sourcing-cqrs/references/event-sourcing-ts.md`); sin él, una tabla donde tu canal duradero o un listener anexa cada `SerializedEvent` y que nunca se borra. Para reproducirlo con los mismos listeners, súbelos a un `DomainEventBus` sobre un `InMemoryEventChannel` aparte y envía el log por páginas:

```ts
import type { SerializedEvent } from '@archi-code/ddd/domain';
import type { EventRegistry } from '@archi-code/ddd/infrastructure';
import { DomainEventBus, InMemoryEventChannel } from '@archi-code/ddd/infrastructure';

export interface EventLog {
  read(after: number, limit: number): Promise<{ position: number; event: SerializedEvent }[]>;
}

export async function rebuild(
  log: EventLog,
  projection: OrderSummaryProjection,
  registry: EventRegistry<OrderEvent>,
): Promise<void> {
  const replay = new InMemoryEventChannel();
  const bus = new DomainEventBus<OrderEvent>(replay, registry);
  const subscriptions = [
    await bus.subscribe(new ProjectOrderSummaryOnOrderPlaced(projection)),
    await bus.subscribe(new ProjectOrderSummaryOnOrderLineAdded(projection)),
  ];
  for (let after = 0; ; ) {
    const page = await log.read(after, 500);
    if (page.length === 0) {
      break;
    }
    await replay.send(page.map((entry) => entry.event));
    after = page[page.length - 1].position;
  }
  await Promise.all(subscriptions.map((subscription) => subscription.unsubscribe()));
}
```

`rebuild(log, new PgOrderSummaryProjection(database, 'order_summaries_v2'), orderEvents)` llena la tabla nueva; el canal en memoria entrega en serie y en orden, y si un evento falla, `send` rechaza y la reconstrucción se detiene. Al desplegar la versión 2, cambia también el `consumer` de sus listeners (`order-summaries.v2.order-placed`): es su identidad en el canal (su cola en un broker), y la bandeja por `eventId` absorbe los eventos que lleguen por las dos vías mientras la reconstrucción alcanza el presente.

## Lado de consulta

Una consulta de lectura es una interfaz de la aplicación que devuelve DTOs, implementada en infraestructura directamente sobre la base de datos:

```ts
import { InternalErrorException } from '@archi-code/ddd/infrastructure';

export interface OrderSummary {
  readonly id: string;
  readonly customer: string;
  readonly lines: number;
  readonly units: number;
  readonly total: { readonly amount: number; readonly currency: string };
  readonly updatedAt: string;
}

export interface OrderSummaries {
  ofCustomer(customer: string, page: { limit: number; offset: number }): Promise<OrderSummary[]>;
}

interface SummaryRow {
  order_id: string;
  customer: string;
  line_count: number;
  units: number;
  total_cents: string;
  currency: string;
  updated_at: Date;
}

export class PgOrderSummaries implements OrderSummaries {
  constructor(private readonly sql: Sql) {}

  async ofCustomer(
    customer: string,
    page: { limit: number; offset: number },
  ): Promise<OrderSummary[]> {
    try {
      const { rows } = await this.sql.query<SummaryRow>(
        `SELECT order_id, customer, line_count, units, total_cents, currency, updated_at
         FROM order_summaries
         WHERE customer = $1 ORDER BY updated_at DESC, order_id LIMIT $2 OFFSET $3`,
        [customer, page.limit, page.offset],
      );
      return rows.map((row) => ({
        id: row.order_id,
        customer: row.customer,
        lines: row.line_count,
        units: row.units,
        total: { amount: Number(row.total_cents), currency: row.currency },
        updatedAt: row.updated_at.toISOString(),
      }));
    } catch (error) {
      throw new InternalErrorException('reading order summaries', { cause: error });
    }
  }
}
```

Las consultas no pasan por agregados ni repositorios (`AggregateFinder`). Los comandos sí. Si la pantalla filtra y ordena por campos que elige el usuario, describe la búsqueda con `@archi-code/criteria` (`Criteria<OrderSummary>`, con `defineCriteriaSchema` para la entrada de fuera) en vez de añadir un método por combinación.

## CQRS sin Event Sourcing

Con persistencia de estado normal (repositorios que guardan `toPrimitives()` de cada agregado), las proyecciones se alimentan de los mismos eventos que los casos de uso publican con `EventBus.publish(aggregate.pullDomainEvents())` (`ddd-skills/ddd-eventos-dominio/GUIA.md`). Mismo patrón: idempotencia por `eventId` y reconstrucción desde un log de eventos guardados. `[Fuera de los libros: convención de @archi-code/ddd]` El canal no conserva historial legible: si la vista debe poder reconstruirse desde cero, guarda cada evento en un log propio desde el primer día.

## Proyecciones para otros agregados

IDDD muestra una proyección (`CustomerBillingView`) que un agregado `Invoice` consulta a través de un servicio de dominio para obtener datos de cliente sin acoplarse al agregado `Customer` [IDDD apéndice A]. Con el paquete, el servicio de dominio declara un puerto en `domain/` con value objects, la infraestructura lo implementa sobre la tabla de la proyección y el caso de uso pasa los datos ya cargados al método del agregado. Úsalo para datos de referencia, nunca para proteger invariantes que exijan consistencia inmediata.
