# Implementar repositorios en TypeScript

Ejemplos con el `Order` de `ddd-skills/ddd-agregados/references/implementacion-ts.md`. El repositorio abstracto (un verbo por rol, solo los que el negocio usa), el adaptador en memoria, el de IndexedDB y el de MongoDB con su comprobación de versión: `ddd-skills/archi-code-ddd/repositories.md`, apartados Rules y Code. `search` con `Criteria`: `ddd-skills/archi-code-ddd/criteria.md` `[Fuera de los libros: convención de @archi-code/ddd]`.

## Qué se guarda

`PrimitiveTypes<Order>`, un documento o fila por agregado, con la versión **al lado**, nunca dentro [IDDD cap. 6 y cap. 10] `[Fuera de los libros: convención de @archi-code/ddd]`. Los constructores de los value objects validan al cargar: un dato corrupto falla en `fromPrimitives`, no dentro del modelo. Si `save` lanza, el `WeakMap` conserva la versión anterior y el caso de uso descarta el objeto y recarga; al ser `WeakMap`, un agregado sin uso no retiene memoria.

## MongoDB

Un documento por agregado; cada escritura es atómica por sí misma, sin sesión [IDDD cap. 12]. Código: `ddd-skills/archi-code-ddd/repositories.md`, apartado Code (`MongoOrderRepository`). Detalles de este adaptador que esa guía no muestra `[Fuera de los libros: convención de @archi-code/ddd]`:

* Un `_id` ocupado al dar de alta (error 11000 de `MongoServerError`) es `ConcurrencyException('Order', id, 0, { cause: error })`, no `InternalErrorException`.
* `remove` de un agregado nunca guardado (versión 0) no borra nada, pero si el id está ocupado es conflicto.
* `remove` también envuelve los errores del driver en `InternalErrorException` con `{ cause }`.

El conflicto lo puede reintentar el caso de uso y `ExceptionClassifier` lo clasifica como `ExceptionKind.Conflict` (409). Cuida el formato serializado [IDDD cap. 12].

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
