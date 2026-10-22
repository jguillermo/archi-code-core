# Implementar repositorios en TypeScript

Todos los ejemplos usan el agregado `Order` de `ddd-skills/ddd-agregados/references/implementacion-ts.md`, con sus value objects (`OrderId`, `CustomerId`, `OrderLines`, `OrderLine`, `Sku`, `Quantity`, `Money`, `ShippingAddress`, `OrderStatus`, `PaymentAuthorization`) y sus eventos: `Order.place(id, customerId, lines, address, clock)` lo crea pendiente con sus líneas, `addLine(line, clock)` añade una, y `toPrimitives()` y `static fromPrimitives()` son su conversión, la que llama el repositorio (ver `ddd-skills/ddd-agregados/GUIA.md`). El repositorio es código del proyecto en `infrastructure/persistence/` que implementa los roles del paquete.

## Qué se guarda

`[Fuera de los libros: esquema propio siguiendo IDDD cap. 6, valores embebidos en el registro del padre]`

`PrimitiveTypes<Order>` es la forma persistida: cada value object se convierte en su valor, cada composite en sus primitivos, un enum en su opción y las fechas siguen siendo `Date`. Para `Order`:

```ts
import type { PrimitiveTypes } from '@archi-code/ddd/domain';
import { Order, Status } from '../../domain/order/order';

const primitives: PrimitiveTypes<Order> = {
  id: '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c',
  customerId: '3f1d2c4b-5a6e-4f70-8b9c-0d1e2f3a4b5c',
  lines: { items: [{ sku: 'TORCH-01', quantity: 2, unitPrice: { amount: 4990, currency: 'EUR' } }] },
  shippingAddress: { street: 'Calle Mayor 1', city: 'Huelva', country: 'ES' },
  status: Status.Pending,
  stockReservation: null,
  paymentAuthorization: {
    paymentId: '0b8e4f2a-6c1d-4e7f-9a3b-5d2c8e1f4a6b',
    amount: { amount: 9980, currency: 'EUR' },
    expiresAt: new Date('2026-03-08T09:30:00Z'),
  },
};
```

Un documento (o una fila) por agregado: lectura rápida, sin joins, y la versión protege todo el agregado [IDDD cap. 10]. La versión se guarda **junto a** los primitivos, nunca dentro: el agregado no la declara y `PrimitiveTypes` la deja fuera `[Fuera de los libros: convención de @archi-code/ddd]`.

Convención de versiones del paquete: un agregado nuevo tiene `version` 0; al insertarlo se guarda con 1 y `markPersisted()` lo lleva a 1. Cada actualización exige que la versión almacenada coincida con `order.version`, guarda `order.version + 1` y llama a `markPersisted()`. Al cargar, el repositorio llama a `Order.fromPrimitives(primitives).restoreVersion(storedVersion)`. El repositorio llama a `markPersisted()` solo cuando la escritura se completó (en SQL, tras el `COMMIT`); si `save` lanza, el objeto conserva su versión y el caso de uso lo descarta y vuelve a cargarlo.

## Conversión

No se escribe un mapper: la conversión es del agregado, su único dueño (`toPrimitives()` y `static fromPrimitives()`, su instantánea o Memento), no de un servicio de dominio ni de un mapper hecho a mano, y no hay comprobación de forma en medio `[Fuera de los libros: convención de @archi-code/ddd]`. El repositorio llama al agregado directamente:

* Al escribir: guarda `order.toPrimitives()` con `order.version + 1` al lado y, tras escribir, llama a `order.markPersisted()`.
* Al leer: `Order.fromPrimitives(row).restoreVersion(row.version)`.
* En un conflicto: `throw new ConcurrencyException('Order', key, order.version)`, con el nombre del agregado como texto literal, no como nombre de clase: los minificadores cambian los nombres de las clases.

Nada comprueba en ejecución que la conversión esté completa. Lo garantizan el agregado y sus tests: el spec de cada agregado prueba el viaje de ida y vuelta (`Order.fromPrimitives(order.toPrimitives()).toPrimitives()` igual a `order.toPrimitives()`), y quien añade un campo lo añade a `toPrimitives()` y a `fromPrimitives()`, también un campo privado que TypeScript no ve en `PrimitiveTypes<Order>`.

Cada repositorio es único para su agregado y su constructor recibe solo las dependencias de su tecnología (la `collection` de MongoDB, el `pool` de Postgres, el `PrismaClient`), nunca la clase del agregado ni un mapper: los agregados solo entran y salen por `save(order)`, `remove(order)` y `findById(id)` `[Fuera de los libros: convención de @archi-code/ddd]`. `toPrimitives()`/`fromPrimitives()` son la única puerta de infraestructura al estado interno `[Fuera de los libros: convención de @archi-code/ddd]`; el repositorio nunca lee getters del agregado ni construye filas a mano. Los constructores de los value objects validan al cargar: un dato corrupto falla en `fromPrimitives` y no dentro del modelo.

## Repositorio con MongoDB

Un documento por agregado es el encaje natural de un almacén orientado a agregados [IDDD cap. 12]. Cada `save` y cada `remove` es una sola operación sobre un documento, atómica por sí misma, así que no necesita sesión ni transacción: la transacción es del repositorio y aquí no hace falta abrir ninguna (`ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`) `[Fuera de los libros: convención de @archi-code/ddd]`. El repositorio implementa los tres roles y envuelve los errores de escritura del driver con su causa:

```ts
import { MongoServerError } from 'mongodb';
import type { Collection } from 'mongodb';
import type {
  AggregateFinder,
  AggregateRemover,
  AggregateSaver,
  PrimitiveTypes,
} from '@archi-code/ddd/domain';
import { ConcurrencyException, InternalErrorException } from '@archi-code/ddd/exceptions';
import { Order, OrderId } from '../../domain/order/order';

export type OrderDocument = PrimitiveTypes<Order> & { _id: string; version: number };

const DUPLICATE_KEY = 11000;

export class MongoOrderRepository
  implements AggregateFinder<Order>, AggregateSaver<Order>, AggregateRemover<Order>
{
  constructor(private readonly collection: Collection<OrderDocument>) {}

  async findById(id: OrderId): Promise<Order | null> {
    const document = await this.collection.findOne({ _id: id.value });
    if (document === null) {
      return null;
    }
    const { _id, version, ...primitives } = document;
    return Order.fromPrimitives(primitives).restoreVersion(version);
  }

  async save(order: Order): Promise<void> {
    const document: OrderDocument = {
      ...order.toPrimitives(),
      _id: order.id.value,
      version: order.version + 1,
    };
    const written = await this.write(order, async () => {
      if (order.version === 0) {
        await this.collection.insertOne(document);
        return true;
      }
      const { matchedCount } = await this.collection.replaceOne(
        { _id: document._id, version: order.version },
        document,
      );
      return matchedCount === 1;
    });
    if (!written) {
      throw new ConcurrencyException('Order', order.id.value, order.version);
    }
    order.markPersisted();
  }

  async remove(order: Order): Promise<void> {
    const filter = { _id: order.id.value };
    const removed = await this.write(order, async () => {
      if (order.version === 0) {
        return (await this.collection.countDocuments(filter, { limit: 1 })) === 0;
      }
      const { deletedCount } = await this.collection.deleteOne({ ...filter, version: order.version });
      return deletedCount === 1;
    });
    if (!removed) {
      throw new ConcurrencyException('Order', order.id.value, order.version);
    }
  }

  private async write(order: Order, operation: () => Promise<boolean>): Promise<boolean> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof MongoServerError && error.code === DUPLICATE_KEY) {
        throw new ConcurrencyException('Order', order.id.value, order.version, {
          cause: error,
        });
      }
      throw new InternalErrorException(`writing order ${order.id.value}`, { cause: error });
    }
  }
}
```

* Alta (`version === 0`): `insertOne`; un `_id` ya ocupado (error 11000) es `ConcurrencyException` con el error del driver como `cause`.
* Cambio: `replaceOne` con la condición `{ _id, version: order.version }`; si no casa ningún documento, otro guardó antes.
* Un conflicto es `ConcurrencyException`: el caso de uso puede reintentar volviendo a cargar y a guardar, y `ExceptionClassifier` lo clasifica como `ExceptionKind.Conflict` (409 en HTTP), no como error interno.
* Borrado: `deleteOne` con la misma condición. Un agregado que nunca se guardó (versión 0) no tiene nada que borrar, salvo que su id ya esté ocupado: entonces es un conflicto, igual que en el `InMemoryOrderRepository` de los tests (`ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`).
* Cualquier otro error del driver al escribir es `InternalErrorException` con el error como `cause`.
* Cuidado con la serialización: IDDD advierte de que en estos almacenes hay que cuidar el formato serializado, que no es gratis [IDDD cap. 12]. Los primitivos son datos planos y `Date`, que el driver guarda tal cual.

## Con PostgreSQL

`[Fuera de los libros: esquema propio siguiendo IDDD cap. 6]`

```sql
CREATE TABLE orders (
  id           UUID        PRIMARY KEY,
  version      INT         NOT NULL,
  customer_id  UUID        NOT NULL,
  status       TEXT        NOT NULL,
  data         JSONB       NOT NULL
);
```

`data` guarda `PrimitiveTypes<Order>` entero; las columnas sueltas (`customer_id`, `status`) se duplican solo para indexar las consultas de lectura. Todo el agregado cabe en una fila, así que cada `save` es una sola sentencia, atómica por sí misma, sobre el pool. `PgPool` (la interfaz estructural de los métodos de `pg` que usa) y la variante con las líneas en otra tabla, donde el repositorio abre y confirma una transacción dentro de `save`, están en `ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`. Este adaptador solo implementa los roles que soporta:

```ts
import type { AggregateFinder, AggregateSaver, PrimitiveTypes } from '@archi-code/ddd/domain';
import { ConcurrencyException, InternalErrorException } from '@archi-code/ddd/exceptions';
import { Order, OrderId } from '../../domain/order/order';
import type { PgPool } from './pg-pool';

interface OrderRow {
  version: number;
  data: PrimitiveTypes<Order>;
}

export class PostgresOrderRepository implements AggregateFinder<Order>, AggregateSaver<Order> {
  constructor(private readonly pool: PgPool) {}

  async findById(id: OrderId): Promise<Order | null> {
    const { rows } = await this.pool.query<OrderRow>(
      'SELECT version, data FROM orders WHERE id = $1',
      [id.value],
    );
    return rows[0] ? Order.fromPrimitives(rows[0].data).restoreVersion(rows[0].version) : null;
  }

  async save(order: Order): Promise<void> {
    const primitives = order.toPrimitives();
    const write =
      order.version === 0
        ? this.pool.query(
            'INSERT INTO orders (id, version, customer_id, status, data) VALUES ($1, 1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
            [primitives.id, primitives.customerId, primitives.status, primitives],
          )
        : this.pool.query(
            'UPDATE orders SET version = version + 1, status = $3, data = $4 WHERE id = $1 AND version = $2',
            [primitives.id, order.version, primitives.status, primitives],
          );
    const { rowCount } = await write.catch((error: unknown) => {
      throw new InternalErrorException(`writing order ${order.id.value}`, { cause: error });
    });
    if (rowCount === 0) {
      throw new ConcurrencyException('Order', order.id.value, order.version);
    }
    order.markPersisted();
  }
}
```

Al leer `data` de `jsonb`, `paymentAuthorization.expiresAt` llega como texto ISO con zona, que `ExpiresAt` (un `DateType`) convierte.

## Con Prisma

`[Fuera de los libros]`
* El esquema de Prisma y su cliente viven en infraestructura. El repositorio implementa `AggregateFinder<Order>` y `AggregateSaver<Order>`, recibe el `PrismaClient` y devuelve agregados con `Order.fromPrimitives(row.data).restoreVersion(row.version)`, nunca modelos de Prisma.
* La concurrencia optimista con Prisma: `updateMany({ where: { id, version: order.version }, data: { ..., version: { increment: 1 } } })`; si `count === 0`, `ConcurrencyException('Order', order.id.value, order.version)`; si no, `order.markPersisted()`.
* Si el agregado ocupa varios modelos de Prisma, el repositorio agrupa sus escrituras con `prisma.$transaction(async (tx) => ...)` dentro de su propio `save`; la aplicación nunca la abre `[Fuera de los libros: convención de @archi-code/ddd]`.

## Consultas de lectura

Las selecciones no pasan por el repositorio: son interfaces de la capa de aplicación que devuelven DTOs o ids, implementadas en infraestructura directamente sobre la base de datos [IDDD cap. 12, "use case optimal query"] `[Fuera de los libros: convención de @archi-code/ddd]`. Los filtros se escriben con `@archi-code/criteria` sobre la forma persistida (`PrimitiveTypes<Order>`) y `@archi-code/criteria-adapters/mongodb` los ejecuta:

En `application/order-summaries/`:

```ts
import type { CustomerId } from '../../domain/order/order';

export interface OrderSummary {
  readonly id: string;
  readonly status: string;
  readonly lines: number;
}

export interface OrderSummaries {
  ofCustomer(
    customerId: CustomerId,
    page: { limit: number; offset: number },
  ): Promise<OrderSummary[]>;
}

export interface StaleOrders {
  ids(expiredBefore: Date, limit: number): Promise<string[]>;
}
```

En `infrastructure/persistence/`:

```ts
import { Criteria } from '@archi-code/criteria';
import { searchMongo } from '@archi-code/criteria-adapters/mongodb';
import type { Collection } from 'mongodb';
import type { PrimitiveTypes } from '@archi-code/ddd/domain';
import { Status } from '../../domain/order/order';
import type { CustomerId, Order } from '../../domain/order/order';
import type { OrderSummaries, OrderSummary, StaleOrders } from '../../application/order-summaries/order-summaries';
import type { OrderDocument } from './mongo-order-repository';

export class MongoOrderSummaries implements OrderSummaries {
  constructor(private readonly collection: Collection<OrderDocument>) {}

  async ofCustomer(
    customerId: CustomerId,
    page: { limit: number; offset: number },
  ): Promise<OrderSummary[]> {
    const { items } = await searchMongo<PrimitiveTypes<Order>, OrderDocument>(
      this.collection,
      Criteria.create<PrimitiveTypes<Order>>({
        where: { customerId: customerId.value },
        orderBy: { id: 'asc' },
        limit: page.limit,
        offset: page.offset,
      }),
    );
    return items.map((order) => ({
      id: order.id,
      status: order.status,
      lines: order.lines.items.length,
    }));
  }
}

export class MongoStaleOrders implements StaleOrders {
  constructor(private readonly collection: Collection<OrderDocument>) {}

  async ids(expiredBefore: Date, limit: number): Promise<string[]> {
    const { items } = await searchMongo<PrimitiveTypes<Order>, OrderDocument>(
      this.collection,
      Criteria.create<PrimitiveTypes<Order>>({
        where: {
          status: Status.Pending,
          'paymentAuthorization.expiresAt': { lt: expiredBefore },
        },
        orderBy: { 'paymentAuthorization.expiresAt': 'asc' },
        limit,
      }),
    );
    return items.map((order) => order.id);
  }
}
```

`T` es la forma persistida, no el agregado: la consulta nunca construye un `Order`. Un proceso por tiempo (pedidos pendientes cuya autorización de pago ha caducado) pide los ids a `StaleOrders` y ejecuta un caso de uso por agregado.

## Jerarquías de tipos

IDDD trata repositorios compartidos por subtipos y sus complicaciones [IDDD cap. 12]. Antes de diseñar una jerarquía de agregados, revisa si un tipo estándar (value object de estado o tipo, como `OrderStatus`) basta. Cada repositorio reconstruye una clase concreta con su `fromPrimitives`.
