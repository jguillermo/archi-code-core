# Implementar repositorios en TypeScript

Ejemplos con el `Order` de `ddd-skills/ddd-agregados/references/implementacion-ts.md`. Repositorio abstracto (los pedidos se borran, así que declara tres verbos) `[Fuera de los libros: convención de @archi-code/ddd]`:

```ts
import { AggregateRepository } from '@archi-code/ddd/domain';
import type { AggregateFinder, AggregateRemover, AggregateSaver } from '@archi-code/ddd/domain';

export abstract class OrderRepository
  extends AggregateRepository<Order>
  implements AggregateFinder<Order>, AggregateSaver<Order>, AggregateRemover<Order>
{
  abstract findById(id: OrderId): Promise<Order | null>;
  abstract save(order: Order): Promise<void>;
  abstract remove(order: Order): Promise<void>;
}
```

`search(criteria: Criteria<Order>, options?)` → `SearchResult<Order>` se añade con `AggregateSearcher<Order>` solo si un caso de uso selecciona agregados para cambiarlos. Cada adaptador implementa exactamente los verbos declarados, ni más ni menos.

## Qué se guarda

`PrimitiveTypes<Order>` (value objects → valor, composites → primitivos, enums → opción, fechas → `Date`), un documento o fila por agregado, con la versión **al lado**, nunca dentro [IDDD cap. 6 y cap. 10] `[Fuera de los libros: convención de @archi-code/ddd]`. Los constructores de los value objects validan al cargar: un dato corrupto falla en `fromPrimitives`, no dentro del modelo. Si `save` lanza, el `WeakMap` conserva la versión anterior y el caso de uso descarta el objeto y recarga; al ser `WeakMap`, un agregado sin uso no retiene memoria.

## MongoDB

Un documento por agregado; cada escritura es atómica por sí misma, sin sesión [IDDD cap. 12].

```ts
import { MongoServerError } from 'mongodb';
import type { Collection } from 'mongodb';
import type { PrimitiveTypes } from '@archi-code/ddd/domain';
import { ConcurrencyException } from '@archi-code/ddd/application';
import { InternalErrorException } from '@archi-code/ddd/infrastructure';

export type OrderDocument = PrimitiveTypes<Order> & { _id: string; version: number };

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
    const document = { ...order.toPrimitives(), _id: order.id.value, version: version + 1 };
    const written = await this.write(order, version, async () => {
      if (version === 0) {
        await this.collection.insertOne(document);
        return true;
      }
      const { matchedCount } = await this.collection.replaceOne({ _id: document._id, version }, document);
      return matchedCount === 1;
    });
    if (!written) {
      throw new ConcurrencyException('Order', order.id.value, version);
    }
    this.versions.set(order, version + 1);
  }

  async remove(order: Order): Promise<void> {
    const version = this.versions.get(order) ?? 0;
    const removed = await this.write(order, version, async () => {
      if (version === 0) {
        return (await this.collection.countDocuments({ _id: order.id.value }, { limit: 1 })) === 0;
      }
      const { deletedCount } = await this.collection.deleteOne({ _id: order.id.value, version });
      return deletedCount === 1;
    });
    if (!removed) {
      throw new ConcurrencyException('Order', order.id.value, version);
    }
  }

  private async write(order: Order, version: number, operation: () => Promise<boolean>): Promise<boolean> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConcurrencyException('Order', order.id.value, version, { cause: error });
      }
      throw new InternalErrorException(`writing order ${order.id.value}`, { cause: error });
    }
  }
}
```

Un `_id` ocupado al dar de alta es conflicto (error 11000, con `cause`); `remove` de un agregado nunca guardado (versión 0) no borra nada salvo que el id esté ocupado, que es conflicto; cualquier otro error del driver, `InternalErrorException`. El conflicto lo puede reintentar el caso de uso y `ExceptionClassifier` lo clasifica como `ExceptionKind.Conflict` (409). Cuida el formato serializado [IDDD cap. 12].

## PostgreSQL

`[Fuera de los libros: esquema propio siguiendo IDDD cap. 6]` Tabla `orders (id UUID PK, version INT, customer_id, status, data JSONB)`: `data` guarda los primitivos y las columnas sueltas solo indexan. Mismo patrón que MongoDB:

* Alta: `INSERT … VALUES ($1, 1, …) ON CONFLICT (id) DO NOTHING`; cambio: `UPDATE orders SET version = version + 1, status = $3, data = $4 WHERE id = $1 AND version = $2`; borrado: `DELETE … WHERE id = $1 AND version = $2`. `rowCount === 0` → `ConcurrencyException`; error del driver → `InternalErrorException` con `{ cause }`.
* Una fila = una sentencia atómica. Con varias tablas: `ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`.
* Las fechas en `jsonb` vuelven como texto ISO, que los `DateType` convierten.

## Prisma

`[Fuera de los libros]` El cliente vive en infraestructura; devuelve `Order.fromPrimitives(row.data)`, nunca modelos de Prisma. Concurrencia: `updateMany({ where: { id, version }, data: { …, version: { increment: 1 } } })` y `count === 0` → conflicto. Varios modelos: `prisma.$transaction` dentro del propio `save` `[Fuera de los libros: convención de @archi-code/ddd]`.

## Consultas de lectura

Las selecciones para mostrar no pasan por el repositorio: son puertos de consulta de `application/` que devuelven filas de primitivos o ids, implementados en infraestructura sobre la base y leídos por el controlador sin caso de uso [IDDD cap. 12, "use case optimal query"] `[Fuera de los libros: convención de @archi-code/ddd]`. Los filtros se escriben con `Criteria<Order>` y `@archi-code/criteria-adapters/mongodb` los traduce:

```ts
const translator = new MongoCriteriaTranslator<Order>();

export class MongoStaleOrders implements StaleOrders {
  constructor(private readonly collection: Collection<OrderDocument>) {}

  async ids(expiredBefore: Date, limit: number): Promise<string[]> {
    const query = translator.translate(
      Criteria.create<Order>({
        where: {
          status: new OrderStatusType(OrderStatus.PENDING),
          'paymentAuthorization.expiresAt': { lt: new ExpiresAt(expiredBefore) },
        },
        orderBy: { 'paymentAuthorization.expiresAt': 'asc' },
        limit,
      }),
    );
    const items = await this.collection.find(query.filter, { sort: query.sort, limit: query.limit }).toArray();
    return items.map((order) => order.id);
  }
}
```

El tipo de la colección es la forma persistida: la consulta nunca construye un `Order`. Un proceso por tiempo es un punto de entrada más: pide los ids y ejecuta un caso de uso de usuario por agregado. Si el caso de uso necesita los agregados para cambiarlos, el mismo `Criteria` va a `search` del repositorio. Read model con tabla propia: `ddd-skills/ddd-event-sourcing-cqrs/references/proyecciones-cqrs-ts.md`.

## Jerarquías

Antes de una jerarquía de agregados con repositorio compartido [IDDD cap. 12], mira si basta un value object de tipo o estado (`OrderStatusType`). Cada repositorio reconstruye una clase concreta con su `fromPrimitives`.
