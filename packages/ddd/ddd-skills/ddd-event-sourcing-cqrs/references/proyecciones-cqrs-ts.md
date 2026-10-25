# Proyecciones y CQRS en TypeScript

El paquete da las piezas de la entrega (`EventListener`, `@ListensTo`, `DomainEventBus`, `EventRegistry`, `EventChannel`); el modelo de lectura, su escritura idempotente, la reconstrucción y las consultas son código del proyecto. Los ejemplos usan los eventos `OrderCreatedDomainEvent` (`'order.created'`: `orderId`, `customerId`, `lines`, `total`) y `OrderLineAddedDomainEvent` (`'order.line_added'`: `orderId`, `sku`, `quantity`, `total`) del pedido de `ddd-skills/ddd-agregados/references/implementacion-ts.md`, subclases de `EventBase` como en `ddd-skills/ddd-eventos-dominio/GUIA.md`.

## Piezas de un read model

`[Fuera de los libros: convención de @archi-code/ddd]` Un read model es un módulo de `application/` (`application/order-summaries/`) con:

| Fichero | Contiene |
|---|---|
| `order-summary.ts` | La fila (`OrderSummary`, solo primitivos) y `OrderSummaryChanges = Partial<Pick<OrderSummary, …>>` |
| `order-summary-store.ts` | Puerto de escritura: `find(orderId)`, `hasApplied(eventId)`, `save(row, eventId)` |
| `order-summaries.ts` | Puerto de consulta: `byId`, `ofCustomer` |
| `order-summary-projection.ts` | `OrderSummaryProjection`: no es un caso de uso ni escucha eventos; aplica un cambio una sola vez |
| `<acción>/<acción>-on-<evento>.ts` | Un caso de uso por reacción por cada evento que cambia la fila |

Una clase de infraestructura implementa los dos puertos (`infrastructure/read-model/`). Las consultas no tienen caso de uso: el controlador recibe el puerto de consulta y lo llama.

## Modelo de lectura

Pensado para la pantalla: desnormalizado, una tabla o documento por vista, tantas vistas como hagan falta (sin caer en una por usuario: IDDD recomienda filtros cuando el número de vistas sería impracticable) [IDDD cap. 4].

```ts
// application/order-summaries/order-summary.ts
import type { MoneyData } from '../place-order/money-data';

export interface OrderSummary {
  orderId: string;
  customerId: string | null;
  status: string;
  total: MoneyData | null;
  lastEventAt: string;
}

export type OrderSummaryChanges = Partial<Pick<OrderSummary, 'customerId' | 'status' | 'total'>>;
```

```ts
// application/order-summaries/order-summary-store.ts
export interface OrderSummaryStore {
  find(orderId: string): Promise<OrderSummary | null>;
  hasApplied(eventId: string): Promise<boolean>;
  save(summary: OrderSummary, eventId: string): Promise<void>;
}

// application/order-summaries/order-summaries.ts
export interface OrderSummaries {
  byId(orderId: string): Promise<OrderSummary | null>;
  ofCustomer(customerId: string): Promise<OrderSummary[]>;
}
```

```sql
CREATE TABLE order_summaries (
  order_id     TEXT PRIMARY KEY,
  customer_id  TEXT,
  status       TEXT        NOT NULL,
  total_cents  BIGINT,
  currency     TEXT,
  last_event_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE projection_inbox (
  projection  TEXT NOT NULL,
  event_id    UUID NOT NULL,
  PRIMARY KEY (projection, event_id)
);
```

`lastEventAt` (el `occurredOn` del último evento aplicado) permite mostrar la antigüedad del dato [IDDD cap. 4]. `projection_inbox` guarda el `eventId` de cada evento ya aplicado: la entrega es al menos una vez, así que la proyección es idempotente por `eventId`.

## Proyección idempotente

La proyección recibe el puerto de store; `apply` no hace nada si el `eventId` ya se aplicó, mezcla los cambios en la fila guardada (o en una fila por defecto, si el evento llega antes que el que la crea), fija `lastEventAt` y guarda con el `eventId`:

```ts
// application/order-summaries/order-summary-projection.ts
import type { CreatedAt, UuidType } from '@archi-code/ddd/domain';

export interface OrderSummaryChange {
  eventId: UuidType;
  orderId: OrderId;
  occurredOn: CreatedAt;
  changes: OrderSummaryChanges;
}

export class OrderSummaryProjection {
  constructor(private readonly store: OrderSummaryStore) {}

  async apply({ eventId, orderId, occurredOn, changes }: OrderSummaryChange): Promise<void> {
    const appliedEventId = eventId.toString();
    if (await this.store.hasApplied(appliedEventId)) {
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
    await this.store.save({ ...current, ...changes, lastEventAt }, appliedEventId);
  }
}
```

Cada evento que cambia la fila tiene su caso de uso por reacción, que construye `eventId`, el id y `occurredOn` como value objects, decide el cambio y llama a la proyección:

```ts
// application/order-summaries/open-order-summary/open-order-summary-on-order-created.ts
import { CreatedAt, UuidType } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';

@ListensTo(OrderCreatedDomainEvent, { consumer: 'sales.open-order-summary-on-order-created' })
export class OpenOrderSummaryOnOrderCreated extends EventListener<OrderCreatedDomainEvent> {
  constructor(private readonly projection: OrderSummaryProjection) {
    super();
  }

  async handle(event: OrderCreatedDomainEvent): Promise<void> {
    const { eventId, orderId, occurredOn, customerId, total } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      orderId: () => new OrderId(event.orderId),
      occurredOn: () => new CreatedAt(event.occurredOn),
      customerId: () => new CustomerId(event.customerId),
      total: () => Money.fromPrimitives(event.total),
    });
    await this.projection.apply({
      eventId,
      orderId,
      occurredOn,
      changes: {
        customerId: customerId.value,
        status: OrderStatus.PENDING,
        total: total.toPrimitives(),
      },
    });
  }
}
```

```ts
// application/order-summaries/update-order-summary-total/update-order-summary-total-on-order-line-added.ts
@ListensTo(OrderLineAddedDomainEvent, {
  consumer: 'sales.update-order-summary-total-on-order-line-added',
})
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

* Una clase por reacción, aunque varios eventos alimenten la misma fila. El evento es el propio del contexto (`domain/event/`) cuando la vista es del mismo contexto; si viene de otro, la copia local junto a la reacción.
* El cambio es un valor absoluto que el evento ya lleva (`total`), no una suma: aplicarlo dos veces deja el mismo resultado, y la comprobación por `eventId` evita además aplicar dos veces un evento reentregado.
* Un canal solo garantiza el orden de los eventos de un mismo `send` para un consumidor. Si un evento llega antes que el que crea la fila, la proyección parte de la fila por defecto, y el evento de creación completa los campos que falten. Si una vista no admite ese desorden, compara `occurredOn` con `lastEventAt` antes de aplicar `[Fuera de los libros]`.
* La reacción recibe siempre el evento reconstruido por el `EventRegistry` desde su JSON, también en memoria: lo que funciona con `InMemoryEventChannel` funciona igual con un broker.

La implementación del store registra el `eventId` en `projection_inbox` y guarda la fila en la misma transacción; también implementa el puerto de consulta `[Fuera de los libros]`:

```ts
// infrastructure/read-model/pg-order-summary-store.ts
import { InternalErrorException } from '@archi-code/ddd/infrastructure';

interface Sql {
  query<Row>(text: string, values: readonly unknown[]): Promise<{ rows: Row[]; rowCount: number }>;
}

interface SqlDatabase extends Sql {
  transaction<Result>(work: (sql: Sql) => Promise<Result>): Promise<Result>;
}

interface SummaryRow {
  order_id: string;
  customer_id: string | null;
  status: string;
  total_cents: string | null;
  currency: string | null;
  last_event_at: Date;
}

export class PgOrderSummaryStore implements OrderSummaryStore, OrderSummaries {
  constructor(
    private readonly database: SqlDatabase,
    private readonly table = 'order_summaries',
  ) {}

  async find(orderId: string): Promise<OrderSummary | null> {
    return this.byId(orderId);
  }

  async hasApplied(eventId: string): Promise<boolean> {
    const { rowCount } = await this.read(
      'SELECT 1 FROM projection_inbox WHERE projection = $1 AND event_id = $2',
      [this.table, eventId],
    );
    return rowCount > 0;
  }

  async save(summary: OrderSummary, eventId: string): Promise<void> {
    await this.database.transaction(async (sql) => {
      const { rowCount } = await sql.query(
        'INSERT INTO projection_inbox (projection, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [this.table, eventId],
      );
      if (rowCount === 0) {
        return;
      }
      await sql.query(
        `INSERT INTO ${this.table} (order_id, customer_id, status, total_cents, currency, last_event_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (order_id) DO UPDATE SET customer_id = $2, status = $3, total_cents = $4,
           currency = $5, last_event_at = $6`,
        [
          summary.orderId,
          summary.customerId,
          summary.status,
          summary.total?.amount ?? null,
          summary.total?.currency ?? null,
          summary.lastEventAt,
        ],
      );
    });
  }

  async byId(orderId: string): Promise<OrderSummary | null> {
    const { rows } = await this.read(`SELECT * FROM ${this.table} WHERE order_id = $1`, [orderId]);
    return rows[0] === undefined ? null : this.toSummary(rows[0]);
  }

  async ofCustomer(customerId: string): Promise<OrderSummary[]> {
    const { rows } = await this.read(
      `SELECT * FROM ${this.table} WHERE customer_id = $1 ORDER BY last_event_at DESC, order_id`,
      [customerId],
    );
    return rows.map((row) => this.toSummary(row));
  }

  private async read(text: string, values: readonly unknown[]) {
    try {
      return await this.database.query<SummaryRow>(text, values);
    } catch (error) {
      throw new InternalErrorException(`reading ${this.table}`, { cause: error });
    }
  }

  private toSummary(row: SummaryRow): OrderSummary {
    return {
      orderId: row.order_id,
      customerId: row.customer_id,
      status: row.status,
      total:
        row.total_cents === null || row.currency === null
          ? null
          : { amount: Number(row.total_cents), currency: row.currency },
      lastEventAt: row.last_event_at.toISOString(),
    };
  }
}
```

En el composition root del contexto, el store, la proyección y cada reacción se construyen y se suscriben como cualquier caso de uso por reacción, y cada evento que escuchan se registra una vez con una factoría que conserva `eventId` y `occurredOn` (`channel` es el `EventChannel` compartido: `InMemoryEventChannel` en pruebas, tu canal duradero o de broker en producción):

```ts
const registry = new EventRegistry<EventBase>()
  .register(
    OrderCreatedDomainEvent,
    (json) =>
      new OrderCreatedDomainEvent({
        orderId: json.orderId as string,
        customerId: json.customerId as string,
        lines: json.lines as { sku: string; quantity: number; unitPrice: MoneyData }[],
        total: json.total as MoneyData,
        eventId: json.eventId,
        occurredOn: json.occurredOn,
      }),
  )
  .register(
    OrderLineAddedDomainEvent,
    (json) =>
      new OrderLineAddedDomainEvent({
        orderId: json.orderId as string,
        sku: json.sku as string,
        quantity: json.quantity as number,
        total: json.total as MoneyData,
        eventId: json.eventId,
        occurredOn: json.occurredOn,
      }),
  );

const bus = new DomainEventBus<EventBase>(channel, registry, logger);
const summaries = new PgOrderSummaryStore(database);
const projection = new OrderSummaryProjection(summaries);
await bus.subscribe(new OpenOrderSummaryOnOrderCreated(projection));
await bus.subscribe(new UpdateOrderSummaryTotalOnOrderLineAdded(projection));
// el controlador recibe `summaries` como puerto de consulta OrderSummaries
```

## Reconstruir

Para cambiar una vista: crear `order_summaries_v2`, proyectar desde la posición 0 en segundo plano, cambiar la consulta cuando alcance el presente y borrar la antigua. Es la ventaja que destaca IDDD: cambiar lo que se ofrece sin modificar el agregado [IDDD apéndice A].

`[Fuera de los libros: convención de @archi-code/ddd]` Un `EventChannel` es un camino de entrega, no un historial: reconstruir exige un log de eventos propio, ordenado. Con Event Sourcing es el propio event store (por `global_seq`, ver `ddd-skills/ddd-event-sourcing-cqrs/references/event-sourcing-ts.md`); sin él, una tabla donde tu canal duradero anexa cada `SerializedEvent` y que nunca se borra. Para reproducirlo con las mismas reacciones, súbelas a un `DomainEventBus` sobre un `InMemoryEventChannel` aparte y envía el log por páginas:

```ts
import type { EventBase, SerializedEvent } from '@archi-code/ddd/domain';
import type { EventRegistry } from '@archi-code/ddd/infrastructure';
import { DomainEventBus, InMemoryEventChannel } from '@archi-code/ddd/infrastructure';

export interface EventLog {
  read(after: number, limit: number): Promise<{ position: number; event: SerializedEvent }[]>;
}

export async function rebuild(
  log: EventLog,
  projection: OrderSummaryProjection,
  registry: EventRegistry<EventBase>,
): Promise<void> {
  const replay = new InMemoryEventChannel();
  const bus = new DomainEventBus<EventBase>(replay, registry);
  const subscriptions = [
    await bus.subscribe(new OpenOrderSummaryOnOrderCreated(projection)),
    await bus.subscribe(new UpdateOrderSummaryTotalOnOrderLineAdded(projection)),
  ];
  for (let after = 0; ; ) {
    const page = await log.read(after, 500);
    if (page.length === 0) {
      break;
    }
    await replay.send(page.map((entry) => entry.event));
    after = page[page.length - 1].position;
  }
  for (const subscription of subscriptions) {
    await subscription.unsubscribe();
  }
}
```

`rebuild(log, new OrderSummaryProjection(new PgOrderSummaryStore(database, 'order_summaries_v2')), registry)` llena la tabla nueva; el canal en memoria entrega en serie y en orden, y si un evento falla, `send` rechaza y la reconstrucción se detiene. Al desplegar la versión 2, las reacciones que la alimentan son clases nuevas con su propio `consumer` (`'sales.open-order-summary-v2-on-order-created'`): es su identidad en el canal (su cola en un broker), y la bandeja por `eventId` absorbe los eventos que lleguen por las dos vías mientras la reconstrucción alcanza el presente.

## Lado de consulta

Las consultas no pasan por agregados ni repositorios (`AggregateFinder`), ni por un caso de uso: el controlador recibe el puerto de consulta (`OrderSummaries`) y lo llama; una fila que falta es un 404 que decide el propio controlador (`{ status: 404, body: { code: 'NOT_FOUND', message: 'Order not found' } }`). Los comandos sí pasan por casos de uso y agregados. Si la pantalla filtra y ordena por campos que elige el usuario, describe la búsqueda con `@archi-code/criteria` (`Criteria<OrderSummary>`, con `defineCriteriaSchema` para la entrada de fuera) en vez de añadir un método por combinación.

## CQRS sin Event Sourcing

Con persistencia de estado normal (repositorios que guardan `toPrimitives()` de cada agregado), las proyecciones se alimentan de los mismos eventos que los casos de uso publican con `EventBus.publish(aggregate.pullDomainEvents())` (`ddd-skills/ddd-eventos-dominio/GUIA.md`). Mismo patrón: idempotencia por `eventId` y reconstrucción desde un log de eventos guardados. `[Fuera de los libros: convención de @archi-code/ddd]` El canal no conserva historial legible: si la vista debe poder reconstruirse desde cero, guarda cada evento en un log propio desde el primer día.

## Proyecciones para otros agregados

IDDD muestra una proyección (`CustomerBillingView`) que un agregado `Invoice` consulta a través de un servicio de dominio para obtener datos de cliente sin acoplarse al agregado `Customer` [IDDD apéndice A]. Con el paquete, el servicio de dominio declara un puerto en `domain/service/` con value objects, la infraestructura lo implementa sobre la tabla de la proyección y el caso de uso pasa los datos ya cargados al método del agregado. Úsalo para datos de referencia, nunca para proteger invariantes que exijan consistencia inmediata.
