# Implementar repositorios en TypeScript

## Esquema para el agregado Order

`[Fuera de los libros: esquema propio siguiendo IDDD cap. 6, valores embebidos en la fila del padre]`

```sql
CREATE TABLE orders (
  id                 TEXT PRIMARY KEY,
  version            INT         NOT NULL,
  customer_id        TEXT        NOT NULL,
  status             TEXT        NOT NULL,
  lines              JSONB       NOT NULL,     -- colección de value objects, no se consulta por dentro
  shipping_address   JSONB       NOT NULL,
  reservation_id     TEXT        NULL,
  payment_auth       JSONB       NULL,
  total_minor        BIGINT      NOT NULL,     -- desnormalizado para consultas de lectura
  total_currency     TEXT        NOT NULL,
  placed_at          TIMESTAMPTZ NOT NULL
);
```

Una fila por agregado: lectura rápida, sin joins, y la versión protege todo el agregado [IDDD cap. 10].

Convención de versiones de estas fuentes: un agregado nuevo tiene versión 0 en memoria; al insertarlo se guarda con 1 y `markPersisted()` lo lleva a 1. Cada actualización exige que la versión en base de datos coincida con la del objeto y la incrementa en ambos lados. Si la transacción se revierte después de `markPersisted()`, descarta el objeto y vuelve a cargarlo.

## Mapper

```ts
export const OrderMapper = {
  toRow(order: Order): OrderRow {
    const s = order.toSnapshot();          // vista de solo lectura del estado, para infraestructura
    return {
      id: s.id.value,
      customer_id: s.customerId.value,
      status: s.status.code,
      lines: s.lines.toArray().map((l) => ({ sku: l.sku.value, name: l.name, qty: l.quantity.value, unit: l.unitPrice.toJSON() })),
      shipping_address: s.shippingAddress.toJSON(),
      reservation_id: s.stockReservation?.value ?? null,
      payment_auth: s.paymentAuthorization?.toJSON() ?? null,
      total_minor: s.total.minor.toString(),
      total_currency: s.total.currency.code,
      placed_at: s.placedAt,
    };
  },

  toDomain(r: OrderRow): Order {
    return Order.reconstitute({
      id: OrderId.of(r.id),
      version: r.version,
      customerId: CustomerId.of(r.customer_id),
      status: OrderStatus.fromCode(r.status),
      lines: OrderLines.of(r.lines.map((l) => OrderLine.of(Sku.of(l.sku), l.name, Quantity.of(l.qty), Money.fromJSON(l.unit)))),
      shippingAddress: ShippingAddress.fromJSON(r.shipping_address),
      stockReservation: r.reservation_id ? ReservationId.of(r.reservation_id) : null,
      paymentAuthorization: r.payment_auth ? PaymentAuthorization.fromJSON(r.payment_auth) : null,
      placedAt: r.placed_at,
    });
  },
};
```

`toSnapshot()` es la única puerta de infraestructura al estado interno `[Fuera de los libros]`. Alternativa: que el agregado exponga getters de solo lectura; lo importante es no exponer setters. Con el paquete, esa puerta es `toPrimitives()` (datos planos) y `fromPrimitives()`, y el repositorio los usa a través de `AggregateMapper.of(Order)` `[Fuera de los libros: convención de @archi-code/ddd]`.

Las factorías de los value objects validan al cargar: un dato corrupto falla aquí y no dentro del modelo.

## Repositorio con pg

```ts
export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly tx: TransactionRunner) {}

  async byId(id: OrderId): Promise<Order | null> {
    const { rows } = await this.tx.current().query(`SELECT * FROM orders WHERE id = $1`, [id.value]);
    return rows[0] ? OrderMapper.toDomain(rows[0]) : null;
  }

  async save(order: Order): Promise<void> {
    const db = this.tx.current();
    const row = OrderMapper.toRow(order);
    if (order.version === 0) {
      await db.query(`INSERT INTO orders (id, version, customer_id, status, lines, shipping_address, reservation_id, payment_auth, total_minor, total_currency, placed_at)
                      VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [row.id, row.customer_id, row.status, row.lines, row.shipping_address, row.reservation_id, row.payment_auth, row.total_minor, row.total_currency, row.placed_at]);
    } else {
      const res = await db.query(`UPDATE orders SET version = version + 1, status=$3, lines=$4, shipping_address=$5, reservation_id=$6, payment_auth=$7, total_minor=$8, total_currency=$9
                                  WHERE id = $1 AND version = $2`,
        [row.id, order.version, row.status, row.lines, row.shipping_address, row.reservation_id, row.payment_auth, row.total_minor, row.total_currency]);
      if (res.rowCount === 0) throw new ConcurrencyConflict('Order', row.id, order.version);
    }
    await appendEvents(db, row.id, order.pullEvents());   // outbox (ddd-skills/ddd-eventos-dominio/GUIA.md); con el paquete, lo hace el caso de uso
    order.markPersisted();                                // la versión en memoria sigue a la persistida
  }
}
```

## Con Prisma

`[Fuera de los libros]`
* El esquema de Prisma y su cliente viven en infraestructura. El repositorio recibe el `PrismaClient` (o la transacción interactiva `tx`) y devuelve agregados, nunca modelos de Prisma.
* La concurrencia optimista con Prisma: `updateMany({ where: { id, version }, data: {..., version: { increment: 1 } } })` y comprobar `count === 0`.
* Las transacciones interactivas (`prisma.$transaction(async (tx) => ...)`) las abre la capa de aplicación a través de un `TransactionRunner` propio.

## Con MongoDB

Un documento por agregado es el encaje natural de un almacén orientado a agregados [IDDD cap. 12]. Concurrencia con `findOneAndUpdate({ _id, version }, ...)`. Cuidado con la serialización: IDDD advierte de que en estos almacenes hay que cuidar el formato serializado, que no es gratis [IDDD cap. 12].

## Jerarquías de tipos

IDDD trata repositorios compartidos por subtipos y sus complicaciones [IDDD cap. 12]. Antes de diseñar una jerarquía de agregados, revisa si un tipo estándar (value object de estado o tipo) basta.
