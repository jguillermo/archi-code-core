# Guardar y publicar eventos en TypeScript

## Flujo completo

```
Caso de uso ── transactions.run ─┬─ orders.findById
                                 ├─ comportamiento → el agregado hace record(evento)
                                 ├─ orders.save(order)             (con versión)
                                 └─ events.publish(order.pullDomainEvents())
                                       DomainEventBus → EventChannel.send(json)
                                       OutboxEventChannel: INSERT en stored_events, misma transacción
                                 COMMIT
OutboxForwarder (aparte) ── lee lo no publicado en orden → delivery.send(json) → marca publicado
delivery (EventChannel) ── traduce al lenguaje publicado y lo manda al broker
                        └─ entrega a los listeners del propio contexto (receive)
```

Base en los libros: guardar agregado y evento en la misma transacción y publicar después [Destilado cap. 6]; event store propio en la base del modelo con un componente fuera de banda que reenvía lo no publicado [IDDD cap. 8].

Qué pone `@archi-code/ddd` y qué escribe el proyecto:

| Pieza | Dónde |
|---|---|
| `EventBase`, `AggregateRoot.record()`/`pullDomainEvents()` | `@archi-code/ddd/domain` |
| `EventBus` (lo único que ve el caso de uso), `EventListener`, `@ListensTo`, `TransactionRunner` | `@archi-code/ddd/application` |
| `DomainEventBus`, `EventRegistry`, `EventChannel`, `ChannelHandler`, `ChannelSubscription` (cableado del composition root y puerto del canal) | `@archi-code/ddd/infrastructure` |
| `InMemoryEventChannel`, `InMemoryTransactionRunner`, `InMemoryRepository` (tests) | `@archi-code/ddd/infrastructure` |
| Outbox (`OutboxEventChannel`), reenviador, deduplicación, traducción al lenguaje publicado, canal del broker | tu infraestructura, sobre esos puertos |

## Publicar desde el caso de uso

El caso de uso guarda y después publica lo que devuelve `pullDomainEvents()`, todo dentro de `transactions.run`: si `save` falla no se publica nada, y los eventos nunca salen dos veces.

```ts
import { ValueObjects } from '@archi-code/ddd/domain';
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import { UseCase } from '@archi-code/ddd/application';
import type { Clock, EventBus, TransactionRunner } from '@archi-code/ddd/application';
import { AggregateNotFoundException } from '@archi-code/ddd/exceptions';

interface AddOrderLineInput {
  orderId: string;
  sku: string;
  quantity: number;
  unitPrice: { amount: number; currency: string };
}

interface AddOrderLineCommand {
  orderId: OrderId;
  line: OrderLine;
}

export class AddOrderLine extends UseCase<AddOrderLineInput, AddOrderLineCommand, void> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly transactions: TransactionRunner,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: AddOrderLineInput): AddOrderLineCommand {
    return ValueObjects.build({
      orderId: () => new OrderId(input.orderId),
      line: () =>
        OrderLine.fromPrimitives({
          sku: input.sku,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
        }),
    });
  }

  protected handle(command: AddOrderLineCommand): Promise<void> {
    return this.transactions.run(async () => {
      const order = await this.orders.findById(command.orderId);
      if (order === null) {
        throw new AggregateNotFoundException('Order', command.orderId.value);
      }
      order.addLine(command.line, this.clock);
      await this.orders.save(order);
      await this.events.publish(order.pullDomainEvents());
    });
  }
}
```

Que el repositorio vacíe y guarde los eventos al guardar el agregado es una opción que los libros permiten. Con el paquete no: el repositorio solo obtiene y persiste, y el caso de uso llama a `events.publish(order.pullDomainEvents())` dentro de `transactions.run` `[Fuera de los libros: convención de @archi-code/ddd]`. Cambiar de memoria a outbox o a un broker cambia solo el `EventChannel` del cableado; el caso de uso no se toca. El repositorio con control de versión está en `ddd-skills/ddd-repositorios-persistencia/GUIA.md`.

## Probarlo en memoria

En los tests, `InMemoryEventChannel` guarda lo publicado en `channel.sent` (JSON congelado) y entrega a los listeners en cuanto se llama a `publish`:

```ts
import { describe, expect, it } from 'vitest';
import {
  AggregateMapper,
  DomainEventBus,
  FixedClock,
  InMemoryEventChannel,
  InMemoryRepository,
  InMemoryTransactionRunner,
} from '@archi-code/ddd/infrastructure';

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';
const customerId = '5c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f';

describe('Adding a line to an order', () => {
  it('publishes OrderLineAdded with the new total', async () => {
    const clock = new FixedClock('2026-03-01T09:30:00Z');
    const orders = new InMemoryRepository(AggregateMapper.of(Order));
    const transactions = new InMemoryTransactionRunner([orders]);
    const channel = new InMemoryEventChannel();
    const bus = new DomainEventBus<OrderEvent>(channel, orderEvents);
    const order = Order.place(
      new OrderId(orderId),
      new CustomerId(customerId),
      OrderLines.fromPrimitives({
        items: [{ sku: 'TORCH-01', quantity: 1, unitPrice: { amount: 4500, currency: 'EUR' } }],
      }),
      ShippingAddress.fromPrimitives({ street: 'Calle Mayor 1', city: 'Huelva', country: 'ES' }),
      clock,
    );
    await orders.save(order);

    await new AddOrderLine(orders, bus, transactions, clock).execute({
      orderId,
      sku: 'GLOVES-02',
      quantity: 2,
      unitPrice: { amount: 1250, currency: 'EUR' },
    });

    expect(channel.sent).toMatchObject([
      {
        eventName: 'OrderLineAdded',
        aggregateId: orderId,
        sku: 'GLOVES-02',
        quantity: 2,
        unitPrice: { amount: 1250, currency: 'EUR' },
        total: { amount: 7000, currency: 'EUR' },
        occurredOn: '2026-03-01T09:30:00.000Z',
      },
    ]);
  });
});
```

`Order`, sus value objects (`OrderId`, `CustomerId`, `OrderLine`, `OrderLines`, `Sku`, `Quantity`, `Money`, `ShippingAddress`) y `OrderEvent` son los de `ddd-skills/ddd-agregados/references/implementacion-ts.md`. `orderEvents` es el `EventRegistry` del contexto, con una fábrica por evento que pasa el JSON como metadatos (está en `ddd-skills/ddd-eventos-dominio/references/ejemplo-ecommerce.md`).

## Outbox: un `EventChannel` durable

El paquete no trae outbox: es una clase del proyecto que implementa `EventChannel`. Su `send` inserta las filas con la conexión de la transacción abierta por el runner; su `receive` delega en el canal que entregará después del commit.

### Tabla

`[Fuera de los libros: esquema propio; IDDD cap. 8 usa una tabla equivalente con id secuencial, tipo, cuerpo y fecha]`

```sql
CREATE TABLE stored_events (
  sequence      BIGSERIAL PRIMARY KEY,
  event_id      UUID        NOT NULL UNIQUE,
  aggregate_id  TEXT        NOT NULL,
  event_name    TEXT        NOT NULL,
  event_version INT         NOT NULL,
  occurred_on   TIMESTAMPTZ NOT NULL,
  body          JSONB       NOT NULL,
  published_at  TIMESTAMPTZ NULL
);
CREATE INDEX stored_events_unpublished ON stored_events (sequence) WHERE published_at IS NULL;
```

`sequence` conserva el orden causal dentro del contexto; `body` es el `SerializedEvent` que produjo `toJSON()`.

### El runner comparte la conexión

El puerto `TransactionRunner` solo tiene `run(work)` e `inTransaction()`. La conexión de la transacción abierta (el `current()` del runner de los libros) queda dentro del adaptador, que la comparte con `AsyncLocalStorage`; un `run` anidado se une al exterior, como el `InMemoryTransactionRunner` del paquete:

```ts
import { AsyncLocalStorage } from 'node:async_hooks';
import type { TransactionRunner } from '@archi-code/ddd/application';
import { InternalErrorException } from '@archi-code/ddd/exceptions';

interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number | null;
}

interface SqlClient {
  query(text: string, values?: unknown[]): Promise<QueryResult>;
}

interface PoolClient extends SqlClient {
  release(): void;
}

interface Pool {
  connect(): Promise<PoolClient>;
}

export class PgTransactionRunner implements TransactionRunner {
  private readonly open = new AsyncLocalStorage<SqlClient>();

  constructor(private readonly pool: Pool) {}

  inTransaction(): boolean {
    return this.open.getStore() !== undefined;
  }

  current(): SqlClient {
    const client = this.open.getStore();
    if (client === undefined) {
      throw new InternalErrorException('no transaction is open');
    }
    return client;
  }

  async run<Result>(work: () => Promise<Result>): Promise<Result> {
    if (this.inTransaction()) {
      return work();
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await this.open.run(client, work);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

### El canal

```ts
import type {
  ChannelHandler,
  ChannelSubscription,
  EventChannel,
} from '@archi-code/ddd/infrastructure';
import type { SerializedEvent } from '@archi-code/ddd/domain';

export class OutboxEventChannel implements EventChannel {
  constructor(
    private readonly transactions: PgTransactionRunner,
    private readonly delivery: EventChannel,
  ) {}

  async send(events: readonly SerializedEvent[]): Promise<void> {
    const db = this.transactions.current();
    for (const event of events) {
      await db.query(
        `INSERT INTO stored_events
           (event_id, aggregate_id, event_name, event_version, occurred_on, body)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          event.eventId,
          event.aggregateId,
          event.eventName,
          event.eventVersion,
          event.occurredOn,
          JSON.stringify(event),
        ],
      );
    }
  }

  receive(
    eventName: string,
    consumer: string,
    handler: ChannelHandler,
  ): Promise<ChannelSubscription> {
    return this.delivery.receive(eventName, consumer, handler);
  }
}
```

`current()` lanza si no hay transacción abierta: publicar fuera de `transactions.run` es un error que se ve enseguida.

## Reenviador

```ts
import type { EventChannel } from '@archi-code/ddd/infrastructure';
import type { SerializedEvent } from '@archi-code/ddd/domain';
import { InternalErrorException } from '@archi-code/ddd/exceptions';

export class OutboxForwarder {
  private static readonly lockKey = 8_201_001;

  constructor(
    private readonly pool: Pool,
    private readonly delivery: EventChannel,
  ) {}

  async forwardBatch(limit = 100): Promise<number> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [lock] } = await client.query(
        'SELECT pg_try_advisory_xact_lock($1) AS locked',
        [OutboxForwarder.lockKey],
      );
      if (lock.locked !== true) {
        await client.query('COMMIT');
        return 0;
      }
      const { rows } = await client.query(
        `SELECT sequence, body FROM stored_events WHERE published_at IS NULL
         ORDER BY sequence LIMIT $1`,
        [limit],
      );
      await this.delivery.send(rows.map((row) => row.body as SerializedEvent));
      await client.query(`UPDATE stored_events SET published_at = now() WHERE sequence = ANY($1)`, [
        rows.map((row) => row.sequence),
      ]);
      await client.query('COMMIT');
      return rows.length;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new InternalErrorException('forwarding stored events', { cause: error });
    } finally {
      client.release();
    }
  }
}
```

`body` es `JSONB` y el driver de Postgres lo devuelve ya como objeto: no se pasa por `JSON.parse`. El cierre consultivo de la transacción (`pg_try_advisory_xact_lock`) deja un solo reenviador entregando a la vez: si otra instancia, o una pasada del temporizador que se solapa con la anterior, leyera las filas siguientes mientras la primera aún entrega su lote, los eventos saldrían desordenados; la que no obtiene el cierre sale sin hacer nada `[Fuera de los libros: el cierre consultivo]`.

Si el proceso cae tras entregar y antes de marcar, o si un listener falla y el lote se deshace, los eventos se vuelven a enviar, también a los consumidores que ya los procesaron. Es la razón por la que los consumidores deben deduplicar [IDDD cap. 8]. Un evento que falla siempre bloquearía el lote: añade un contador de intentos y, pasado un límite, apártalo y avisa, para compensar o informar [IDDD cap. 10] `[Fuera de los libros: el contador y el límite]`.

Cada reacción corre en su transacción: el reenviador usa su propia conexión, fuera del `AsyncLocalStorage` del runner, así que el `transactions.run` del caso de uso que lanza un listener abre una transacción nueva [IDDD cap. 8].

## Cableado

El composition root elige los canales; los casos de uso y los listeners no cambian:

```ts
import { DomainEventBus, InMemoryEventChannel, SystemClock } from '@archi-code/ddd/infrastructure';

const transactions = new PgTransactionRunner(pool);
const delivery = new ContractPublishingChannel(broker, new InMemoryEventChannel());
const bus = new DomainEventBus<OrderEvent>(
  new OutboxEventChannel(transactions, delivery),
  orderEvents,
);
await bus.subscribe(
  new PrepareShipmentOnOrderLineAdded(
    new PrepareShipment(warehouse, new PostgresProcessedEvents(transactions), transactions),
  ),
);
const forwarder = new OutboxForwarder(pool, delivery);
setInterval(() => {
  forwarder.forwardBatch().catch((error) => console.error('forwarding stored events failed', error));
}, 1000);
const addOrderLine = new AddOrderLine(orders, bus, transactions, new SystemClock());
```

Un lote que falla se queda en el outbox y lo reintenta la pasada siguiente; el `catch` evita que el rechazo quede sin atender y tumbe el proceso de Node. Aquí `InMemoryEventChannel` solo entrega en proceso lo que el reenviador ya sacó del outbox, después del commit. Si los listeners viven en otro proceso, `delivery` es un canal de broker (el `RabbitMqEventChannel` de `ddd-skills/archi-code-ddd/patterns.md`).

## Lenguaje publicado en el adaptador del broker

Los otros contextos no reciben las clases ni el `toJSON()` del dominio: reciben un contrato versionado [IDDD cap. 13]. El paquete no trae esa traducción; se hace en el adaptador que habla con el broker, a partir del `SerializedEvent`, con `messageId` = `eventId`. Un evento interno no produce ningún mensaje, y durante una transición un evento puede producir un mensaje por versión del contrato:

```ts
import type {
  ChannelHandler,
  ChannelSubscription,
  EventChannel,
} from '@archi-code/ddd/infrastructure';
import type { SerializedEvent } from '@archi-code/ddd/domain';

interface Broker {
  publish(message: SerializedEvent, messageId: string): Promise<void>;
}

export class SalesContracts {
  static toPublished(event: SerializedEvent): SerializedEvent[] {
    const envelope = {
      eventVersion: 1,
      eventId: event.eventId,
      aggregateId: event.aggregateId,
      occurredOn: event.occurredOn,
    };
    switch (event.eventName) {
      case 'OrderPlaced':
        return [
          {
            ...envelope,
            eventName: 'sales.order.OrderPlaced',
            orderId: event.aggregateId,
            customerId: event.customerId,
            lines: (event.lines as OrderLineData[]).map((line) => ({
              sku: line.sku,
              quantity: line.quantity,
              unitPrice: SalesContracts.money(line.unitPrice),
            })),
            total: SalesContracts.money(event.total as MoneyData),
          },
        ];
      case 'OrderConfirmed':
        return [
          {
            ...envelope,
            eventName: 'sales.order.OrderConfirmed',
            orderId: event.aggregateId,
            total: SalesContracts.money(event.total as MoneyData),
          },
        ];
      default:
        return [];
    }
  }

  private static money(money: MoneyData): MoneyData {
    return { amount: money.amount, currency: money.currency };
  }
}

export class ContractPublishingChannel implements EventChannel {
  constructor(
    private readonly broker: Broker,
    private readonly inner: EventChannel,
  ) {}

  async send(events: readonly SerializedEvent[]): Promise<void> {
    for (const message of events.flatMap((event) => SalesContracts.toPublished(event))) {
      await this.broker.publish(message, message.eventId);
    }
    await this.inner.send(events);
  }

  receive(
    eventName: string,
    consumer: string,
    handler: ChannelHandler,
  ): Promise<ChannelSubscription> {
    return this.inner.receive(eventName, consumer, handler);
  }
}
```

`SalesContracts` decide qué eventos salen del contexto y con qué forma, campo a campo (`MoneyData` y `OrderLineData` son los de `ddd-skills/ddd-eventos-dominio/references/ejemplo-ecommerce.md`), para que un campo nuevo del evento interno no se filtre al contrato (ver "Eventos internos y eventos publicados" en `ddd-skills/ddd-eventos-dominio/GUIA.md`); el contrato no cambia cuando cambia el evento interno, solo cuando se publica una versión nueva. El mensaje es un `SerializedEvent` plano con el nombre y la versión del contrato (`sales.order.OrderPlaced`, v1), que el consumidor lee con su propia clase `EventBase` (`ddd-skills/ddd-context-mapping/references/anticorrupcion-ts.md`). `Broker` es la parte del driver que el adaptador usa, declarada de forma estructural.

## Consumidor idempotente

La entrega es al menos una vez, así que el consumidor se salta un `eventId` que ya procesó, y lo anota **en la misma transacción** que su cambio [IDDD cap. 8]. El paquete no trae inbox: es un puerto de la aplicación, implementado en infrastructure. El listener solo pasa el `eventId` al caso de uso (como en `ddd-skills/ddd-eventos-dominio/GUIA.md`, paso 3), y el caso de uso lo comprueba dentro de su `transactions.run`:

```ts
import { IdType, ValueObjects } from '@archi-code/ddd/domain';
import { UseCase } from '@archi-code/ddd/application';
import type { TransactionRunner } from '@archi-code/ddd/application';

export class EventId extends IdType<'EventId'> {}

export interface ProcessedEvents {
  markProcessed(consumer: string, eventId: EventId): Promise<boolean>;
}

export interface Warehouse {
  prepare(orderId: OrderId, sku: Sku, quantity: Quantity): Promise<void>;
}

interface PrepareShipmentInput {
  eventId: string;
  orderId: string;
  sku: string;
  quantity: number;
}

interface PrepareShipmentCommand {
  eventId: EventId;
  orderId: OrderId;
  sku: Sku;
  quantity: Quantity;
}

export class PrepareShipment extends UseCase<PrepareShipmentInput, PrepareShipmentCommand, void> {
  constructor(
    private readonly warehouse: Warehouse,
    private readonly processed: ProcessedEvents,
    private readonly transactions: TransactionRunner,
  ) {
    super();
  }

  protected toCommand(input: PrepareShipmentInput): PrepareShipmentCommand {
    return ValueObjects.build({
      eventId: () => new EventId(input.eventId),
      orderId: () => new OrderId(input.orderId),
      sku: () => new Sku(input.sku),
      quantity: () => new Quantity(input.quantity),
    });
  }

  protected handle(command: PrepareShipmentCommand): Promise<void> {
    return this.transactions.run(async () => {
      if (!(await this.processed.markProcessed('prepare-shipment', command.eventId))) {
        return;
      }
      await this.warehouse.prepare(command.orderId, command.sku, command.quantity);
    });
  }
}
```

```ts
export class PostgresProcessedEvents implements ProcessedEvents {
  constructor(private readonly transactions: PgTransactionRunner) {}

  async markProcessed(consumer: string, eventId: EventId): Promise<boolean> {
    const { rowCount } = await this.transactions
      .current()
      .query(
        `INSERT INTO processed_events (consumer, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [consumer, eventId.value],
      );
    return rowCount === 1;
  }
}
```

```sql
CREATE TABLE processed_events (
  consumer TEXT NOT NULL,
  event_id UUID NOT NULL,
  PRIMARY KEY (consumer, event_id)
);
```

`Warehouse.prepare` escribe en la misma base y con la misma transacción, así que la anotación y el efecto se confirman o se deshacen juntos. Cuando el efecto ya es idempotente por sí mismo (un método del agregado que registra un hecho, como `registerStockReservation` en `RegisterReservation`, que no hace nada si la reserva ya está registrada), basta con eso; un caso de uso que lanza un listener tampoco rechaza el hecho: si el agregado no existe, retorna en vez de lanzar `AggregateNotFoundException`, para que el canal no lo reentregue sin fin.

## Orden y causalidad

* El `sequence` de la tabla conserva el orden causal dentro del contexto [Destilado cap. 6], y el reenviador entrega en ese orden. Un mismo consumidor recibe los eventos de un `send` en su orden.
* El bus puede desordenar. Opciones `[Fuera de los libros]`: particionar por `aggregateId` (Kafka, sesiones de Service Bus, un consumidor activo por cola en RabbitMQ) para mantener el orden por agregado; o que el consumidor compare `occurredOn` o una versión y aparque los eventos que llegan antes que su causa [Destilado cap. 6 describe la responsabilidad del consumidor].
* Si un evento posterior hace irrelevante uno anterior, el consumidor puede ignorar el anterior [Destilado cap. 6].

## Despacho interno

Para políticas del mismo contexto se puede usar el mismo reenviador (más simple y robusto, como en el cableado de arriba) o un despachador en proceso que se ejecute **después** del commit. Nunca dentro de la transacción si la política modifica otro agregado [IDDD cap. 8]. `DomainEventBus` sobre `InMemoryEventChannel` entrega en el acto, dentro de la transacción del caso de uso que publica: solo sirve para tests y prototipos; con transacciones reales, el outbox de arriba `[Fuera de los libros: convención de @archi-code/ddd]`.

## Notificaciones por REST

Alternativa a un bus: exponer el event store como un log de notificaciones REST (actual y archivados), que los consumidores leen a su ritmo [IDDD cap. 8 y cap. 13]. Útil cuando los consumidores no comparten infraestructura de mensajería. La tabla `stored_events` ya tiene lo necesario: `sequence` para paginar y `body` para servir cada evento traducido con `SalesContracts`. Ver `ddd-skills/ddd-context-mapping/GUIA.md`.
