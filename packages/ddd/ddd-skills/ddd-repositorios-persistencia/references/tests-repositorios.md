# Probar repositorios

## Repositorio en memoria

Un mapa con la identidad como clave y el agregado como valor [IDDD cap. 12]. Dos detalles para que no mienta `[Fuera de los libros]`: guardar copias (para que modificar un objeto sin `save` no "persista") y comprobar versiones.

```ts
export class InMemoryOrderRepository implements OrderRepository {
  private readonly rows = new Map<string, OrderRow & { version: number }>();
  readonly publishedEvents: DomainEvent[] = [];

  async byId(id: OrderId): Promise<Order | null> {
    const row = this.rows.get(id.value);
    return row ? OrderMapper.toDomain(structuredClone(row)) : null;
  }

  async save(order: Order): Promise<void> {
    const current = this.rows.get(order.id.value);
    if (current && current.version !== order.version) throw new ConcurrencyConflict('Order', order.id.value, order.version);
    if (!current && order.version !== 0) throw new ConcurrencyConflict('Order', order.id.value, order.version);
    this.rows.set(order.id.value, { ...structuredClone(OrderMapper.toRow(order)), version: order.version + 1 });
    this.publishedEvents.push(...order.pullEvents());
    order.markPersisted();
  }
}
```

Usar el mapper real también en memoria prueba de paso que el mapeo es reversible. Con el paquete, el repositorio en memoria no guarda `publishedEvents`: los eventos se leen del outbox (`outbox.pending(n)`) que alimenta el caso de uso `[Fuera de los libros: convención de @archi-code/ddd]`.

## Tests de contrato compartidos

```ts
export function orderRepositoryContract(make: () => Promise<OrderRepository>) {
  it('recupera lo que guarda', async () => {
    const repo = await make();
    const order = aPendingOrder(OrderId.generate());
    await repo.save(order);
    const loaded = await repo.byId(order.id);
    expect(loaded?.total().equals(order.total())).toBe(true);
  });

  it('permite guardar dos veces seguidas el mismo objeto', async () => {
    const repo = await make();
    const order = aPendingOrder(OrderId.generate());
    await repo.save(order);
    order.changeQuantity(Sku.of('TAZA-350'), Quantity.of(3));
    await expect(repo.save(order)).resolves.toBeUndefined();
  });

  it('rechaza guardar una versión obsoleta', async () => {
    const repo = await make();
    const order = aPendingOrder(OrderId.generate());
    await repo.save(order);
    const a = (await repo.byId(order.id))!;
    const b = (await repo.byId(order.id))!;
    a.cancel(CancellationReason.of('cliente'));
    await repo.save(a);
    b.cancel(CancellationReason.of('cliente'));
    await expect(repo.save(b)).rejects.toThrow(ConcurrencyConflict);
  });
}

describe('InMemoryOrderRepository', () => orderRepositoryContract(async () => new InMemoryOrderRepository()));
describe('PostgresOrderRepository', () => orderRepositoryContract(async () => makePgRepoAgainstTestcontainer()));
```

Los tests del repositorio real usan la implementación de producción; si no, no sabes si funciona [IDDD cap. 12].
