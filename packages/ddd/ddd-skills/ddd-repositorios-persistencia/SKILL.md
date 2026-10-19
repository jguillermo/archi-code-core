# Repositorios y persistencia

> Guía de la suite DDD de @archi-code/ddd: se lee solo a través del skill `archi-code-ddd` (packages/ddd/SKILL.md), nunca como skill independiente.

**Cuándo usarla.** Úsala siempre que haya que guardar o cargar agregados, integrar Prisma, TypeORM, Drizzle, MikroORM, pg o MongoDB con un modelo de dominio, diseñar métodos find/save, gestionar transacciones, o cuando el ORM esté dictando la forma de las clases del dominio, aunque no se mencione "repository".

Un repositorio da la ilusión de una colección en memoria con todos los agregados de un tipo, con una interfaz conocida para añadir, quitar y seleccionar. **Solo los agregados tienen repositorio**, normalmente uno por tipo de agregado [IDDD cap. 12, citando a Evans].

## Convenciones de la suite DDD

* **Trazabilidad.** Cada regla indica su origen: `[Destilado cap. N]`, `[IDDD cap. N]`, `[PHP: capítulo]`. Lo que no sale de esos libros va marcado `[Fuera de los libros]`. Respeta estas marcas al responder.
* **Idioma.** Responde en el idioma de la persona. El código de ejemplo es TypeScript.
* **Honestidad del modelo.** Si faltan datos (motor de base de datos, ORM, volumen), declara los supuestos.

## Reglas

1. **Un repositorio por agregado**, nunca por entidad interna ni por tabla [IDDD cap. 12]. **Solo obtiene y persiste**: sin lógica de negocio, sin reglas y sin consultas de negocio `[Fuera de los libros: convención de @archi-code/ddd]`.
2. **La interfaz vive en el dominio** con lenguaje del dominio; la implementación, en infraestructura [IDDD cap. 4 y cap. 12; PHP: Repositories].
3. **Devuelve agregados completos** (o value objects para consultas concretas), nunca filas, DTOs del ORM ni partes que la raíz no permita alcanzar [IDDD cap. 12].
4. **No es un DAO.** Un DAO se expresa en términos de tablas y CRUD; un repositorio, en términos de colección de agregados. Operaciones CRUD de grano fino sobre partes del agregado rompen su encapsulación [IDDD cap. 12; PHP: Repositories].
5. **El dominio no gestiona transacciones.** Las controla la capa de aplicación [IDDD cap. 12; Destilado cap. 2].
6. **Una transacción, un agregado.** Que funcione en tests no significa que funcione en producción con concurrencia [IDDD cap. 12].
7. **Nada de lógica de negocio en procedimientos almacenados** salvo requisito no funcional que lo exija; aleja la lógica del equipo y del lenguaje [IDDD cap. 12].

## Paso 1. Elegir el estilo

| Estilo | Interfaz | Cuándo [IDDD cap. 12; PHP: Repositories] |
|---|---|---|
| Orientado a colección | `add`, `remove`, `byId`; los cambios se detectan solos | El mecanismo tiene unidad de trabajo que rastrea cambios |
| Orientado a persistencia | `save`, `remove`, `byId`; hay que guardar explícitamente | Sin rastreo de cambios (almacenes clave-valor, documentos) o cuando es realista cambiar de mecanismo |

**Recomendación para TypeScript: orientado a persistencia** `[Fuera de los libros]`. Los clientes más usados (pg, Prisma, Drizzle) no rastrean cambios de objetos de dominio, y un `save` explícito es más legible. Si usas MikroORM con su unidad de trabajo, el estilo colección es posible, pero ata el dominio al ORM.

## Paso 2. Diseñar la interfaz

`[Fuera de los libros: convención de @archi-code/ddd]` El contrato del dominio son roles segregados; cada caso de uso pide solo los que usa:

```ts
// domain/order/OrderRepository.ts
import type { AggregateFinder, AggregateRemover, AggregateSaver } from '@archi-code/ddd/domain';

export type OrderFinder = AggregateFinder<Order>;   // findById(id): Promise<Order | null>
export type OrderSaver = AggregateSaver<Order>;     // save(order): alta y cambios; comprueba versión
export type OrderRemover = AggregateRemover<Order>; // delete(id)

// un caso de uso que carga y guarda: AggregateFinder<Order> & AggregateSaver<Order>
```

* Solo `findById`, `save` y `delete`. Nada de métodos con nombre de negocio (`pendingOlderThan`), ni `findBy(field, value)`, ni `size`, ni reglas.
* La identidad se genera temprano en el value object (`OrderId.generate()`), no con un `nextId()` del repositorio [IDDD cap. 5 para la identidad temprana].
* Lo que el negocio necesita encontrar ("pedidos pendientes desde hace más de 24 h") es una **consulta de lectura** de la capa de aplicación con nombre del lenguaje (`StaleOrders.ids(olderThan)`), que devuelve identidades o DTOs; el caso de uso carga cada agregado con `findById` (ver Paso 5).
* El adaptador en memoria para tests puede ofrecer `findAll()` como comodidad de los tests; no forma parte del contrato del dominio.

## Paso 3. Implementar

Guía completa con PostgreSQL, Prisma y MongoDB en `references/implementacion-ts.md`. Puntos clave:

* Un **mapper** convierte entre el agregado y su forma persistida, usando las factorías de los value objects y `reconstitute` [IDDD cap. 6].
* La **versión** se comprueba al guardar (concurrencia optimista) [IDDD cap. 10].
* Los **eventos** del agregado se guardan en la misma transacción (outbox, `ddd-eventos-dominio`).
* El **esquema** sirve al modelo, no al revés [IDDD cap. 6]. Un agregado pequeño encaja a menudo en una fila con columnas `jsonb` para sus value objects.

## Paso 4. Transacciones

La aplicación abre y cierra la transacción; el repositorio usa la conexión de la transacción en curso. En Node, `AsyncLocalStorage` permite hacerlo sin pasar la conexión por todos los métodos `[Fuera de los libros]`. Patrón en `references/transacciones-ts.md`.

## Paso 5. Consultas

* Para pantallas que cruzan varios agregados, IDDD admite consultas optimizadas por caso de uso que devuelven un value object a medida. Si necesitas muchas, sospecha: o los límites de agregado están mal ("el repositorio enmascara un mal diseño de agregados") o te conviene CQRS [IDDD cap. 12].
* Separa siempre: el repositorio para obtener y persistir agregados, y consultas de lectura (`OrderSummaries`, `StaleOrders`) en la capa de aplicación que van directas a la base de datos `[Fuera de los libros]`. Con `@archi-code/criteria` se expresan filtros tipados para esas lecturas.
* El patrón Specification expresa reglas de selección del negocio en memoria (sobre datos ya cargados); no se convierte en un método `query(spec)` del repositorio `[Fuera de los libros: convención de @archi-code/ddd; PHP: Repositories lo propone en el repositorio]`. Código en `ddd-value-objects-entidades`, referencia `specification-y-diseno-flexible.md`.

## Paso 6. Probar

Dos tipos de prueba [IDDD cap. 12]:
* **Del repositorio real**, contra la base de datos de verdad (por ejemplo con Testcontainers) `[herramienta fuera de los libros]`.
* **Del código que usa repositorios**, con una implementación **en memoria** cuando la real es lenta o aún no existe [IDDD cap. 12; PHP: Repositories].

Un mismo conjunto de tests de contrato se ejecuta contra ambas implementaciones para que la versión en memoria no mienta `[Fuera de los libros]`. Ver `references/tests-repositorios.md`.

## Señales de alarma

* `UserRepository`, `OrderLineRepository`, `AddressRepository`: repositorios de partes internas.
* El repositorio devuelve tipos de Prisma o TypeORM.
* Decoradores `@Entity` del ORM en clases del dominio.
* `updateStatus(id, status)` en el repositorio: CRUD de grano fino que salta al agregado.
* Métodos con nombre o reglas de negocio en el repositorio (`pendingOlderThan`, `findOverdueInvoices`), o `nextId()`: el repositorio solo obtiene y persiste.
* El repositorio hace `BEGIN`/`COMMIT` por su cuenta.
* Docenas de métodos `findByXAndYOrderByZ` para pantallas.
* Implementación en memoria que no comprueba versiones ni copia objetos (los tests pasan, producción falla).

## Siguiente skill

* Casos de uso que usan los repositorios → `ddd-servicios-capa-aplicacion`.
* Persistir como eventos en vez de estado → `ddd-event-sourcing-cqrs`.
