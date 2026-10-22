# La transacción es del repositorio

El dominio nunca es el lugar para gestionar transacciones; sus operaciones son demasiado finas y no deben saber que existen. Los libros las sitúan en la capa de aplicación, a menudo con una fachada transaccional o de forma declarativa [IDDD cap. 12; PHP: Repositories, "Managing Transactions"].

Con el paquete la transacción baja un nivel más: es del repositorio, igual que todo lo demás de la persistencia `[Fuera de los libros: convención de @archi-code/ddd]`. La aplicación nunca abre, une ni cierra transacciones y no hay ningún puerto para hacerlo. Un caso de uso recibe solo los roles del repositorio que usa (`AggregateFinder`, `AggregateSaver`, `AggregateRemover`), el `EventBus`, el `Clock` y sus puertos propios; nunca una dependencia `transactions`, `unitOfWork` o parecida.

## Por qué basta con el repositorio

Un caso de uso modifica un solo agregado y lo guarda una vez [IDDD cap. 10]. El agregado es el límite de consistencia, así que la "transacción por agregado" de los libros se traduce en **una escritura atómica por agregado, garantizada por el repositorio** `[Fuera de los libros: convención de @archi-code/ddd]`. No queda nada que la aplicación tenga que envolver: cargar es una lectura, y `save` o `remove` es una sola escritura atómica.

Lo que hace el adaptador del repositorio, y nadie más:

* Que cada `save` y cada `remove` sea atómico. En MongoDB, un documento por agregado: una sola escritura, atómica por sí misma. Si el agregado ocupa varias tablas SQL, el repositorio abre la transacción de la base de datos **dentro** de `save`/`remove`, con su propia conexión o sesión, y la confirma o la revierte antes de volver.
* La versión de concurrencia optimista, que es solo suya: recuerda la de cada agregado que cargó o guardó en un `WeakMap<Order, number>` privado (`versions`; `0` si no lo conoce, es nuevo). Una versión almacenada distinta de la recordada (o un id ya ocupado al dar de alta) es `ConcurrencyException('Order', order.id.value, version)`.
* La conexión, la sesión y el pool.
* Envolver los errores del driver en `InternalErrorException` con `{ cause }`.
* `this.versions.set(order, version + 1)` solo tras escribir con éxito y, al cargar, `Order.fromPrimitives(...)` seguido de `this.versions.set(order, row.version)`. El agregado no declara ni mapea la versión y el caso de uso nunca la ve.

## Varias tablas en PostgreSQL

`[Fuera de los libros: esquema propio siguiendo IDDD cap. 6]`

Si las líneas del pedido viven en su propia tabla, guardar el pedido son varias sentencias, y el repositorio las agrupa en una transacción de la base de datos dentro de `save`. `SqlConnection` y `PgPool` describen, de forma estructural, los métodos de `pg` que usa; en `infrastructure/persistence/pg-pool.ts`:

```ts
export interface SqlConnection {
  query<Row>(text: string, values?: unknown[]): Promise<{ rows: Row[]; rowCount: number | null }>;
}

export interface PgPool extends SqlConnection {
  connect(): Promise<SqlConnection & { release(destroy?: boolean): void }>;
}
```

```sql
CREATE TABLE orders (
  id           UUID        PRIMARY KEY,
  version      INT         NOT NULL,
  customer_id  UUID        NOT NULL,
  status       TEXT        NOT NULL,
  data         JSONB       NOT NULL
);

CREATE TABLE order_lines (
  order_id     UUID        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  position     INT         NOT NULL,
  sku          TEXT        NOT NULL,
  quantity     INT         NOT NULL,
  unit_price   JSONB       NOT NULL,
  PRIMARY KEY (order_id, position)
);
```

En `infrastructure/persistence/postgres-order-repository.ts`:

```ts
import type { AggregateFinder, AggregateSaver, PrimitiveTypes } from '@archi-code/ddd/domain';
import { ConcurrencyException, InternalErrorException } from '@archi-code/ddd/exceptions';
import { Order, OrderId } from '../../domain/order/order';
import type { PgPool } from './pg-pool';

type OrderPrimitives = PrimitiveTypes<Order>;

interface OrderRow {
  version: number;
  data: Omit<OrderPrimitives, 'lines'>;
  items: OrderPrimitives['lines']['items'];
}

export class PostgresOrderRepository implements AggregateFinder<Order>, AggregateSaver<Order> {
  private readonly versions = new WeakMap<Order, number>();

  constructor(private readonly pool: PgPool) {}

  async findById(id: OrderId): Promise<Order | null> {
    const { rows } = await this.pool.query<OrderRow>(
      `SELECT o.version, o.data,
              COALESCE(
                json_agg(
                  json_build_object('sku', l.sku, 'quantity', l.quantity, 'unitPrice', l.unit_price)
                  ORDER BY l.position
                ) FILTER (WHERE l.order_id IS NOT NULL),
                '[]'
              ) AS items
         FROM orders o
         LEFT JOIN order_lines l ON l.order_id = o.id
        WHERE o.id = $1
        GROUP BY o.id`,
      [id.value],
    );
    const row = rows[0];
    if (row === undefined) {
      return null;
    }
    const order = Order.fromPrimitives({ ...row.data, lines: { items: row.items } });
    this.versions.set(order, row.version);
    return order;
  }

  async save(order: Order): Promise<void> {
    const version = this.versions.get(order) ?? 0;
    const { lines, ...data } = order.toPrimitives();
    const client = await this.pool.connect();
    let broken = false;
    try {
      await client.query('BEGIN');
      const { rowCount } =
        version === 0
          ? await client.query(
              'INSERT INTO orders (id, version, customer_id, status, data) VALUES ($1, 1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
              [data.id, data.customerId, data.status, data],
            )
          : await client.query(
              'UPDATE orders SET version = version + 1, status = $3, data = $4 WHERE id = $1 AND version = $2',
              [data.id, version, data.status, data],
            );
      if (rowCount === 0) {
        throw new ConcurrencyException('Order', order.id.value, version);
      }
      await client.query('DELETE FROM order_lines WHERE order_id = $1', [data.id]);
      for (const [position, line] of lines.items.entries()) {
        await client.query(
          'INSERT INTO order_lines (order_id, position, sku, quantity, unit_price) VALUES ($1, $2, $3, $4, $5)',
          [data.id, position, line.sku, line.quantity, line.unitPrice],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {
        broken = true;
      });
      if (error instanceof ConcurrencyException) {
        throw error;
      }
      throw new InternalErrorException(`writing order ${order.id.value}`, { cause: error });
    } finally {
      client.release(broken);
    }
    this.versions.set(order, version + 1);
  }
}
```

* La transacción empieza y termina dentro de `save`: el caso de uso solo ve una escritura que se hace entera o no se hace.
* El `UPDATE` con `version = $2` bloquea la fila del pedido hasta el `COMMIT`; otro `save` del mismo pedido espera y después no casa ninguna fila, así que recibe `ConcurrencyException`.
* `this.versions.set(order, version + 1)` se hace solo después del `COMMIT`: si la transacción se revierte, el repositorio sigue recordando la versión anterior y el caso de uso puede descartar el objeto y volver a cargarlo.
* Si el `ROLLBACK` falla (la conexión se cayó), se relanza el error del trabajo, no el del `ROLLBACK`, y `release(true)` destruye la conexión en vez de devolver al pool una con la transacción a medias.
* La lectura es una sola sentencia, así que ve el pedido y sus líneas en el mismo instante.
* Un `remove` sigue el mismo patrón: `DELETE FROM orders WHERE id = $1 AND version = $2` dentro de su propia transacción (las líneas caen con `ON DELETE CASCADE`).

Con MongoDB no hace falta nada de esto: el pedido es un documento y `replaceOne` lo escribe de forma atómica (`MongoOrderRepository` en `ddd-skills/ddd-repositorios-persistencia/references/implementacion-ts.md`).

## Eventos y guardado

El caso de uso guarda y después publica: `await this.orders.save(order)` y `await this.events.publish(order.pullDomainEvents())`. Si `publish` falla después de `save`, el cambio queda guardado y el evento puede perderse.

Cuando un evento no puede perderse, el repositorio escribe el agregado y sus eventos pendientes en la misma escritura atómica (una bandeja de salida, *outbox*, dentro del mismo documento o en la misma transacción de `save`), y un proceso aparte (*relay*) los entrega después a través de un `EventChannel` `[Fuera de los libros: convención de @archi-code/ddd]`. En el repositorio de PostgreSQL de arriba es una sentencia más antes del `COMMIT`:

```ts
for (const event of order.pullDomainEvents()) {
  await client.query('INSERT INTO order_outbox (event_id, body) VALUES ($1, $2)', [
    event.eventId,
    { ...event },
  ]);
}
```

El repositorio toma los eventos con `pullDomainEvents()`, así que el `publish` posterior del caso de uso recibe una lista vacía y no envía nada: los casos de uso no cambian. Es persistencia, así que pertenece al adaptador del repositorio.

## Uso en un caso de uso

El caso de uso carga, cambia, guarda y publica, sin abrir nada. Si el comando es seguro de repetir contra el estado recargado, la aplicación puede reintentar una o dos veces ante `ConcurrencyException`; si no, el conflicto llega al usuario como 409 [IDDD cap. 10; IDDD apéndice A]. Cada intento vuelve a cargar y vuelve a guardar dentro de `handle`, en un bucle con límite `[Fuera de los libros: convención de @archi-code/ddd]`. Un caso de uso que ejecuta un listener no reintenta por su cuenta: reintenta la reentrega del canal.

```ts
import { UseCase, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import { AggregateNotFoundException, ConcurrencyException } from '@archi-code/ddd/exceptions';
import { Order, OrderId, OrderLine } from '../../domain/order/order';
import type { OrderEvent } from '../../domain/order/order';

export interface AddOrderLineInput {
  orderId: string;
  sku: string;
  quantity: number;
  unitPrice: { amount: number; currency: string };
}

interface AddOrderLineCommand {
  orderId: OrderId;
  line: OrderLine;
}

const ATTEMPTS = 3;

export class AddOrderLine extends UseCase<AddOrderLineInput, AddOrderLineCommand, void> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: AddOrderLineInput): AddOrderLineCommand {
    return ValueObjectBuilder.build({
      orderId: () => new OrderId(input.orderId),
      line: () =>
        OrderLine.fromPrimitives({
          sku: input.sku,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
        }),
    });
  }

  protected async handle(command: AddOrderLineCommand): Promise<void> {
    for (let attempt = 1; ; attempt += 1) {
      const order = await this.orders.findById(command.orderId);
      if (order === null) {
        throw new AggregateNotFoundException('Order', command.orderId.value);
      }
      order.addLine(command.line, this.clock);
      try {
        await this.orders.save(order);
      } catch (error) {
        if (error instanceof ConcurrencyException && attempt < ATTEMPTS) {
          continue;
        }
        throw error;
      }
      await this.events.publish(order.pullDomainEvents());
      return;
    }
  }
}
```

`AggregateNotFoundException` la lanza el caso de uso, no el repositorio: `findById` devuelve `null`. Solo se reintenta el `save`: un error de `publish` no vuelve a guardar el pedido.

## En tests

Los tests de la aplicación usan el `InMemoryOrderRepository` que el proyecto escribe en `test/support/` (`ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`) y un `DomainEventBus` sobre `InMemoryEventChannel`; no hay nada que revertir ni que contar, porque cada `save` del repositorio en memoria es atómico y comprueba la versión igual que uno real. En `test/contexts/sales/application/add-order-line.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  DomainEventBus,
  EventRegistry,
  FixedClock,
  InMemoryEventChannel,
} from '@archi-code/ddd/infrastructure';
import { AddOrderLine } from '../../../../src/contexts/sales/application/add-order-line/add-order-line';
import {
  CustomerId,
  Order,
  OrderId,
  OrderLines,
  ShippingAddress,
} from '../../../../src/contexts/sales/domain/order/order';
import type { OrderEvent } from '../../../../src/contexts/sales/domain/order/order';
import { InMemoryOrderRepository } from '../../../support/in-memory-order-repository';

describe('Two customers add a line to the same order at once', () => {
  it('the second one retries with the reloaded order and both lines are kept', async () => {
    const clock = new FixedClock('2026-03-01T09:30:00Z');
    const orders = new InMemoryOrderRepository();
    const channel = new InMemoryEventChannel();
    const addOrderLine = new AddOrderLine(
      orders,
      new DomainEventBus<OrderEvent>(channel, new EventRegistry<OrderEvent>()),
      clock,
    );
    const order = Order.place(
      OrderId.generate(),
      CustomerId.generate(),
      OrderLines.fromPrimitives({
        items: [{ sku: 'TORCH-01', quantity: 2, unitPrice: { amount: 4990, currency: 'EUR' } }],
      }),
      ShippingAddress.fromPrimitives({ street: 'Calle Mayor 1', city: 'Huelva', country: 'ES' }),
      clock,
    );
    await orders.save(order);
    const unitPrice = { amount: 1990, currency: 'EUR' };

    await Promise.all([
      addOrderLine.execute({ orderId: order.id.value, sku: 'HELMET-02', quantity: 1, unitPrice }),
      addOrderLine.execute({ orderId: order.id.value, sku: 'GLOVES-03', quantity: 1, unitPrice }),
    ]);

    const stored = await orders.findById(order.id);
    expect(stored?.toPrimitives().lines.items).toHaveLength(3);
    expect(channel.sent).toMatchObject([
      { eventName: 'OrderLineAdded', sku: 'HELMET-02' },
      { eventName: 'OrderLineAdded', sku: 'GLOVES-03' },
    ]);
  });
});
```

Los dos casos de uso cargan el pedido en la versión 1; el primero guarda, el segundo recibe `ConcurrencyException`, vuelve a cargar y guarda sobre la versión 2. La atomicidad de un repositorio real (sus varias tablas, su outbox) se prueba en su propio spec, con la suite de contrato de `ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md` contra la base de datos de verdad.
