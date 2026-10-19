# Repositorios y persistencia

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Para escribir el código, traduce los ejemplos con `ddd-skills/archi-code-ddd/suite-to-package.md`; las guías son la fuente de verdad: el paquete solo se aparta de ellas donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]`, y cualquier otra discrepancia es un defecto del paquete.
>
> **Cuándo consultar esta guía.** Repositorios DDD y persistencia de agregados en TypeScript/Node. Cubre un repositorio por agregado, repositorios orientados a colección frente a orientados a persistencia (save), interfaz en el dominio e implementación en infraestructura, mappers entre filas o documentos y el modelo, concurrencia optimista, transacciones gestionadas fuera del dominio, consultas y "use case optimal queries", diferencias con un DAO, implementaciones en memoria y tests de contrato. Consúltala siempre que haya que guardar o cargar agregados, integrar Prisma, TypeORM, Drizzle, MikroORM, pg o MongoDB con un modelo de dominio, diseñar métodos find/save, gestionar transacciones, o cuando el ORM esté dictando la forma de las clases del dominio, aunque no se mencione "repository".

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* No hay un `Repository` completo: un caso de uso depende solo de los roles que usa (`AggregateFinder.findById`, `AggregateSaver.save`, `AggregateRemover.remove`), cuyos contratos están en `@archi-code/ddd/domain`.
* Los repositorios solo obtienen y persisten: sin `nextId()` ni consultas de negocio como `pendingOlderThan`, que pasan a ser consultas de lectura en `application/`.
* El mapeo se hace con `AggregateMapper.of(Order)`, nunca leyendo campos del agregado; el conflicto de versión es `ConcurrencyException` (409) con `{ cause }`; la referencia de tests es `InMemoryRepository`.
* `InMemoryRepository.findAll()` existe solo como comodidad de los tests; un repositorio real no tiene `findAll()`.
* El repositorio no publica eventos: lo hace el caso de uso con `events.publish(order.pullDomainEvents())` dentro de la transacción.
* `remove(aggregate)` recibe el agregado cargado y comprueba su versión como `save`: borrar un agregado que otro cambió después de cargarlo es `ConcurrencyException`.
* El puerto `TransactionRunner` tiene `run(work)` e `inTransaction()`; la conexión en curso (`current()` de `references/transacciones-ts.md`) se queda dentro del adaptador.

Un repositorio da la ilusión de una colección en memoria con todos los agregados de un tipo, con una interfaz conocida para añadir, quitar y seleccionar. **Solo los agregados tienen repositorio**, normalmente uno por tipo de agregado [IDDD cap. 12, citando a Evans].


## Reglas

1. **Un repositorio por agregado**, nunca por entidad interna ni por tabla [IDDD cap. 12].
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

```ts
// domain/order/OrderRepository.ts
export interface OrderRepository {
  byId(id: OrderId): Promise<Order | null>;
  save(order: Order): Promise<void>;                  // alta y cambios; comprueba versión
}
```

* El repositorio solo obtiene y persiste: sin lógica de negocio, sin consultas de negocio (`pendingOlderThan`) y sin generar identidades (`nextId()`) `[Fuera de los libros: convención de @archi-code/ddd]`. La identidad nueva la genera su value object (`OrderId.generate()`, ver `ddd-skills/ddd-value-objects-entidades/GUIA.md`); las selecciones son consultas de lectura (Paso 5).
* Nada de `findAll()` ni `findBy(field, value)` genéricos.
* Consultas para pantallas que cruzan agregados no van aquí: van a consultas de lectura (ver Paso 5).

## Paso 3. Implementar

Guía completa con PostgreSQL, Prisma y MongoDB en `ddd-skills/ddd-repositorios-persistencia/references/implementacion-ts.md`. Puntos clave:

* Un **mapper** convierte entre el agregado y su forma persistida, usando las factorías de los value objects y `reconstitute` [IDDD cap. 6].
* La **versión** se comprueba al guardar (concurrencia optimista) [IDDD cap. 10].
* Los **eventos** del agregado se guardan en la misma transacción (outbox, `ddd-skills/ddd-eventos-dominio/GUIA.md`).
* El **esquema** sirve al modelo, no al revés [IDDD cap. 6]. Un agregado pequeño encaja a menudo en una fila con columnas `jsonb` para sus value objects.

## Paso 4. Transacciones

La aplicación abre y cierra la transacción; el repositorio usa la conexión de la transacción en curso. En Node, `AsyncLocalStorage` permite hacerlo sin pasar la conexión por todos los métodos `[Fuera de los libros]`. Patrón en `ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`.

## Paso 5. Consultas

* Para pantallas que cruzan varios agregados, IDDD admite consultas optimizadas por caso de uso que devuelven un value object a medida. Si necesitas muchas, sospecha: o los límites de agregado están mal ("el repositorio enmascara un mal diseño de agregados") o te conviene CQRS [IDDD cap. 12].
* En la práctica, separa: `OrderRepository` para escribir y una consulta de lectura (`OrderSummaries`) en la capa de aplicación que va directa a SQL `[Fuera de los libros]`.
* *DDD in PHP* propone consultar el repositorio con especificaciones (`query(specification)`) [PHP: Repositories; PHP: Factories]. Aquí no: el repositorio no selecciona por criterios de negocio `[Fuera de los libros: convención de @archi-code/ddd]`. Una selección con nombre del negocio es una consulta de lectura que devuelve ids o DTOs; una Specification se aplica sobre datos ya cargados (`ddd-skills/ddd-value-objects-entidades/references/specification-y-diseno-flexible.md`).

## Paso 6. Probar

Dos tipos de prueba [IDDD cap. 12]:
* **Del repositorio real**, contra la base de datos de verdad (por ejemplo con Testcontainers) `[herramienta fuera de los libros]`.
* **Del código que usa repositorios**, con una implementación **en memoria** cuando la real es lenta o aún no existe [IDDD cap. 12; PHP: Repositories].

Un mismo conjunto de tests de contrato se ejecuta contra ambas implementaciones para que la versión en memoria no mienta `[Fuera de los libros]`. Ver `ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`.

## Señales de alarma

* `UserRepository`, `OrderLineRepository`, `AddressRepository`: repositorios de partes internas.
* El repositorio devuelve tipos de Prisma o TypeORM.
* Decoradores `@Entity` del ORM en clases del dominio.
* `updateStatus(id, status)` en el repositorio: CRUD de grano fino que salta al agregado.
* El repositorio hace `BEGIN`/`COMMIT` por su cuenta.
* Docenas de métodos `findByXAndYOrderByZ` para pantallas.
* Implementación en memoria que no comprueba versiones ni copia objetos (los tests pasan, producción falla).

## Siguiente guía

* Casos de uso que usan los repositorios → `ddd-skills/ddd-servicios-capa-aplicacion/GUIA.md`.
* Persistir como eventos en vez de estado → `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`.
