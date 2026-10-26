# Repositorios y persistencia

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Los ejemplos están escritos con la API de `@archi-code/ddd` (las clases de su `src`) y se copian tal cual. Las guías deciden el diseño; la forma del código (carpetas y nombres, eventos, constructor y `create` del agregado, casos de uso de usuario y por reacción) la fija `ddd-skills/archi-code-ddd/`, que manda si un ejemplo difiere. El paquete se aparta de los libros donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]`; cualquier otra discrepancia sobre una regla de DDD es un defecto del paquete.
>
> **Cuándo consultar esta guía.** Repositorios DDD y persistencia de agregados en TypeScript/Node. Cubre un repositorio por agregado, repositorios orientados a colección frente a orientados a persistencia (save), interfaz en el dominio e implementación en infraestructura, mappers entre filas o documentos y el modelo, concurrencia optimista, la transacción como responsabilidad del repositorio, consultas y "use case optimal queries", diferencias con un DAO, implementaciones en memoria y tests de contrato. Consúltala siempre que haya que guardar o cargar agregados, integrar Prisma, TypeORM, Drizzle, MikroORM, pg o MongoDB con un modelo de dominio, diseñar métodos find/save, gestionar transacciones, o cuando el ORM esté dictando la forma de las clases del dominio, aunque no se mencione "repository".

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* El dominio de cada contexto declara **un repositorio abstracto por agregado** en `domain/repository/<Agregado>Repository.ts`: `export abstract class OrderRepository extends AggregateRepository<Order> implements AggregateFinder<Order>, AggregateSaver<Order>`. `AggregateRepository` (de `@archi-code/ddd/domain`) no declara ningún verbo; la clase declara como `abstract` solo los verbos que el negocio de ese agregado necesita, cada uno el método de su rol del paquete (`AggregateFinder.findById`, `AggregateSaver.save`, `AggregateRemover.remove`, este solo si el negocio borra el agregado), y nada más: sin otros métodos, consultas de negocio ni código.
* Todos los casos de uso de usuario y por reacción del agregado reciben esa clase abstracta (`private readonly orders: OrderRepository`), nunca `AggregateFinder<Order> & AggregateSaver<Order>` ni un rol suelto como tipo de una dependencia.
* Los repositorios solo obtienen y persisten: sin `nextId()`, eventos ni consultas de negocio como `pendingOlderThan`, que pasan a ser read models en `application/` (fila, store, puerto de consulta y proyección). Un doble de test puede añadir ayudas técnicas para sus tests (`versionOf(id)`, `findAll()`), que ningún caso de uso ve porque los casos de uso reciben la clase abstracta.
* Cada repositorio es único para su agregado y su tecnología, en `infrastructure/persistence/<tecnología>-<agregado>-repository.ts` (`MongoOrderRepository extends OrderRepository`, que implementa exactamente los verbos que declara la clase abstracta) y sabe qué agregado reconstruye. Su constructor (con `super()` primero) recibe solo las dependencias de su tecnología (una `collection` de MongoDB, un `pool` de Postgres), nunca la clase del agregado ni un mapper; los agregados solo entran y salen por sus métodos (`save(order)`, `remove(order)`, `findById(id)` → `Order | null`).
* La conversión es del agregado, su único dueño: `toPrimitives()` y `static fromPrimitives()` (instantánea o Memento), sin un mapper, un servicio de dominio ni una comprobación de forma en medio. El repositorio no lee campos del agregado: guarda `order.toPrimitives()` con la versión siguiente al lado y carga con `Order.fromPrimitives(row.primitives)`. Nada comprueba en ejecución que la conversión esté completa: lo garantiza el test del agregado con el viaje de ida y vuelta (`Order.fromPrimitives(order.toPrimitives()).toPrimitives()` igual a `order.toPrimitives()`), y quien añade un campo lo añade a los dos métodos.
* La versión de concurrencia optimista es solo del repositorio: el agregado no la declara ni la mapea y el caso de uso nunca la ve. El repositorio recuerda la versión de cada agregado que cargó o guardó en un `WeakMap<Order, number>` privado (`versions`): al cargar `this.versions.set(order, row.version)`; al guardar `const version = this.versions.get(order) ?? 0` (`0` = nuevo), escribe solo donde la versión guardada es `version` (nuevo: inserta, y un id ya existente es conflicto), guarda `version + 1` junto a los primitivos y hace `this.versions.set(order, version + 1)` solo tras escribir con éxito (en SQL, tras el `COMMIT`) `[Fuera de los libros: convención de @archi-code/ddd]`. Un conflicto es `ConcurrencyException('Order', id, version, { cause })` (HTTP 409), con el nombre del agregado como texto literal y no como nombre de clase, que los minificadores cambian.
* `remove(aggregate)` recibe el agregado cargado y comprueba su versión como `save`: borrar un agregado que otro cambió después de cargarlo es `ConcurrencyException`.
* El repositorio no publica eventos: lo hace el caso de uso con `events.publish(order.pullDomainEvents())` después de `save`.
* La transacción es del repositorio: no hay puerto de transacciones en `@archi-code/ddd/application` y la aplicación nunca abre, une ni cierra una. Cada `save`/`remove` es una escritura atómica, y si el agregado ocupa varias tablas el repositorio abre y confirma la transacción de la base de datos dentro de ese método, con su propia conexión o sesión.
* El paquete no da un repositorio en memoria: cada proyecto escribe el suyo, uno por agregado (`InMemoryOrderRepository`), con el mismo contrato que el real (copias `structuredClone` en las dos direcciones, versiones en un `WeakMap` y su comprobación). Es una implementación más [IDDD cap. 12]: vive en `infrastructure/persistence/in-memory-order-repository.ts` cuando la aplicación corre en memoria, o en `test/support/` cuando solo es un doble de test, y se usa con un `DomainEventBus` sobre `InMemoryEventChannel`. Solo tiene `findAll()` si los tests del proyecto lo necesitan; un repositorio real no lo tiene.

Un repositorio da la ilusión de una colección en memoria con todos los agregados de un tipo, con una interfaz conocida para añadir, quitar y seleccionar. **Solo los agregados tienen repositorio**, normalmente uno por tipo de agregado [IDDD cap. 12, citando a Evans].


## Reglas

1. **Un repositorio por agregado**, nunca por entidad interna ni por tabla [IDDD cap. 12].
2. **La interfaz vive en el dominio** con lenguaje del dominio; la implementación, en infraestructura [IDDD cap. 4 y cap. 12; PHP: Repositories]. Con el paquete es una clase abstracta por agregado en `domain/repository/OrderRepository.ts` que extiende `AggregateRepository<Order>` e implementa los roles de sus verbos `[Fuera de los libros: convención de @archi-code/ddd]`, y tu adaptador (`MongoOrderRepository extends OrderRepository`) vive en `infrastructure/persistence/`.
3. **Devuelve agregados completos** (o value objects para consultas concretas), nunca filas, DTOs del ORM ni partes que la raíz no permita alcanzar [IDDD cap. 12].
4. **No es un DAO.** Un DAO se expresa en términos de tablas y CRUD; un repositorio, en términos de colección de agregados. Operaciones CRUD de grano fino sobre partes del agregado rompen su encapsulación [IDDD cap. 12; PHP: Repositories].
5. **El dominio no gestiona transacciones** [IDDD cap. 12; Destilado cap. 2]. Los libros las controlan desde la capa de aplicación; con el paquete las controla el repositorio, dentro de `save`/`remove`, y la aplicación tampoco las ve `[Fuera de los libros: convención de @archi-code/ddd]`.
6. **Una escritura atómica, un agregado.** La "transacción por agregado" de los libros es aquí una escritura atómica por agregado, garantizada por el repositorio. Que funcione en tests no significa que funcione en producción con concurrencia [IDDD cap. 12].
7. **Nada de lógica de negocio en procedimientos almacenados** salvo requisito no funcional que lo exija; saca la lógica del modelo y de su lenguaje [IDDD cap. 12].

## Paso 1. Elegir el estilo

| Estilo | Interfaz | Cuándo [IDDD cap. 12; PHP: Repositories] |
|---|---|---|
| Orientado a colección | `add`, `remove` y búsqueda por id; los cambios se detectan solos | El mecanismo tiene unidad de trabajo que rastrea cambios |
| Orientado a persistencia | `save`, `remove` y búsqueda por id; hay que guardar explícitamente | Sin rastreo de cambios (almacenes clave-valor, documentos) o cuando es realista cambiar de mecanismo |

**Con el paquete el estilo es orientado a persistencia** `[Fuera de los libros: convención de @archi-code/ddd]`: los únicos verbos son `findById`, `save` y `remove`, y cada cambio se guarda con un `save` explícito. Los clientes más usados (driver de MongoDB, pg, Prisma, Drizzle) no rastrean cambios de objetos de dominio, y un `save` explícito es más legible. Una unidad de trabajo de ORM (MikroORM) ataría el dominio al ORM.

## Paso 2. Declarar el repositorio del agregado

Como en los libros, el dominio declara un repositorio por agregado [IDDD cap. 12; PHP: Repositories]. Con el paquete es una clase abstracta en `domain/repository/OrderRepository.ts` (no una interfaz) que extiende `AggregateRepository<Order>` y declara solo los verbos que el negocio del agregado necesita, cada uno el método del rol del paquete que implementa, para que todos los repositorios hablen los mismos verbos con las mismas firmas `[Fuera de los libros: convención de @archi-code/ddd]`:

| Rol (`@archi-code/ddd/domain`) | Método | Contrato |
|---|---|---|
| `AggregateFinder<Order>` | `findById(id: OrderId): Promise<Order \| null>` | Devuelve el agregado completo con su versión almacenada, o `null` |
| `AggregateSaver<Order>` | `save(order: Order): Promise<void>` | Alta (versión 0) y cambios; comprueba la versión que recuerda su `WeakMap` y la actualiza tras escribir |
| `AggregateRemover<Order>` | `remove(order: Order): Promise<void>` | Borra el agregado cargado solo si nadie lo cambió después; solo si el negocio borra el agregado |

```ts
import { AggregateRepository } from '@archi-code/ddd/domain';
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';

export abstract class OrderRepository
  extends AggregateRepository<Order>
  implements AggregateFinder<Order>, AggregateSaver<Order>
{
  abstract findById(id: OrderId): Promise<Order | null>;
  abstract save(order: Order): Promise<void>;
}
```

Si el negocio borra pedidos, la clase añade `abstract remove(order: Order): Promise<void>` e `implements AggregateRemover<Order>`. Ningún verbo es obligatorio y no hay otros. Todos los casos de uso del agregado, de usuario y por reacción, reciben esa clase abstracta, nunca los roles. Constructor de `AddOrderLine` (la clase completa, con `toCommand` y `handle`, está en `ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`):

```ts
import { UseCase } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';

export class AddOrderLine extends UseCase<AddOrderLineInput, AddOrderLineCommand, void> {
  constructor(
    private readonly orders: OrderRepository,
    private readonly events: EventBus,
    private readonly clock: Clock,
  ) {
    super();
  }
}
```

* El repositorio solo obtiene y persiste: sin lógica de negocio, sin consultas de negocio (`pendingOlderThan`) y sin generar identidades (`nextId()`) `[Fuera de los libros: convención de @archi-code/ddd]`. La identidad nueva la genera su value object (`OrderId.generate()`, ver `ddd-skills/ddd-value-objects-entidades/GUIA.md`); las selecciones son read models (Paso 5).
* Nada de `findAll()` ni `findBy(field, value)` genéricos.
* Consultas para pantallas que cruzan agregados no van aquí: van a read models (ver Paso 5).

## Paso 3. Implementar

Guía completa con MongoDB, PostgreSQL y Prisma en `ddd-skills/ddd-repositorios-persistencia/references/implementacion-ts.md`. Puntos clave:

* El agregado se convierte en datos planos y vuelve a construirse con sus value objects [IDDD cap. 6]: la conversión es del propio agregado y el repositorio llama a `order.toPrimitives()` y a `Order.fromPrimitives(row.primitives)` `[Fuera de los libros: convención de @archi-code/ddd]`. Que no falte ningún campo lo prueba el test de ida y vuelta del agregado, no una comprobación en ejecución.
* La **versión** se comprueba al guardar y al borrar (concurrencia optimista) [IDDD cap. 10]: se guarda junto a los primitivos, nunca dentro; el repositorio la recuerda por agregado en su `WeakMap` y la actualiza solo tras escribir con éxito `[Fuera de los libros: convención de @archi-code/ddd]`.
* Los **eventos** los publica el caso de uso con `EventBus.publish` después de `save`. Si un evento no puede perderse, el repositorio escribe el agregado y sus eventos pendientes en la misma escritura atómica (outbox) y un proceso aparte los entrega después por un `EventChannel` (`ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`, `ddd-skills/ddd-eventos-dominio/GUIA.md`).
* El **esquema** sirve al modelo, no al revés [IDDD cap. 6]. Un agregado pequeño encaja a menudo en un documento, o en una fila con una columna `jsonb` para sus value objects.

## Paso 4. Transacciones

La transacción es del repositorio, como todo lo demás de la persistencia `[Fuera de los libros: convención de @archi-code/ddd]`. La aplicación no abre, une ni cierra transacciones: el caso de uso carga, llama al método de negocio, `await this.orders.save(order)` y después `await this.events.publish(order.pullDomainEvents())`. El adaptador garantiza que cada `save`/`remove` es atómico (un documento en MongoDB; varias tablas SQL en una transacción que abre y confirma o revierte dentro del propio `save`, con su conexión), comprueba la versión (`ConcurrencyException`), gestiona la conexión, la sesión y el pool, y envuelve los errores del driver en `InternalErrorException` con `{ cause }`. Un conflicto se reintenta en `handle` volviendo a cargar y a guardar, con un límite y solo para comandos seguros de repetir. En tests basta el `InMemoryOrderRepository` del proyecto. Patrón y ejemplos en `ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`.

## Paso 5. Consultas

* Para pantallas que cruzan varios agregados, IDDD admite consultas optimizadas por caso de uso que devuelven un value object a medida. Si necesitas muchas, sospecha: o los límites de agregado están mal ("el repositorio enmascara un mal diseño de agregados") o te conviene CQRS [IDDD cap. 12].
* En la práctica, separa: el repositorio del agregado (`OrderRepository`) para escribir y un read model para leer `[Fuera de los libros: convención de @archi-code/ddd]`: en `application/order-summaries/`, la fila de primitivos (`OrderSummary`), un puerto de store que escribe la proyección (`find`, `hasApplied(eventId)`, `save(row, eventId)`), un puerto de consulta que el controlador lee directamente (`OrderSummaries`: `byId`, `ofCustomer`, con filtros de `@archi-code/criteria` si hace falta) y un caso de uso por reacción por cada evento que cambia la fila; una clase de infraestructura implementa los dos puertos sobre la base de datos. Nunca carga agregados con el repositorio. Ejemplo en `ddd-skills/ddd-repositorios-persistencia/references/implementacion-ts.md` y `ddd-skills/ddd-event-sourcing-cqrs/references/proyecciones-cqrs-ts.md`.
* *DDD in PHP* propone consultar el repositorio con especificaciones (`query(specification)`) [PHP: Repositories; PHP: Factories]. Aquí no: el repositorio no selecciona por criterios de negocio `[Fuera de los libros: convención de @archi-code/ddd]`. Una selección con nombre del negocio es una consulta de un read model que devuelve ids o filas; una `Specification` se aplica sobre datos ya cargados (`ddd-skills/ddd-value-objects-entidades/references/specification-y-diseno-flexible.md`).

## Paso 6. Probar

Dos tipos de prueba [IDDD cap. 12]:
* **Del repositorio real**, contra la base de datos de verdad (por ejemplo con Testcontainers o `mongodb-memory-server`) `[herramienta fuera de los libros]`.
* **Del código que usa repositorios**, con una implementación **en memoria** cuando la real es lenta o aún no existe [IDDD cap. 12; PHP: Repositories]. Con el paquete la escribe el proyecto, una por agregado (`new InMemoryOrderRepository()`, que extiende `OrderRepository`), como cualquier otra implementación, en `infrastructure/persistence/` o en `test/support/` `[Fuera de los libros: convención de @archi-code/ddd]`.

Un mismo conjunto de tests de contrato, en `test/support/` del proyecto, se ejecuta contra ambas implementaciones para que la versión en memoria no mienta `[Fuera de los libros]`. Ver `ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`.

## Señales de alarma

* `UserRepository`, `OrderLineRepository`, `AddressRepository`: repositorios de partes internas.
* Un agregado sin su repositorio abstracto en `domain/repository/`, una `interface OrderRepository`, o una clase abstracta que no extiende `AggregateRepository<Order>` ni implementa el rol de cada verbo.
* Un caso de uso tipado con los roles (`AggregateFinder<Order> & AggregateSaver<Order>`) en vez de `OrderRepository`.
* Verbos que el negocio no necesita (`remove` de un agregado que nunca se borra) o métodos distintos de `findById`, `save` y `remove` en el repositorio abstracto.
* El repositorio devuelve tipos de Prisma, documentos de MongoDB o filas.
* Decoradores `@Entity` del ORM en clases del dominio.
* `updateStatus(id, status)` en el repositorio: CRUD de grano fino que salta al agregado.
* El caso de uso recibe una dependencia `transactions`, `unitOfWork` o parecida, o abre `BEGIN`/`COMMIT` o `startTransaction()`: la transacción es del repositorio.
* Un repositorio que reparte un agregado en varias tablas sin agrupar sus sentencias en una transacción dentro de `save`.
* Docenas de métodos `findByXAndYOrderByZ` para pantallas.
* El repositorio lee campos del agregado o construye filas a mano en vez de llamar a `order.toPrimitives()` y `Order.fromPrimitives(row)`.
* El constructor del repositorio recibe la clase del agregado o un mapper: recibe solo las dependencias de su tecnología.
* Un campo nuevo del agregado que no está en `toPrimitives()`/`fromPrimitives()`, sobre todo uno privado que `PrimitiveTypes<Order>` no ve, sin un test de ida y vuelta que lo detecte.
* `save` con `upsert` sin condición de versión, cargar sin recordar la versión almacenada en el `WeakMap`, olvidar actualizarla tras escribir (el segundo `save` del mismo objeto da un falso conflicto) o actualizarla antes de que la escritura termine. También la versión dentro de `toPrimitives()` o como campo del agregado.
* Un repositorio en memoria que no comprueba versiones ni copia objetos (los tests pasan, producción falla): escríbelo como `InMemoryOrderRepository` y ejecuta contra él la suite de contrato.
* Un repositorio genérico compartido por varios agregados.

## Siguiente guía

* Casos de uso que usan los repositorios → `ddd-skills/ddd-servicios-capa-aplicacion/GUIA.md`.
* Persistir como eventos en vez de estado → `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`.
