# Repositorios y persistencia

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Los ejemplos están escritos con la API de `@archi-code/ddd` (las clases de su `src`) y se copian tal cual; las guías son la fuente de verdad: el paquete solo se aparta de ellas donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]`, y cualquier otra discrepancia es un defecto del paquete.
>
> **Cuándo consultar esta guía.** Repositorios DDD y persistencia de agregados en TypeScript/Node. Cubre un repositorio por agregado, repositorios orientados a colección frente a orientados a persistencia (save), interfaz en el dominio e implementación en infraestructura, mappers entre filas o documentos y el modelo, concurrencia optimista, la transacción como responsabilidad del repositorio, consultas y "use case optimal queries", diferencias con un DAO, implementaciones en memoria y tests de contrato. Consúltala siempre que haya que guardar o cargar agregados, integrar Prisma, TypeORM, Drizzle, MikroORM, pg o MongoDB con un modelo de dominio, diseñar métodos find/save, gestionar transacciones, o cuando el ORM esté dictando la forma de las clases del dominio, aunque no se mencione "repository".

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* No hay un `Repository` completo: los contratos son tres roles en `@archi-code/ddd/domain` (`AggregateFinder.findById`, `AggregateSaver.save`, `AggregateRemover.remove`) y un caso de uso pide solo los que usa, combinados con `&`.
* Los repositorios solo obtienen y persisten: sin `nextId()` ni consultas de negocio como `pendingOlderThan`, que pasan a ser consultas de lectura en `application/`.
* El repositorio no lee campos del agregado: mapea con `AggregateMapper.of(Order)` (`toPrimitives(order)` y `fromPrimitives(row, version)`), que exige que el agregado tenga `toPrimitives()` y `static fromPrimitives()`.
* La versión de concurrencia optimista vive en la base `AggregateRoot` (`version`, `restoreVersion()`, `markPersisted()`): el agregado no la declara ni la mapea, y solo los repositorios la tocan. Un conflicto es `ConcurrencyException(mapper.aggregateName, id, version, { cause })` (HTTP 409).
* `remove(aggregate)` recibe el agregado cargado y comprueba su versión como `save`: borrar un agregado que otro cambió después de cargarlo es `ConcurrencyException`.
* El repositorio no publica eventos: lo hace el caso de uso con `events.publish(order.pullDomainEvents())` después de `save`.
* La transacción es del repositorio: no hay puerto de transacciones en `@archi-code/ddd/application` y la aplicación nunca abre, une ni cierra una. Cada `save`/`remove` es una escritura atómica, y si el agregado ocupa varias tablas el repositorio abre y confirma la transacción de la base de datos dentro de ese método, con su propia conexión o sesión.
* La referencia para tests es `InMemoryRepository(AggregateMapper.of(Order))` con un `DomainEventBus` sobre `InMemoryEventChannel`; su `findAll()` existe solo como comodidad de los tests y un repositorio real no lo tiene.

Un repositorio da la ilusión de una colección en memoria con todos los agregados de un tipo, con una interfaz conocida para añadir, quitar y seleccionar. **Solo los agregados tienen repositorio**, normalmente uno por tipo de agregado [IDDD cap. 12, citando a Evans].


## Reglas

1. **Un repositorio por agregado**, nunca por entidad interna ni por tabla [IDDD cap. 12].
2. **La interfaz vive en el dominio** con lenguaje del dominio; la implementación, en infraestructura [IDDD cap. 4 y cap. 12; PHP: Repositories]. Con el paquete, los contratos ya están en `@archi-code/ddd/domain` y tu adaptador (`MongoOrderRepository`) vive en `infrastructure/persistence/`.
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

**Con el paquete el estilo es orientado a persistencia** `[Fuera de los libros: convención de @archi-code/ddd]`: los roles son `findById`, `save` y `remove`, y cada cambio se guarda con un `save` explícito. Los clientes más usados (driver de MongoDB, pg, Prisma, Drizzle) no rastrean cambios de objetos de dominio, y un `save` explícito es más legible. Una unidad de trabajo de ORM (MikroORM) ataría el dominio al ORM.

## Paso 2. Elegir los roles

El proyecto no declara un `OrderRepository`: usa los contratos del paquete, que reciben el agregado como parámetro de tipo.

| Rol (`@archi-code/ddd/domain`) | Método | Contrato |
|---|---|---|
| `AggregateFinder<Order>` | `findById(id: OrderId): Promise<Order \| null>` | Devuelve el agregado completo con su versión almacenada, o `null` |
| `AggregateSaver<Order>` | `save(order: Order): Promise<void>` | Alta (versión 0) y cambios; comprueba la versión y llama a `markPersisted()` |
| `AggregateRemover<Order>` | `remove(order: Order): Promise<void>` | Borra el agregado cargado solo si nadie lo cambió después |

Un caso de uso pide exactamente los roles que usa. Constructor de `AddOrderLine` (la clase completa, con `toCommand` y `handle`, está en `ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`):

```ts
import { UseCase } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';

export class AddOrderLine extends UseCase<AddOrderLineInput, AddOrderLineCommand, void> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }
}
```

* El repositorio solo obtiene y persiste: sin lógica de negocio, sin consultas de negocio (`pendingOlderThan`) y sin generar identidades (`nextId()`) `[Fuera de los libros: convención de @archi-code/ddd]`. La identidad nueva la genera su value object (`OrderId.generate()`, ver `ddd-skills/ddd-value-objects-entidades/GUIA.md`); las selecciones son consultas de lectura (Paso 5).
* Nada de `findAll()` ni `findBy(field, value)` genéricos.
* Consultas para pantallas que cruzan agregados no van aquí: van a consultas de lectura (ver Paso 5).

## Paso 3. Implementar

Guía completa con MongoDB, PostgreSQL y Prisma en `ddd-skills/ddd-repositorios-persistencia/references/implementacion-ts.md`. Puntos clave:

* El agregado se convierte en datos planos y vuelve a construirse con sus value objects [IDDD cap. 6]: el repositorio usa `AggregateMapper.of(Order)`, que llama a `order.toPrimitives()` (y comprueba en tiempo de ejecución que no falte estado privado ni se devuelvan value objects) y a `Order.fromPrimitives(primitives)` más `restoreVersion(version)`.
* La **versión** se comprueba al guardar y al borrar (concurrencia optimista) [IDDD cap. 10]: se guarda junto a los primitivos, nunca dentro, y tras escribir el repositorio llama a `order.markPersisted()`.
* Los **eventos** los publica el caso de uso con `EventBus.publish` después de `save`. Si un evento no puede perderse, el repositorio escribe el agregado y sus eventos pendientes en la misma escritura atómica (outbox) y un proceso aparte los entrega después por un `EventChannel` (`ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`, `ddd-skills/ddd-eventos-dominio/GUIA.md`).
* El **esquema** sirve al modelo, no al revés [IDDD cap. 6]. Un agregado pequeño encaja a menudo en un documento, o en una fila con una columna `jsonb` para sus value objects.

## Paso 4. Transacciones

La transacción es del repositorio, como todo lo demás de la persistencia `[Fuera de los libros: convención de @archi-code/ddd]`. La aplicación no abre, une ni cierra transacciones: el caso de uso carga, llama al método de negocio, `await this.orders.save(order)` y después `await this.events.publish(order.pullDomainEvents())`. El adaptador garantiza que cada `save`/`remove` es atómico (un documento en MongoDB; varias tablas SQL en una transacción que abre y confirma o revierte dentro del propio `save`, con su conexión), comprueba la versión (`ConcurrencyException`), gestiona la conexión, la sesión y el pool, y envuelve los errores del driver en `InternalErrorException` con `{ cause }`. Un conflicto se reintenta en `handle` volviendo a cargar y a guardar, con un límite y solo para comandos seguros de repetir. En tests basta `InMemoryRepository(AggregateMapper.of(Order))`. Patrón y ejemplos en `ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`.

## Paso 5. Consultas

* Para pantallas que cruzan varios agregados, IDDD admite consultas optimizadas por caso de uso que devuelven un value object a medida. Si necesitas muchas, sospecha: o los límites de agregado están mal ("el repositorio enmascara un mal diseño de agregados") o te conviene CQRS [IDDD cap. 12].
* En la práctica, separa: los roles `AggregateFinder`/`AggregateSaver` para escribir y una consulta de lectura (`OrderSummaries`, `StaleOrders`) declarada como interfaz en la capa de aplicación e implementada en infraestructura directamente sobre la base de datos, con filtros de `@archi-code/criteria` `[Fuera de los libros]`. Nunca carga agregados con `AggregateFinder`. Ejemplo en `ddd-skills/ddd-repositorios-persistencia/references/implementacion-ts.md`.
* *DDD in PHP* propone consultar el repositorio con especificaciones (`query(specification)`) [PHP: Repositories; PHP: Factories]. Aquí no: el repositorio no selecciona por criterios de negocio `[Fuera de los libros: convención de @archi-code/ddd]`. Una selección con nombre del negocio es una consulta de lectura que devuelve ids o DTOs; una `Specification` se aplica sobre datos ya cargados (`ddd-skills/ddd-value-objects-entidades/references/specification-y-diseno-flexible.md`).

## Paso 6. Probar

Dos tipos de prueba [IDDD cap. 12]:
* **Del repositorio real**, contra la base de datos de verdad (por ejemplo con Testcontainers o `mongodb-memory-server`) `[herramienta fuera de los libros]`.
* **Del código que usa repositorios**, con una implementación **en memoria** cuando la real es lenta o aún no existe [IDDD cap. 12; PHP: Repositories]. Con el paquete es `new InMemoryRepository(AggregateMapper.of(Order))`: no escribas una propia.

Un mismo conjunto de tests de contrato, en `test/support/` del proyecto, se ejecuta contra ambas implementaciones para que la versión en memoria no mienta `[Fuera de los libros]`. Ver `ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`.

## Señales de alarma

* `UserRepository`, `OrderLineRepository`, `AddressRepository`: repositorios de partes internas.
* Una interfaz `OrderRepository` todo en uno en el proyecto, o un caso de uso que recibe los tres roles cuando solo lee o solo guarda.
* El repositorio devuelve tipos de Prisma, documentos de MongoDB o filas.
* Decoradores `@Entity` del ORM en clases del dominio.
* `updateStatus(id, status)` en el repositorio: CRUD de grano fino que salta al agregado.
* El caso de uso recibe una dependencia `transactions`, `unitOfWork` o parecida, o abre `BEGIN`/`COMMIT` o `startTransaction()`: la transacción es del repositorio.
* Un repositorio que reparte un agregado en varias tablas sin agrupar sus sentencias en una transacción dentro de `save`.
* Docenas de métodos `findByXAndYOrderByZ` para pantallas.
* El repositorio lee campos del agregado o construye filas a mano en vez de usar `AggregateMapper.of(Order)`.
* `save` con `upsert` sin condición de versión, `fromPrimitives(row)` sin la versión almacenada o `markPersisted()` olvidado tras escribir.
* Un repositorio en memoria escrito a mano que no comprueba versiones ni copia objetos (los tests pasan, producción falla): usa `InMemoryRepository`.

## Siguiente guía

* Casos de uso que usan los repositorios → `ddd-skills/ddd-servicios-capa-aplicacion/GUIA.md`.
* Persistir como eventos en vez de estado → `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`.
