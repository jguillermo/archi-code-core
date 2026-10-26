# Implementar repositorios en TypeScript

Todos los ejemplos usan el agregado `Order` de `ddd-skills/ddd-agregados/references/implementacion-ts.md`, con sus value objects (`OrderId`, `CustomerId`, `OrderLines`, `OrderLine`, `Sku`, `Quantity`, `Money`, `ShippingAddress`, `OrderStatusType`, `PaymentAuthorization`) y sus eventos: `Order.create(id, customerId, lines, shippingAddress, clock)` lo crea pendiente con sus líneas, `addLine(line, clock)` añade una, y `toPrimitives()` y `static fromPrimitives()` son su conversión, la que llama el repositorio (ver `ddd-skills/ddd-agregados/GUIA.md`). El dominio declara su repositorio abstracto en `domain/repository/OrderRepository.ts`; como los pedidos se borran, declara los tres verbos, cada uno el método del rol del paquete que implementa `[Fuera de los libros: convención de @archi-code/ddd]`:

```ts
import { AggregateRepository } from '@archi-code/ddd/domain';
import type { AggregateFinder, AggregateRemover, AggregateSaver } from '@archi-code/ddd/domain';
import type { Order } from '../aggregate/Order';
import type { OrderId } from '../value-object/OrderId';

export abstract class OrderRepository
  extends AggregateRepository<Order>
  implements AggregateFinder<Order>, AggregateSaver<Order>, AggregateRemover<Order>
{
  abstract findById(id: OrderId): Promise<Order | null>;
  abstract save(order: Order): Promise<void>;
  abstract remove(order: Order): Promise<void>;
}
```

Cada adaptador es código del proyecto en `infrastructure/persistence/<tecnología>-order-repository.ts` que extiende `OrderRepository` e implementa exactamente esos verbos, ni más ni menos.

## Qué se guarda

`[Fuera de los libros: esquema propio siguiendo IDDD cap. 6, valores embebidos en el registro del padre]`

`PrimitiveTypes<Order>` es la forma persistida: cada value object se convierte en su valor, cada composite en sus primitivos, un enum en su opción y las fechas siguen siendo `Date`. Para `Order`:

```ts
import type { PrimitiveTypes } from '@archi-code/ddd/domain';
import type { Order } from '../../domain/aggregate/Order';
import { OrderStatus } from '../../domain/value-object/OrderStatusType';

const primitives: PrimitiveTypes<Order> = {
  id: '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c',
  customerId: '3f1d2c4b-5a6e-4f70-8b9c-0d1e2f3a4b5c',
  lines: { items: [{ sku: 'TORCH-01', quantity: 2, unitPrice: { amount: 4990, currency: 'EUR' } }] },
  shippingAddress: { street: 'Calle Mayor 1', city: 'Huelva', country: 'ES' },
  status: OrderStatus.PENDING,
  stockReservation: null,
  paymentAuthorization: {
    paymentId: '0b8e4f2a-6c1d-4e7f-9a3b-5d2c8e1f4a6b',
    amount: { amount: 9980, currency: 'EUR' },
    expiresAt: new Date('2026-03-08T09:30:00Z'),
  },
  createdAt: new Date('2026-03-01T09:30:00Z'),
  updatedAt: new Date('2026-03-01T09:45:00Z'),
};
```

Un documento (o una fila) por agregado: lectura rápida, sin joins, y la versión protege todo el agregado [IDDD cap. 10]. La versión se guarda **junto a** los primitivos, nunca dentro: el agregado no la declara ni la mapea, y el caso de uso nunca la ve `[Fuera de los libros: convención de @archi-code/ddd]`.

Convención de versiones del paquete: la versión es solo del repositorio. Cada repositorio recuerda la versión de cada agregado que cargó o guardó en un campo privado `versions = new WeakMap<Order, number>()`. Al cargar, `this.versions.set(order, row.version)`. Al guardar, `const version = this.versions.get(order) ?? 0` (`0` es un agregado nuevo): escribe solo donde la versión almacenada es `version` (un agregado nuevo se inserta y un id ya ocupado es un conflicto), guarda `version + 1` junto a los primitivos y, solo cuando la escritura se completó (en SQL, tras el `COMMIT`), hace `this.versions.set(order, version + 1)`. Si `save` lanza, el repositorio sigue recordando la versión anterior y el caso de uso descarta el objeto y vuelve a cargarlo. `remove` comprueba la versión igual. Al ser un `WeakMap`, un agregado que nadie usa ya no retiene memoria `[Fuera de los libros: convención de @archi-code/ddd]`.

## Conversión

No se escribe un mapper: la conversión es del agregado, su único dueño (`toPrimitives()` y `static fromPrimitives()`, su instantánea o Memento), no de un servicio de dominio ni de un mapper hecho a mano, y no hay comprobación de forma en medio `[Fuera de los libros: convención de @archi-code/ddd]`. El repositorio llama al agregado directamente:

* Al escribir: guarda `order.toPrimitives()` con `version + 1` al lado (`version` es la que recuerda su `WeakMap`, `0` si es nuevo) y, tras escribir, `this.versions.set(order, version + 1)`.
* Al leer: `const order = Order.fromPrimitives(row.primitives)` y `this.versions.set(order, row.version)`.
* En un conflicto: `throw new ConcurrencyException('Order', key, version)`, con el nombre del agregado como texto literal, no como nombre de clase: los minificadores cambian los nombres de las clases.

Nada comprueba en ejecución que la conversión esté completa. Lo garantizan el agregado y sus tests: el spec de cada agregado prueba el viaje de ida y vuelta (`Order.fromPrimitives(order.toPrimitives()).toPrimitives()` igual a `order.toPrimitives()`), y quien añade un campo lo añade a `toPrimitives()` y a `fromPrimitives()`, también un campo privado que TypeScript no ve en `PrimitiveTypes<Order>`.

Cada repositorio es único para su agregado y su constructor recibe solo las dependencias de su tecnología (la `collection` de MongoDB, el `pool` de Postgres, el `PrismaClient`), nunca la clase del agregado ni un mapper: los agregados solo entran y salen por `save(order)`, `remove(order)` y `findById(id)` `[Fuera de los libros: convención de @archi-code/ddd]`. `toPrimitives()`/`fromPrimitives()` son la única puerta de infraestructura al estado interno `[Fuera de los libros: convención de @archi-code/ddd]`; el repositorio nunca lee getters del agregado ni construye filas a mano. Los constructores de los value objects validan al cargar: un dato corrupto falla en `fromPrimitives` y no dentro del modelo.

## Repositorio con MongoDB

Un documento por agregado es el encaje natural de un almacén orientado a agregados [IDDD cap. 12]. Cada `save` y cada `remove` es una sola operación sobre un documento, atómica por sí misma, así que no necesita sesión ni transacción: la transacción es del repositorio y aquí no hace falta abrir ninguna (`ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`) `[Fuera de los libros: convención de @archi-code/ddd]`. El repositorio extiende `OrderRepository`, implementa sus tres verbos y envuelve los errores de escritura del driver con su causa:

```ts
import { MongoServerError } from 'mongodb';
import type { Collection } from 'mongodb';
import type { PrimitiveTypes } from '@archi-code/ddd/domain';
import { ConcurrencyException } from '@archi-code/ddd/application';
import { InternalErrorException } from '@archi-code/ddd/infrastructure';
import { Order } from '../../domain/aggregate/Order';
import { OrderRepository } from '../../domain/repository/OrderRepository';
import type { OrderId } from '../../domain/value-object/OrderId';

export type OrderDocument = PrimitiveTypes<Order> & { _id: string; version: number };

const DUPLICATE_KEY = 11000;

export class MongoOrderRepository extends OrderRepository {
  private readonly versions = new WeakMap<Order, number>();

  constructor(private readonly collection: Collection<OrderDocument>) {
    super();
  }

  async findById(id: OrderId): Promise<Order | null> {
    const document = await this.collection.findOne({ _id: id.value });
    if (document === null) {
      return null;
    }
    const { _id, version, ...primitives } = document;
    const order = Order.fromPrimitives(primitives);
    this.versions.set(order, version);
    return order;
  }

  async save(order: Order): Promise<void> {
    const version = this.versions.get(order) ?? 0;
    const document: OrderDocument = {
      ...order.toPrimitives(),
      _id: order.id.value,
      version: version + 1,
    };
    const written = await this.write(order, version, async () => {
      if (version === 0) {
        await this.collection.insertOne(document);
        return true;
      }
      const { matchedCount } = await this.collection.replaceOne(
        { _id: document._id, version },
        document,
      );
      return matchedCount === 1;
    });
    if (!written) {
      throw new ConcurrencyException('Order', order.id.value, version);
    }
    this.versions.set(order, version + 1);
  }

  async remove(order: Order): Promise<void> {
    const version = this.versions.get(order) ?? 0;
    const filter = { _id: order.id.value };
    const removed = await this.write(order, version, async () => {
      if (version === 0) {
        return (await this.collection.countDocuments(filter, { limit: 1 })) === 0;
      }
      const { deletedCount } = await this.collection.deleteOne({ ...filter, version });
      return deletedCount === 1;
    });
    if (!removed) {
      throw new ConcurrencyException('Order', order.id.value, version);
    }
  }

  private async write(
    order: Order,
    version: number,
    operation: () => Promise<boolean>,
  ): Promise<boolean> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof MongoServerError && error.code === DUPLICATE_KEY) {
        throw new ConcurrencyException('Order', order.id.value, version, { cause: error });
      }
      throw new InternalErrorException(`writing order ${order.id.value}`, { cause: error });
    }
  }
}
```

* Alta (el `WeakMap` no conoce el agregado, `version === 0`): `insertOne`; un `_id` ya ocupado (error 11000) es `ConcurrencyException` con el error del driver como `cause`.
* Cambio: `replaceOne` con la condición `{ _id, version }`, la versión que el repositorio recordaba; si no casa ningún documento, otro guardó antes.
* Un conflicto es `ConcurrencyException`: el caso de uso puede reintentar volviendo a cargar y a guardar, y `ExceptionClassifier` lo clasifica como `ExceptionKind.Conflict` (409 en HTTP), no como error interno.
* Borrado: `deleteOne` con la misma condición. Un agregado que nunca se guardó (versión 0) no tiene nada que borrar, salvo que su id ya esté ocupado: entonces es un conflicto, igual que en el `InMemoryOrderRepository` (`ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`).
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

`data` guarda `PrimitiveTypes<Order>` entero; las columnas sueltas (`customer_id`, `status`) se duplican solo para indexar las consultas de lectura. Todo el agregado cabe en una fila, así que cada `save` es una sola sentencia, atómica por sí misma, sobre el pool. `PgPool` (la interfaz estructural de los métodos de `pg` que usa) y la variante con las líneas en otra tabla, donde el repositorio abre y confirma una transacción dentro de `save`, están en `ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`. Este adaptador extiende el mismo `OrderRepository` e implementa sus tres verbos:

```ts
import type { PrimitiveTypes } from '@archi-code/ddd/domain';
import { ConcurrencyException } from '@archi-code/ddd/application';
import { InternalErrorException } from '@archi-code/ddd/infrastructure';
import { Order } from '../../domain/aggregate/Order';
import { OrderRepository } from '../../domain/repository/OrderRepository';
import type { OrderId } from '../../domain/value-object/OrderId';
import type { PgPool } from './pg-pool';

interface OrderRow {
  version: number;
  data: PrimitiveTypes<Order>;
}

export class PostgresOrderRepository extends OrderRepository {
  private readonly versions = new WeakMap<Order, number>();

  constructor(private readonly pool: PgPool) {
    super();
  }

  async findById(id: OrderId): Promise<Order | null> {
    const { rows } = await this.pool.query<OrderRow>(
      'SELECT version, data FROM orders WHERE id = $1',
      [id.value],
    );
    if (rows[0] === undefined) {
      return null;
    }
    const order = Order.fromPrimitives(rows[0].data);
    this.versions.set(order, rows[0].version);
    return order;
  }

  async save(order: Order): Promise<void> {
    const version = this.versions.get(order) ?? 0;
    const primitives = order.toPrimitives();
    const write =
      version === 0
        ? this.pool.query(
            'INSERT INTO orders (id, version, customer_id, status, data) VALUES ($1, 1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
            [primitives.id, primitives.customerId, primitives.status, primitives],
          )
        : this.pool.query(
            'UPDATE orders SET version = version + 1, status = $3, data = $4 WHERE id = $1 AND version = $2',
            [primitives.id, version, primitives.status, primitives],
          );
    const { rowCount } = await write.catch((error: unknown) => {
      throw new InternalErrorException(`writing order ${order.id.value}`, { cause: error });
    });
    if (rowCount === 0) {
      throw new ConcurrencyException('Order', order.id.value, version);
    }
    this.versions.set(order, version + 1);
  }

  async remove(order: Order): Promise<void> {
    const version = this.versions.get(order) ?? 0;
    const { rowCount } = await this.pool
      .query('DELETE FROM orders WHERE id = $1 AND version = $2', [order.id.value, version])
      .catch((error: unknown) => {
        throw new InternalErrorException(`removing order ${order.id.value}`, { cause: error });
      });
    if (rowCount === 0) {
      throw new ConcurrencyException('Order', order.id.value, version);
    }
  }
}
```

Al leer `data` de `jsonb`, `paymentAuthorization.expiresAt` llega como texto ISO con zona, que `ExpiresAt` (un `DateType`) convierte.

## Con Prisma

`[Fuera de los libros]`
* El esquema de Prisma y su cliente viven en infraestructura. El repositorio extiende `OrderRepository` (con `super()` primero en su constructor), implementa sus verbos, recibe el `PrismaClient` y devuelve agregados con `Order.fromPrimitives(row.data)` (y `this.versions.set(order, row.version)` en su `WeakMap`), nunca modelos de Prisma.
* La concurrencia optimista con Prisma: con `const version = this.versions.get(order) ?? 0`, `updateMany({ where: { id, version }, data: { ..., version: { increment: 1 } } })`; si `count === 0`, `ConcurrencyException('Order', order.id.value, version)`; si no, `this.versions.set(order, version + 1)`.
* Si el agregado ocupa varios modelos de Prisma, el repositorio agrupa sus escrituras con `prisma.$transaction(async (tx) => ...)` dentro de su propio `save`; la aplicación nunca la abre `[Fuera de los libros: convención de @archi-code/ddd]`.

## Consultas de lectura

Las selecciones no pasan por el repositorio: son puertos de consulta de la capa de aplicación que devuelven filas de primitivos o ids, implementados en infraestructura directamente sobre la base de datos [IDDD cap. 12, "use case optimal query"] `[Fuera de los libros: convención de @archi-code/ddd]`. Las lee el controlador sin caso de uso. Cuando la vista necesita una tabla propia, es un read model con proyección y casos de uso por reacción (`ddd-skills/ddd-event-sourcing-cqrs/references/proyecciones-cqrs-ts.md`); aquí, en cambio, la consulta lee la colección de los agregados. Los filtros se escriben con `@archi-code/criteria` sobre la forma persistida (`PrimitiveTypes<Order>`) y `@archi-code/criteria-adapters/mongodb` los ejecuta:

En `application/order-summaries/order-summaries.ts` (puertos de consulta) y `application/order-summaries/order-summary.ts` (la fila):

```ts
import type { CustomerId } from '../../domain/value-object/CustomerId';

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

En `infrastructure/read-model/mongo-order-summaries.ts`:

```ts
import { Criteria } from '@archi-code/criteria';
import { searchMongo } from '@archi-code/criteria-adapters/mongodb';
import type { Collection } from 'mongodb';
import type { PrimitiveTypes } from '@archi-code/ddd/domain';
import type { Order } from '../../domain/aggregate/Order';
import type { CustomerId } from '../../domain/value-object/CustomerId';
import { OrderStatus } from '../../domain/value-object/OrderStatusType';
import type { OrderSummary } from '../../application/order-summaries/order-summary';
import type { OrderSummaries, StaleOrders } from '../../application/order-summaries/order-summaries';
import type { OrderDocument } from '../persistence/mongo-order-repository';

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
          status: OrderStatus.PENDING,
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

`T` es la forma persistida, no el agregado: la consulta nunca construye un `Order`. Un proceso por tiempo (pedidos pendientes cuya autorización de pago ha caducado) es un punto de entrada más: pide los ids a `StaleOrders` y ejecuta un caso de uso de usuario por agregado.

## Jerarquías de tipos

IDDD trata repositorios compartidos por subtipos y sus complicaciones [IDDD cap. 12]. Antes de diseñar una jerarquía de agregados, revisa si un tipo estándar (value object de estado o tipo, como `OrderStatusType`) basta. Cada repositorio reconstruye una clase concreta con su `fromPrimitives`.
