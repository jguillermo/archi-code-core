# Transacciones en Node sin meterlas en el dominio

El dominio nunca es el lugar para gestionar transacciones; sus operaciones son demasiado finas y no deben saber que existen. Las gestiona la capa de aplicación, a menudo con una fachada transaccional o de forma declarativa [IDDD cap. 12; PHP: Repositories, "Managing Transactions"].

## TransactionRunner con AsyncLocalStorage

`[Fuera de los libros: técnica de Node]`

```ts
import { AsyncLocalStorage } from 'node:async_hooks';
import { Pool, PoolClient } from 'pg';

export interface TransactionRunner {
  run<T>(work: () => Promise<T>): Promise<T>;
  current(): Queryable;
}

export class PgTransactionRunner implements TransactionRunner {
  private readonly als = new AsyncLocalStorage<PoolClient>();
  constructor(private readonly pool: Pool) {}

  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.als.getStore()) return work();               // transacción ya abierta: se reutiliza
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await this.als.run(client, work);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  current(): Queryable {
    return this.als.getStore() ?? this.pool;               // fuera de transacción: lecturas sueltas
  }
}
```

`TransactionRunner` es un puerto de la capa de aplicación; `PgTransactionRunner`, un adaptador.

## Uso en un caso de uso

```ts
export class CancelOrder {
  constructor(private readonly orders: OrderRepository, private readonly tx: TransactionRunner) {}

  execute(cmd: CancelOrderCommand): Promise<void> {
    return this.tx.run(async () => {
      const order = await this.orders.byId(OrderId.of(cmd.orderId));
      if (!order) throw new OrderNotFound(cmd.orderId);
      order.cancel(CancellationReason.of(cmd.reason));
      await this.orders.save(order);
    });
  }
}
```

## Reintentos ante conflicto de versión

Si el comando es seguro de repetir contra el estado recargado, la aplicación puede reintentar una o dos veces ante `ConcurrencyConflict`. Si no, devuelve un error comprensible al usuario [IDDD cap. 10; IDDD apéndice A].
