# Persistir value objects sin deformar el modelo

## Principio

El modelo de datos se subordina al de dominio. Claves, integridad referencial e índices no deben dictar cómo se modelan los objetos [IDDD cap. 6]. El informe y la analítica, mejor sobre un modelo de datos propio y no sobre las tablas de producción [IDDD cap. 6].

Antes de convertir un valor en entidad "porque tiene tabla", responde [IDDD cap. 6]:
1. ¿Es una cosa del dominio o mide, cuantifica o describe una cosa?
2. ¿Tiene la mayoría de las características de valor?
3. ¿Lo hago entidad solo porque el modelo de datos lo guarda como entidad?
4. ¿El dominio exige identidad única, me importan los ejemplares y su continuidad de cambio?

"Describe, sí, sí, no" → value object.

## Opciones

| Opción | Cuándo | Notas |
|---|---|---|
| Columnas en la fila del padre | Un único value object (`total_amount`, `total_currency`) | La opción por defecto y la más limpia [IDDD cap. 6] |
| Varios valores serializados en una columna (JSON) | Colecciones pequeñas que no se consultan por dentro | Cuidado con el tamaño de columna y la consulta [IDDD cap. 6]. En PostgreSQL, `jsonb` |
| Tabla propia para una colección | Colecciones grandes o que se consultan | La fila tiene clave técnica, pero en el modelo sigue siendo valor [IDDD cap. 6] |
| Tabla de unión | Colecciones referenciadas | Variante de la anterior [IDDD cap. 6] |
| Estado como enum | Tipos estándar | Guarda el código, no un objeto [IDDD cap. 6] |

*DDD in PHP* resume las mismas alternativas (valor embebido, serialización como LOB y mapeo ad hoc con el ORM) [PHP: Value Objects].

## En TypeScript

`[Fuera de los libros: convención de @archi-code/ddd]`
* Nada de mappers escritos a mano ni decoradores de ORM en las clases de dominio. El agregado da sus datos planos con `toPrimitives()` y se rehace con `static fromPrimitives()`; el repositorio solo llama a `order.toPrimitives()` y `Order.fromPrimitives(row).restoreVersion(version)`. Nada comprueba en ejecución que no se pierda ningún campo privado: lo prueba el spec del agregado con el viaje de ida y vuelta (`Order.fromPrimitives(order.toPrimitives()).toPrimitives()` igual a `order.toPrimitives()`).
* Los primitivos ya dan la forma de cada opción de la tabla: un value object simple es su valor, un `Composite` es un objeto (`shippingAddress: { street, city, country }`), una lista de composites es una lista de objetos (`lines: { items: [...] }`) y un `EnumType` es la opción del enum (`status: 'pending'`).
* Con un almacén de documentos (MongoDB), los primitivos se guardan tal cual. Con tablas, el repositorio decide cómo se reparten en columnas: el formato de la fila sigue en infraestructura y no deforma el modelo.

```ts
import type { PrimitiveTypes } from '@archi-code/ddd/domain';

type OrderPrimitives = PrimitiveTypes<Order>;

interface OrderRow {
  id: string;
  customer_id: string;
  ship_street: string;
  ship_city: string;
  ship_country: string;
  lines: OrderPrimitives['lines']['items'];
  status: string;
  stock_reservation: string | null;
  payment_authorization: OrderPrimitives['paymentAuthorization'];
  version: number;
}

function rowOf(order: Order): OrderRow {
  const primitives = order.toPrimitives();
  return {
    id: primitives.id,
    customer_id: primitives.customerId,
    ship_street: primitives.shippingAddress.street,
    ship_city: primitives.shippingAddress.city,
    ship_country: primitives.shippingAddress.country,
    lines: primitives.lines.items,
    status: primitives.status,
    stock_reservation: primitives.stockReservation,
    payment_authorization: primitives.paymentAuthorization,
    version: order.version + 1,
  };
}

function orderOf(row: OrderRow): Order {
  return Order.fromPrimitives({
    id: row.id,
    customerId: row.customer_id,
    lines: { items: row.lines },
    shippingAddress: {
      street: row.ship_street,
      city: row.ship_city,
      country: row.ship_country,
    },
    status: row.status as Status,
    stockReservation: row.stock_reservation,
    paymentAuthorization: row.payment_authorization,
  }).restoreVersion(row.version);
}
```

`Order`, `ShippingAddress` y `Status` son los de `ddd-skills/ddd-agregados/references/implementacion-ts.md`. La dirección va en columnas de la fila del padre, las líneas y la autorización de pago en columnas JSON (`jsonb` en PostgreSQL) y el estado como su código. Con el driver `pg`, una columna `jsonb` se lee ya como objeto (la fecha de caducidad de la autorización llega como texto ISO, que `ExpiresAt` convierte), y al escribir el parámetro se pasa como `JSON.stringify(row.lines)` (un array sin convertir lo enviaría como array de PostgreSQL). La `version` se guarda junto a los primitivos, nunca dentro; la consulta con la condición de versión y `markPersisted()` están en `ddd-skills/ddd-repositorios-persistencia/GUIA.md`.

* Al cargar, `fromPrimitives` rehace cada value object con su constructor, que valida: un dato corrupto falla al cargar (`ValidationException`) en vez de propagarse. No se repiten reglas de creación ni se registran eventos.
* Con Prisma o Drizzle, el esquema es de infraestructura y el repositorio sigue pasando por `order.toPrimitives()` y `Order.fromPrimitives()`.
