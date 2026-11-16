# Repositorios y persistencia

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Los ejemplos usan la API de `@archi-code/ddd`; la forma del código la fija `ddd-skills/archi-code-ddd/`, que manda si un ejemplo difiere. El paquete se aparta de los libros donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]`.
>
> **Cuándo consultarla.** Al guardar o cargar agregados, integrar un ORM o driver (Prisma, pg, MongoDB, IndexedDB), diseñar `findById`/`save`, gestionar transacciones o concurrencia, o cuando el ORM dicta la forma del dominio.

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* Un repositorio abstracto por agregado en `domain/repository/<Agregado>Repository.ts`: `abstract class OrderRepository extends AggregateRepository<Order> implements AggregateFinder<Order>, AggregateSaver<Order>`, con solo los verbos que el negocio necesita: `findById`, `save`, `remove` (si el negocio borra) y `search(criteria)` (`AggregateSearcher`, si un caso de uso selecciona agregados para cambiarlos). Nada más: ni consultas de negocio, ni `nextId()` (la identidad la genera su value object, `OrderId.generate()`), ni código. Un doble de test puede añadir ayudas técnicas (`versionOf(id)`, `findAll()`) que ningún caso de uso ve.
* Todo caso de uso de usuario o por reacción recibe esa clase abstracta (`private readonly orders: OrderRepository`), nunca roles sueltos ni su intersección.
* Una consulta de negocio (`pendingOlderThan`) es un `Criteria` para `search` si un caso de uso cambia esos agregados, o un read model en `application/` si solo se muestra o lista.
* Un adaptador por agregado y tecnología en `infrastructure/persistence/<tecnología>-<agregado>-repository.ts` (`MongoOrderRepository extends OrderRepository`); su constructor (`super()` primero) recibe solo su tecnología (`collection`, `pool`), nunca la clase del agregado ni un mapper. La tecnología de la base de datos solo se usa dentro de él.
* La conversión es del agregado: guarda `order.toPrimitives()` y carga con `Order.fromPrimitives(...)`, sin mapper ni comprobación de forma; el test de ida y vuelta del agregado garantiza que no falta ningún campo.
* La versión optimista es solo del repositorio (el agregado no la declara ni la mapea y el caso de uso nunca la ve): `WeakMap<Order, number>` privado; al cargar `versions.set(order, row.version)`; al guardar `version = versions.get(order) ?? 0` (0 = nuevo), escribe solo si la guardada es `version`, almacena `version + 1` junto a los primitivos y actualiza el `WeakMap` solo tras escribir. Conflicto o id ocupado: `ConcurrencyException('Order', id, version)` (nombre literal). `remove(order)` comprueba la versión igual.
* La transacción es del repositorio: no hay puerto de transacciones y la aplicación nunca abre una. Cada `save`/`remove` es atómico; si el agregado ocupa varias tablas, la transacción se abre y cierra dentro del método. Errores del driver → `InternalErrorException` con `{ cause }`.
* El repositorio no publica eventos (lo hace el caso de uso tras `save`), salvo guardarlos en un outbox en la misma escritura cuando no pueden perderse.
* IndexedDB: `IndexedDbOrderRepository extends OrderRepository` con `IndexedDbTable` de `@archi-code/ddd/infrastructure` (tabla declarada en un campo `static`, fila `{ ...order.toPrimitives(), version }`, comprobación de versión y escritura en un único `IndexedDbTable.transaction`), nunca `indexedDB` en crudo. Ver `ddd-skills/archi-code-ddd/layers.md` y `ddd-skills/archi-code-ddd/patterns.md`.
* El paquete no trae repositorio en memoria: el proyecto escribe `InMemoryOrderRepository` con el mismo contrato (copias `structuredClone`, versiones), en `infrastructure/persistence/` o `test/support/`.

## Reglas

1. Solo los agregados tienen repositorio, uno por tipo, con ilusión de colección [IDDD cap. 12].
2. Interfaz en el dominio con su lenguaje; implementación en infraestructura [IDDD cap. 4 y cap. 12; PHP: Repositories].
3. Devuelve agregados completos, nunca filas ni modelos del ORM [IDDD cap. 12].
4. No es un DAO: nada de CRUD de grano fino sobre partes del agregado [IDDD cap. 12; PHP: Repositories].
5. El dominio no gestiona transacciones [IDDD cap. 12; Destilado cap. 2]. Los libros las ponen en la aplicación; aquí, en el repositorio `[Fuera de los libros: convención de @archi-code/ddd]`.
6. Una escritura atómica por agregado [IDDD cap. 10 y cap. 12]. Que funcione en tests no significa que funcione con concurrencia en producción [IDDD cap. 12].
7. Sin lógica de negocio en procedimientos almacenados [IDDD cap. 12].
8. Estilo orientado a persistencia (`save` explícito), no a colección con unidad de trabajo [IDDD cap. 12; PHP: Repositories] `[Fuera de los libros: convención de @archi-code/ddd]`: los drivers habituales no rastrean cambios y una unidad de trabajo de ORM (MikroORM) ataría el dominio al ORM.
9. El esquema sirve al modelo [IDDD cap. 6].
10. Muchas consultas optimizadas por caso de uso indican agregados mal diseñados o necesidad de CQRS [IDDD cap. 12]. No se consulta el repositorio con especificaciones (`query(specification)` de [PHP: Repositories]) `[Fuera de los libros: convención de @archi-code/ddd]`: una `Specification` se aplica sobre datos cargados.
11. Probar el repositorio real contra la base de verdad y el código que lo usa con uno en memoria [IDDD cap. 12], con la misma suite de contrato para ambos `[Fuera de los libros]`. Base real con Testcontainers o `mongodb-memory-server` `[herramienta fuera de los libros]`.

## Referencias

* Declaración, MongoDB, PostgreSQL, Prisma y read models: `ddd-skills/ddd-repositorios-persistencia/references/implementacion-ts.md`.
* Transacción en el repositorio, varias tablas, outbox y reintento: `ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`.
* Repositorio en memoria y suite de contrato: `ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`.

## Señales de alarma

* Repositorios de partes internas (`OrderLineRepository`) o genéricos para varios agregados.
* Un agregado sin repositorio abstracto en `domain/repository/`; `interface OrderRepository`, o clase que no extiende `AggregateRepository<Order>`; casos de uso tipados con roles.
* Verbos que el negocio no usa, o métodos distintos de `findById`, `search`, `save`, `remove`; `findAll()`, `findBy(field)`, `updateStatus(id, status)`, docenas de `findByXAndY`.
* Tipos del ORM o filas fuera del repositorio; `@Entity` del ORM en el dominio.
* El caso de uso recibe `transactions`/`unitOfWork` o abre `BEGIN`.
* El repositorio lee getters del agregado, recibe la clase o un mapper.
* `upsert` sin versión; cargar sin recordar la versión; no actualizarla tras escribir (el segundo `save` da falso conflicto) o actualizarla antes; versión dentro de `toPrimitives()` o como campo del agregado.
* Un agregado repartido en varias tablas sin una transacción dentro de `save`.
* Un campo nuevo, sobre todo privado (`PrimitiveTypes` no lo ve), fuera de `toPrimitives()`/`fromPrimitives()` sin test de ida y vuelta.
* Repositorio en memoria sin copias ni versiones.

## Siguiente guía

* Casos de uso → `ddd-skills/ddd-servicios-capa-aplicacion/GUIA.md`; persistir como eventos → `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`.
