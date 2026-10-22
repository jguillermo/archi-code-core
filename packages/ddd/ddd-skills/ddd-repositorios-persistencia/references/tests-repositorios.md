# Probar repositorios

## Repositorio en memoria

Un mapa con la identidad como clave y el agregado como valor [IDDD cap. 12]. Dos detalles para que no mienta `[Fuera de los libros]`: guardar copias (para que modificar un objeto sin `save` no "persista") y comprobar versiones.

El paquete no lo da: cada proyecto escribe el suyo en `test/support/`, uno por agregado, como cualquier otra implementación de una tecnología `[Fuera de los libros: convención de @archi-code/ddd]`. Implementa los roles de `@archi-code/ddd/domain` para su agregado (`AggregateFinder<Order>`, `AggregateSaver<Order>`, `AggregateRemover<Order>`), su constructor no recibe nada (no hay tecnología de la que depender) llama a `order.toPrimitives()` y `Order.fromPrimitives(row.primitives)` y recuerda la versión de cada agregado en un `WeakMap`, igual que un adaptador real.

En `test/support/in-memory-order-repository.ts`:

```ts
import type {
  AggregateFinder,
  AggregateRemover,
  AggregateSaver,
  PrimitiveTypes,
} from '@archi-code/ddd/domain';
import { ConcurrencyException } from '@archi-code/ddd/exceptions';
import { Order } from '../../src/contexts/sales/domain/order/order';
import type { OrderId } from '../../src/contexts/sales/domain/order/order';

interface StoredOrder {
  version: number;
  primitives: PrimitiveTypes<Order>;
}

export class InMemoryOrderRepository
  implements AggregateFinder<Order>, AggregateSaver<Order>, AggregateRemover<Order>
{
  private readonly rows = new Map<string, StoredOrder>();
  private readonly versions = new WeakMap<Order, number>();

  async findById(id: OrderId): Promise<Order | null> {
    const row = this.rows.get(id.value);
    return row === undefined ? null : this.load(row);
  }

  async save(order: Order): Promise<void> {
    const key = order.id.value;
    const version = this.checkedVersion(order);
    const primitives = structuredClone(order.toPrimitives());
    this.rows.set(key, { version: version + 1, primitives });
    this.versions.set(order, version + 1);
  }

  async remove(order: Order): Promise<void> {
    this.checkedVersion(order);
    this.rows.delete(order.id.value);
  }

  private checkedVersion(order: Order): number {
    const key = order.id.value;
    const version = this.versions.get(order) ?? 0;
    if ((this.rows.get(key)?.version ?? 0) !== version) {
      throw new ConcurrencyException('Order', key, version);
    }
    return version;
  }

  private load(row: StoredOrder): Order {
    const order = Order.fromPrimitives(structuredClone(row.primitives));
    this.versions.set(order, row.version);
    return order;
  }
}
```

* Guarda `structuredClone` de `order.toPrimitives()` con su versión al lado (nunca dentro), y cada `findById` reconstruye un objeto nuevo con `Order.fromPrimitives(copy)` y anota en `versions` la versión de la fila: cambiar un agregado sin `save` no persiste nada.
* Sigue el mismo contrato de concurrencia que un repositorio real: la versión es solo del repositorio, que recuerda la de cada agregado que cargó o guardó en un `WeakMap<Order, number>` (`0` si no lo conoce: es nuevo). `save` y `remove` lanzan `ConcurrencyException` si la versión almacenada no coincide con la recordada (también al dar de alta un id ocupado), y `save` actualiza el `WeakMap` solo después de escribir. El agregado no declara ni mapea ninguna versión `[Fuera de los libros: convención de @archi-code/ddd]`.
* Las claves son `id.value`; `IdType` y `UuidType` guardan el valor en minúsculas, así que la búsqueda no distingue mayúsculas.
* Cada `save` y cada `remove` es atómico, como el de un repositorio real: no hay transacción que abrir ni estado que restaurar en los tests (la transacción es del repositorio, `ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`).
* No tiene `findAll()` salvo que los tests del proyecto lo necesiten; si se añade, es solo comodidad de los tests y un repositorio real no lo tiene `[Fuera de los libros: convención de @archi-code/ddd]`. Nunca se usa en producción.
* Otro agregado tiene el suyo, escrito igual (`InMemoryProductRepository` con `Product.fromPrimitives` y `product.toPrimitives()`).

El repositorio en memoria no comprueba que la conversión esté completa: que `fromPrimitives` deshaga `toPrimitives` sin perder ningún campo lo prueba el spec del agregado (`Order.fromPrimitives(order.toPrimitives()).toPrimitives()` igual a `order.toPrimitives()`) `[Fuera de los libros: convención de @archi-code/ddd]`. La suite de contrato de abajo se ejecuta contra este repositorio y contra el adaptador real, así que el doble no puede apartarse del contrato. El repositorio no guarda los eventos publicados: los publica el caso de uso, y los tests los leen de `channel.sent` del `InMemoryEventChannel` `[Fuera de los libros: convención de @archi-code/ddd]`.

## Tests de contrato compartidos

Un único conjunto de tests, en `test/support/order-repository-contract.ts` del proyecto, recibe una fábrica de repositorios y se ejecuta contra la referencia en memoria y contra el adaptador real `[Fuera de los libros]`:

```ts
import { expect, it } from 'vitest';
import type { AggregateFinder, AggregateRemover, AggregateSaver } from '@archi-code/ddd/domain';
import { ConcurrencyException } from '@archi-code/ddd/exceptions';
import { FixedClock } from '@archi-code/ddd/infrastructure';
import {
  CustomerId,
  Order,
  OrderId,
  OrderLine,
  OrderLines,
  ShippingAddress,
} from '../../src/contexts/sales/domain/order/order';

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';
const customerId = '3f1d2c4b-5a6e-4f70-8b9c-0d1e2f3a4b5c';

export function orderRepositoryContract(
  make: () => Promise<AggregateFinder<Order> & AggregateSaver<Order> & AggregateRemover<Order>>,
): void {
  const clock = new FixedClock('2026-03-01T09:30:00Z');
  const line = (sku: string) =>
    OrderLine.fromPrimitives({ sku, quantity: 1, unitPrice: { amount: 4990, currency: 'EUR' } });
  const placeOrder = () =>
    Order.place(
      new OrderId(orderId),
      new CustomerId(customerId),
      new OrderLines({ items: [line('TORCH-01')] }),
      ShippingAddress.fromPrimitives({ street: 'Calle Mayor 1', city: 'Huelva', country: 'ES' }),
      clock,
    );

  it('loads what it saved', async () => {
    const orders = await make();
    const order = placeOrder();
    order.addLine(line('HELMET-02'), clock);
    await orders.save(order);
    expect((await orders.findById(order.id))?.toPrimitives()).toEqual(order.toPrimitives());
  });

  it('saves the same object twice', async () => {
    const orders = await make();
    const order = placeOrder();
    await orders.save(order);
    order.addLine(line('HELMET-02'), clock);
    await expect(orders.save(order)).resolves.toBeUndefined();
  });

  it('refuses a stale save and a new order with a taken id', async () => {
    const orders = await make();
    await orders.save(placeOrder());
    const first = await orders.findById(new OrderId(orderId));
    const second = await orders.findById(new OrderId(orderId));
    first!.addLine(line('HELMET-02'), clock);
    await orders.save(first!);
    second!.addLine(line('GLOVES-03'), clock);
    await expect(orders.save(second!)).rejects.toThrow(ConcurrencyException);
    await expect(orders.save(placeOrder())).rejects.toThrow(ConcurrencyException);
  });

  it('refuses to remove an order someone changed after it was loaded', async () => {
    const orders = await make();
    await orders.save(placeOrder());
    const first = await orders.findById(new OrderId(orderId));
    const second = await orders.findById(new OrderId(orderId));
    await orders.save(first!);
    await expect(orders.remove(second!)).rejects.toThrow(ConcurrencyException);
  });

  it('forgets a removed order', async () => {
    const orders = await make();
    const order = placeOrder();
    await orders.save(order);
    await orders.remove(order);
    expect(await orders.findById(order.id)).toBeNull();
  });
}
```

El spec del adaptador lo ejecuta contra las dos implementaciones. El de MongoDB necesita un servidor real (Testcontainers, `mongodb-memory-server` o el de CI) `[herramienta fuera de los libros]`; cada fábrica usa una colección nueva para que los tests no compartan datos. En `test/contexts/sales/infrastructure/persistence/mongo-order-repository.spec.ts`, espejo de `src/`:

```ts
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { afterAll, beforeAll, describe } from 'vitest';
import { MongoOrderRepository } from '../../../../../src/contexts/sales/infrastructure/persistence/mongo-order-repository';
import type { OrderDocument } from '../../../../../src/contexts/sales/infrastructure/persistence/mongo-order-repository';
import { InMemoryOrderRepository } from '../../../../support/in-memory-order-repository';
import { orderRepositoryContract } from '../../../../support/order-repository-contract';

let client: MongoClient;

beforeAll(async () => {
  client = await MongoClient.connect(process.env.MONGO_TEST_URL!);
});

afterAll(() => client.close());

const mongoOrders = async () =>
  new MongoOrderRepository(
    client.db('sales-test').collection<OrderDocument>(`orders-${randomUUID()}`),
  );

describe('InMemoryOrderRepository', () =>
  orderRepositoryContract(async () => new InMemoryOrderRepository()));
describe('MongoOrderRepository', () => orderRepositoryContract(mongoOrders));
```

Los tests del repositorio real usan la implementación de producción; si no, no sabes si funciona [IDDD cap. 12].

Cada agregado tiene además un test de ida y vuelta de sus primitivos (`Order.fromPrimitives(order.toPrimitives()).toPrimitives()` igual a `order.toPrimitives()`), que no necesita repositorio (ver `ddd-skills/ddd-agregados/GUIA.md`).
