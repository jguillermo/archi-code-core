# Probar repositorios

## Repositorio en memoria

Un mapa con la identidad como clave y el agregado como valor [IDDD cap. 12]. Dos detalles para que no mienta `[Fuera de los libros]`: guardar copias (para que modificar un objeto sin `save` no "persista") y comprobar versiones.

No se escribe: es `InMemoryRepository` de `@archi-code/ddd/infrastructure`, que implementa `AggregateFinder`, `AggregateSaver` y `AggregateRemover` para cualquier agregado:

En `test/support/orders.ts`:

```ts
import { AggregateMapper, InMemoryRepository } from '@archi-code/ddd/infrastructure';
import { Order } from '../../src/contexts/sales/domain/order/order';

export const inMemoryOrders = () => new InMemoryRepository(AggregateMapper.of(Order));
```

* Guarda `structuredClone` de `mapper.toPrimitives(order)` con su versión, y cada `findById` reconstruye un objeto nuevo con `mapper.fromPrimitives(copy, version)`: cambiar un agregado sin `save` no persiste nada.
* Sigue el mismo contrato de concurrencia que un repositorio real: `save` y `remove` lanzan `ConcurrencyException` si la versión almacenada no coincide con `order.version` (también al dar de alta un id ocupado), y tras guardar llama a `markPersisted()`.
* Las claves son `id.toString()`; `IdType` y `UuidType` guardan el valor en minúsculas, así que la búsqueda no distingue mayúsculas.
* Es participante de `InMemoryTransactionRunner([orders])`: si el trabajo lanza, vuelve al estado de antes (`ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`).
* `findAll()` existe solo como comodidad de los tests `[Fuera de los libros: convención de @archi-code/ddd]`; un repositorio real no lo tiene y el código de producción no lo usa. Tampoco se usa `InMemoryRepository` en producción.

Pasar el mapper real también en memoria prueba de paso que el mapeo es reversible. El repositorio no guarda los eventos publicados: los publica el caso de uso, y los tests los leen de `channel.sent` del `InMemoryEventChannel` `[Fuera de los libros: convención de @archi-code/ddd]`.

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

El spec del adaptador lo ejecuta contra las dos implementaciones. El de MongoDB necesita un servidor real con replica set (Testcontainers, `mongodb-memory-server` o el de CI) `[herramienta fuera de los libros]`; cada fábrica usa una colección nueva para que los tests no compartan datos. En `test/contexts/sales/infrastructure/persistence/mongo-order-repository.spec.ts`, espejo de `src/`:

```ts
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { afterAll, beforeAll, describe } from 'vitest';
import { AggregateMapper, InMemoryRepository } from '@archi-code/ddd/infrastructure';
import { Order } from '../../../../../src/contexts/sales/domain/order/order';
import { MongoOrderRepository } from '../../../../../src/contexts/sales/infrastructure/persistence/mongo-order-repository';
import type { OrderDocument } from '../../../../../src/contexts/sales/infrastructure/persistence/mongo-order-repository';
import { MongoTransactionRunner } from '../../../../../src/contexts/sales/infrastructure/persistence/mongo-transaction-runner';
import { orderRepositoryContract } from '../../../../support/order-repository-contract';

let client: MongoClient;

beforeAll(async () => {
  client = await MongoClient.connect(process.env.MONGO_TEST_URL!);
});

afterAll(() => client.close());

const mongoOrders = async () =>
  new MongoOrderRepository(
    client.db('sales-test').collection<OrderDocument>(`orders-${randomUUID()}`),
    new MongoTransactionRunner(client),
  );

describe('InMemoryRepository', () =>
  orderRepositoryContract(async () => new InMemoryRepository(AggregateMapper.of(Order))));
describe('MongoOrderRepository', () => orderRepositoryContract(mongoOrders));
```

Los tests del repositorio real usan la implementación de producción; si no, no sabes si funciona [IDDD cap. 12].

Cada agregado tiene además un test de ida y vuelta de sus primitivos (`Order.fromPrimitives(order.toPrimitives()).toPrimitives()` igual a `order.toPrimitives()`), que no necesita repositorio (ver `ddd-skills/ddd-agregados/GUIA.md`).
