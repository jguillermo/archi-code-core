# Repositorios y persistencia

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Los ejemplos usan la API de `@archi-code/ddd`; la forma del código la fija `ddd-skills/archi-code-ddd/`, que manda si un ejemplo difiere. El paquete se aparta de los libros donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]`.
>
> **Cuándo consultarla.** Al guardar o cargar agregados, integrar un ORM o driver (Prisma, pg, MongoDB, IndexedDB), diseñar `findById`/`save`, gestionar transacciones o concurrencia, o cuando el ORM dicta la forma del dominio.

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

La forma del código (repositorio abstracto, adaptadores en memoria, IndexedDB y MongoDB, versión, contrato, reintento) está en `ddd-skills/archi-code-ddd/repositories.md`, `ddd-skills/archi-code-ddd/tests.md`, `ddd-skills/archi-code-ddd/criteria.md`, `ddd-skills/archi-code-ddd/read-models.md` y `ddd-skills/archi-code-ddd/use-cases.md`. Dónde se aparta de los libros:

* El repositorio es una clase abstracta del dominio, no una interfaz, y solo declara `findById`, `save`, `remove` y `search`; sin `nextId()`: la identidad la genera su value object.
* La transacción es del repositorio, no de la aplicación: no hay puerto de transacciones ni unidad de trabajo.
* La versión optimista la guarda solo el repositorio; el agregado no la declara.
* La conversión es del agregado (`toPrimitives`/`fromPrimitives`), sin mapper ni mapeo de ORM.
* No se consulta con especificaciones: una consulta de negocio es un `Criteria` para `search` o un read model.
* Si un evento no puede perderse, el repositorio lo escribe en un outbox en la misma escritura.

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

* Qué se guarda, PostgreSQL, Prisma, consultas de lectura y jerarquías: `ddd-skills/ddd-repositorios-persistencia/references/implementacion-ts.md`.
* Transacción en el repositorio, varias tablas en PostgreSQL, outbox y reintento: `ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`.
* Repositorio en memoria y suite de contrato (qué se prueba y dónde): `ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`.

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
