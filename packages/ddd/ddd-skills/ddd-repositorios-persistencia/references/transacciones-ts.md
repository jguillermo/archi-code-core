# La transacción es del repositorio

Los libros sacan las transacciones del dominio y las controlan desde la aplicación [IDDD cap. 12; PHP: Repositories, "Managing Transactions"]. Con el paquete bajan al repositorio y la aplicación no tiene puerto para ellas `[Fuera de los libros: convención de @archi-code/ddd]`. Como un caso de uso cambia un agregado y lo guarda una vez [IDDD cap. 10], basta una escritura atómica por agregado.

El adaptador, y nadie más: atomicidad de `save`/`remove`, versión en su `WeakMap`, conexión/sesión/pool y errores del driver en `InternalErrorException` con `{ cause }` (reglas en `ddd-skills/archi-code-ddd/repositories.md`, apartado Rules).

## Varias tablas en PostgreSQL

`[Fuera de los libros: esquema propio siguiendo IDDD cap. 6]` El pedido ocupa `orders` (`id`, `version`, `customer_id`, `status`, `data JSONB`) y `order_lines` (`order_id` con `ON DELETE CASCADE`, `position`, `sku`, `quantity`, `unit_price`). `save` escribe las dos en una transacción que abre y confirma dentro, con su propia conexión de `PgPool` (interfaz estructural de los métodos de `pg` que usa, en `infrastructure/persistence/pg-pool.ts`). `ConcurrencyException` viene de `@archi-code/ddd/application` e `InternalErrorException` de `@archi-code/ddd/infrastructure`:

```ts
async save(order: Order): Promise<void> {
  const version = this.versions.get(order) ?? 0;
  const { lines, ...data } = order.toPrimitives();
  const client = await this.pool.connect();
  let broken = false;
  try {
    await client.query('BEGIN');
    const { rowCount } =
      version === 0
        ? await client.query(
            'INSERT INTO orders (id, version, customer_id, status, data) VALUES ($1, 1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
            [data.id, data.customerId, data.status, data],
          )
        : await client.query(
            'UPDATE orders SET version = version + 1, status = $3, data = $4 WHERE id = $1 AND version = $2',
            [data.id, version, data.status, data],
          );
    if (rowCount === 0) {
      throw new ConcurrencyException('Order', order.id.value, version);
    }
    await client.query('DELETE FROM order_lines WHERE order_id = $1', [data.id]);
    for (const [position, line] of lines.items.entries()) {
      await client.query(
        'INSERT INTO order_lines (order_id, position, sku, quantity, unit_price) VALUES ($1, $2, $3, $4, $5)',
        [data.id, position, line.sku, line.quantity, line.unitPrice],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {
      broken = true;
    });
    if (error instanceof ConcurrencyException) {
      throw error;
    }
    throw new InternalErrorException(`writing order ${order.id.value}`, { cause: error });
  } finally {
    client.release(broken);
  }
  this.versions.delete(order);
}
```

* La transacción empieza y termina dentro de `save`: el caso de uso ve una escritura entera o ninguna.
* El `UPDATE ... AND version = $2` bloquea la fila hasta el `COMMIT`; otro `save` del mismo pedido espera, no casa ninguna fila y recibe `ConcurrencyException`. Un id ya ocupado al dar de alta, igual.
* El `WeakMap` olvida el pedido solo tras el `COMMIT` (`versions.delete(order)`): un agregado guardado no se vuelve a usar y, para cambiarlo otra vez, se recarga. Si se revierte, conserva la versión anterior y el caso de uso puede recargar. Al cargar, `fromPrimitives` y luego `versions.set(order, row.version)`.
* Si el `ROLLBACK` falla, se relanza el error del trabajo y `release(true)` destruye la conexión.
* `findById` lee pedido y líneas en una sola sentencia (mismo instante); `remove` sigue el mismo patrón (`DELETE ... WHERE id = $1 AND version = $2`, las líneas caen por `ON DELETE CASCADE`).
* Con MongoDB no hace falta: un documento por agregado, `replaceOne` atómico (`ddd-skills/ddd-repositorios-persistencia/references/implementacion-ts.md`).

## Outbox

Si un evento no puede perderse, el repositorio lo guarda en la misma transacción antes del `COMMIT` y un reenviador lo entrega por un `EventChannel` `[Fuera de los libros: convención de @archi-code/ddd]`. Sin outbox, el caso de uso guarda y luego publica: si `publish` falla tras `save`, el cambio queda y el evento puede perderse. Con outbox, el repositorio toma los eventos con `pullDomainEvents()` y el `publish` posterior recibe una lista vacía; el caso de uso no cambia. Código del outbox en PostgreSQL y del reenviador: `ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`, apartados "Outbox en el repositorio" y "Reenviador"; diseño en `ddd-skills/ddd-eventos-dominio/GUIA.md`.

## Reintento en el caso de uso

Ante `ConcurrencyException`, un comando seguro de repetir puede reintentarse con límite, recargando, cambiando y guardando de nuevo dentro de `handle`; si no, llega al usuario como 409 [IDDD cap. 10; IDDD apéndice A] `[Fuera de los libros: convención de @archi-code/ddd]`. Nunca con el agregado ya cargado ni para un cambio relativo (un descuento se aplicaría dos veces). Un caso de uso por reacción no reintenta: lo hace la reentrega del canal. Código: `ddd-skills/archi-code-ddd/use-cases.md`, apartado Code (`ChangeShippingAddress`); reacciones en `ddd-skills/archi-code-ddd/reactions.md`. En tests, el repositorio en memoria (`ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`) comprueba versiones igual que uno real: dos `execute` en paralelo prueban el reintento.
