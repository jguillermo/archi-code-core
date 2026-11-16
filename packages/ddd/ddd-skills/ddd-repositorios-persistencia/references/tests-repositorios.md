# Probar repositorios

## Repositorio en memoria

Un mapa id → agregado [IDDD cap. 12] que guarda copias y comprueba versiones para no mentir `[Fuera de los libros]`. Lo escribe el proyecto, uno por agregado, en `infrastructure/persistence/` o `test/support/` `[Fuera de los libros: convención de @archi-code/ddd]`:

```ts
import type { PrimitiveTypes } from '@archi-code/ddd/domain';
import { ConcurrencyException } from '@archi-code/ddd/application';

interface OrderRow {
  version: number;
  primitives: PrimitiveTypes<Order>;
}

export class InMemoryOrderRepository extends OrderRepository {
  private readonly rows = new Map<string, OrderRow>();
  private readonly versions = new WeakMap<Order, number>();

  async findById(id: OrderId): Promise<Order | null> {
    const row = this.rows.get(id.value);
    if (row === undefined) {
      return null;
    }
    const order = Order.fromPrimitives(structuredClone(row.primitives));
    this.versions.set(order, row.version);
    return order;
  }

  async save(order: Order): Promise<void> {
    const version = this.checkedVersion(order);
    this.rows.set(order.id.value, { version: version + 1, primitives: structuredClone(order.toPrimitives()) });
    this.versions.set(order, version + 1);
  }

  async remove(order: Order): Promise<void> {
    this.checkedVersion(order);
    this.rows.delete(order.id.value);
  }

  private checkedVersion(order: Order): number {
    const version = this.versions.get(order) ?? 0;
    if ((this.rows.get(order.id.value)?.version ?? 0) !== version) {
      throw new ConcurrencyException('Order', order.id.value, version);
    }
    return version;
  }
}
```

* Extiende `OrderRepository` con exactamente sus verbos; su constructor no recibe nada; convierte con `toPrimitives()`/`fromPrimitives()` y recuerda versiones en un `WeakMap`, como uno real. Otro agregado tiene el suyo, escrito igual.
* Copias `structuredClone` en las dos direcciones: cambiar un agregado sin `save` no persiste nada.
* Claves `id.value` (`IdType`/`UuidType` guardan en minúsculas).
* Cada `save`/`remove` es atómico: no hay transacción que abrir ni estado que restaurar en los tests.
* No comprueba que la conversión esté completa: lo prueba el spec del agregado.
* `findAll()` solo si los tests lo necesitan (un repositorio real no lo tiene); como doble de test puede añadir ayudas técnicas (`versionOf(id)`), nunca consultas de negocio; ningún caso de uso las ve `[Fuera de los libros: convención de @archi-code/ddd]`.
* No guarda eventos: los tests los leen de `channel.sent` del `InMemoryEventChannel`.

## Suite de contrato compartida

`test/support/order-repository-contract.ts` recibe una fábrica de `OrderRepository` y se ejecuta contra el doble y el adaptador real `[Fuera de los libros]`. Así el doble no puede apartarse del contrato. Casos mínimos:

* carga lo que guardó (`toPrimitives()` igual);
* guarda dos veces el mismo objeto sin conflicto;
* rechaza un `save` obsoleto y un alta con id ocupado (`ConcurrencyException`);
* rechaza `remove` de un agregado que otro cambió;
* olvida un agregado borrado.

```ts
describe('InMemoryOrderRepository', () => orderRepositoryContract(async () => new InMemoryOrderRepository()));
describe('MongoOrderRepository', () => orderRepositoryContract(mongoOrders));
```

El adaptador real se prueba contra la base de verdad (Testcontainers, `mongodb-memory-server`) `[herramienta fuera de los libros]`, con una colección nueva por fábrica: sin la implementación de producción no sabes si funciona [IDDD cap. 12]. Su atomicidad (varias tablas, outbox) se prueba ahí, no en los tests de la aplicación. El test de ida y vuelta de los primitivos es del agregado (`ddd-skills/ddd-agregados/GUIA.md`).
