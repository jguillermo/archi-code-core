# Transacciones en Node sin meterlas en el dominio

El dominio nunca es el lugar para gestionar transacciones; sus operaciones son demasiado finas y no deben saber que existen. Las gestiona la capa de aplicación, a menudo con una fachada transaccional o de forma declarativa [IDDD cap. 12; PHP: Repositories, "Managing Transactions"].

## El puerto TransactionRunner

El paquete declara el puerto; el proyecto no escribe el suyo:

```ts
import type { TransactionRunner } from '@archi-code/ddd/application';
```

* `run<Result>(work: () => Promise<Result>): Promise<Result>` abre la transacción, ejecuta `work`, confirma y devuelve su resultado, o revierte y relanza si `work` lanza. Un `run` dentro de otro se une al abierto.
* `inTransaction(): boolean` dice si hay una transacción abierta en el flujo asíncrono actual.
* No hay `current()` en el puerto `[Fuera de los libros: convención de @archi-code/ddd]`: la conexión o la sesión en curso es un detalle de tu adaptador, que solo usan los repositorios del mismo adaptador. Los casos de uso solo ven `run` e `inTransaction()`.

## Adaptador con MongoDB y AsyncLocalStorage

`[Fuera de los libros: técnica de Node]`

Código del proyecto en `infrastructure/persistence/`; `MongoOrderRepository` (en `ddd-skills/ddd-repositorios-persistencia/references/implementacion-ts.md`) pasa `{ session: transactions.current() }` a cada operación:

```ts
import { AsyncLocalStorage } from 'node:async_hooks';
import type { ClientSession, MongoClient } from 'mongodb';
import type { TransactionRunner } from '@archi-code/ddd/application';

export class MongoTransactionRunner implements TransactionRunner {
  private readonly sessions = new AsyncLocalStorage<ClientSession>();

  constructor(private readonly client: MongoClient) {}

  inTransaction(): boolean {
    return this.sessions.getStore() !== undefined;
  }

  current(): ClientSession | undefined {
    return this.sessions.getStore();
  }

  async run<Result>(work: () => Promise<Result>): Promise<Result> {
    if (this.inTransaction()) {
      return work();
    }
    const session = this.client.startSession();
    try {
      session.startTransaction();
      const result = await this.sessions.run(session, work);
      await session.commitTransaction();
      return result;
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
```

Las transacciones de MongoDB necesitan un replica set. No uses `session.withTransaction(work)` aquí: reintenta `work` entero ante errores transitorios, y con él el `publish` de los eventos.

## Adaptador con PostgreSQL

El mismo patrón con `BEGIN`/`COMMIT` sobre una conexión del pool. `SqlConnection` y `PgPool` describen, de forma estructural, los métodos de `pg` que usa:

```ts
import { AsyncLocalStorage } from 'node:async_hooks';
import type { TransactionRunner } from '@archi-code/ddd/application';

export interface SqlConnection {
  query<Row>(text: string, values?: unknown[]): Promise<{ rows: Row[]; rowCount: number | null }>;
}

export interface PgPool extends SqlConnection {
  connect(): Promise<SqlConnection & { release(destroy?: boolean): void }>;
}

export class PgTransactionRunner implements TransactionRunner {
  private readonly connections = new AsyncLocalStorage<SqlConnection>();

  constructor(private readonly pool: PgPool) {}

  inTransaction(): boolean {
    return this.connections.getStore() !== undefined;
  }

  current(): SqlConnection {
    return this.connections.getStore() ?? this.pool;
  }

  async run<Result>(work: () => Promise<Result>): Promise<Result> {
    if (this.inTransaction()) {
      return work();
    }
    const connection = await this.pool.connect();
    let broken = false;
    try {
      await connection.query('BEGIN');
      const result = await this.connections.run(connection, work);
      await connection.query('COMMIT');
      return result;
    } catch (error) {
      await connection.query('ROLLBACK').catch(() => {
        broken = true;
      });
      throw error;
    } finally {
      connection.release(broken);
    }
  }
}
```

`current()` fuera de una transacción devuelve el pool, para lecturas sueltas. Si el `ROLLBACK` falla (la conexión se cayó), se relanza el error del trabajo, no el del `ROLLBACK`, y `release(true)` destruye la conexión en vez de devolver al pool una con la transacción a medias.

## Uso en un caso de uso

El caso de uso abre la transacción con el puerto y dentro carga, cambia, guarda y publica. Si el comando es seguro de repetir contra el estado recargado, la aplicación puede reintentar una o dos veces ante `ConcurrencyException`; si no, el conflicto llega al usuario como 409 [IDDD cap. 10; IDDD apéndice A]. Cada intento es un `run` nuevo que vuelve a cargar el agregado, y nunca se reintenta dentro de una transacción exterior (`inTransaction()` tras el fallo): un `run` anidado se une a ella, así que reintenta quien la abrió o la reentrega del canal.

```ts
import { UseCase } from '@archi-code/ddd/application';
import type { Clock, EventBus, TransactionRunner } from '@archi-code/ddd/application';
import { ValueObjects } from '@archi-code/ddd/domain';
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

  protected async handle(command: AddOrderLineCommand): Promise<void> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.transactions.run(async () => {
          const order = await this.orders.findById(command.orderId);
          if (order === null) {
            throw new AggregateNotFoundException('Order', command.orderId.value);
          }
          order.addLine(command.line, this.clock);
          await this.orders.save(order);
          await this.events.publish(order.pullDomainEvents());
        });
      } catch (error) {
        const retry =
          error instanceof ConcurrencyException &&
          attempt < ATTEMPTS &&
          !this.transactions.inTransaction();
        if (!retry) {
          throw error;
        }
      }
    }
  }
}
```

`AggregateNotFoundException` la lanza el caso de uso, no el repositorio: `findById` devuelve `null`.

## En tests

`InMemoryTransactionRunner` (de `@archi-code/ddd/infrastructure`) implementa el puerto en memoria: recibe los participantes que debe restaurar (`InMemoryRepository` lo es) y, si el trabajo lanza, los devuelve al estado de antes en orden inverso. `committed` y `rolledBack` cuentan las transacciones; un `run` dentro de otro se une, y dos que se solapan en el tiempo esperan su turno. `new InMemoryTransactionRunner()` sin participantes sirve cuando no hay nada que revertir. En `test/contexts/sales/application/transactions.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  AggregateMapper,
  FixedClock,
  InMemoryRepository,
  InMemoryTransactionRunner,
} from '@archi-code/ddd/infrastructure';
import {
  CustomerId,
  Order,
  OrderId,
  OrderLines,
  ShippingAddress,
} from '../../../../src/contexts/sales/domain/order/order';

describe('A transaction that fails', () => {
  it('leaves the order as it was before the work started', async () => {
    const clock = new FixedClock('2026-03-01T09:30:00Z');
    const orders = new InMemoryRepository(AggregateMapper.of(Order));
    const transactions = new InMemoryTransactionRunner([orders]);
    const order = Order.place(
      OrderId.generate(),
      CustomerId.generate(),
      OrderLines.fromPrimitives({
        items: [{ sku: 'TORCH-01', quantity: 2, unitPrice: { amount: 4990, currency: 'EUR' } }],
      }),
      ShippingAddress.fromPrimitives({ street: 'Calle Mayor 1', city: 'Huelva', country: 'ES' }),
      clock,
    );

    await expect(
      transactions.run(async () => {
        await orders.save(order);
        throw new Error('payment gateway down');
      }),
    ).rejects.toThrow('payment gateway down');

    expect(await orders.findById(order.id)).toBeNull();
    expect(transactions.rolledBack).toBe(1);
  });
});
```
