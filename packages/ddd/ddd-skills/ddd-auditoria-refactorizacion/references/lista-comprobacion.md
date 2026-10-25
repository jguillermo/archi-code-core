# Lista de comprobación DDD

La columna "Script" indica si `scan_ddd_smells.py` lo detecta (sí / parcial / no). Lo que dice "no" se revisa leyendo el código. En código hecho con `@archi-code/ddd`, cada comprobación nombra la pieza del paquete que la resuelve; recorre además `ddd-skills/archi-code-ddd/what-not-to-do.md`.

## Integración entre contextos

| # | Comprobación | Fuente | Script | Severidad típica |
|---|---|---|---|---|
| E1 | ¿Hay un término con varios significados usado en el mismo código (Customer, Product, Order)? | [IDDD cap. 2; Destilado cap. 2] | no | Alta |
| E2 | ¿Se importan clases entre contextos (`contexts/sales` importando de `contexts/billing`, también sus eventos o tipos de datos) fuera de un `shared-kernel/` explícito? Cada consumidor declara su propia copia del evento ajeno junto a su reacción | [IDDD cap. 13; Destilado cap. 4] | sí | Alta |
| E3 | ¿Hay integración por base de datos compartida? | [Destilado cap. 4] | no | Alta |
| E4 | ¿Las integraciones con sistemas externos pasan por una ACL (puerto del dominio con value objects, adaptador y traductor en `infrastructure/`)? | [Destilado cap. 4] | no | Alta |
| E5 | ¿Hay cadenas de llamadas síncronas entre servicios dentro de una petición? | [Destilado cap. 4] | no | Alta |
| E6 | ¿Usuarios y permisos mezclados en el modelo del núcleo? La autorización va en el caso de uso (`NotAllowedException`), no en el agregado | [IDDD cap. 2] | no | Media |
| E7 | ¿Se envían eventos de dominio tal cual (`{ ...event }`) a sistemas fuera del sistema propio (otro equipo, un broker compartido) en vez de un contrato publicado y versionado? Entre los contextos del mismo sistema, el JSON del evento es el contrato y no se cambia de forma incompatible bajo el mismo `eventName` | [IDDD cap. 13] | no | Alta |

## Arquitectura

| # | Comprobación | Fuente | Script | Severidad |
|---|---|---|---|---|
| A1 | ¿El dominio importa frameworks, ORM o clientes HTTP? | [Destilado cap. 2; IDDD cap. 4] | sí | Alta |
| A2 | ¿Decoradores del ORM en clases de dominio? | [IDDD cap. 6] | sí | Alta |
| A3 | ¿Controladores con lógica de negocio, que importan repositorios, acceden a la base de datos o capturan errores para elegir el estado? Un punto de entrada solo comprueba actor y forma, llama a casos de uso (o a un puerto de consulta) y deja que un ayudante del protocolo traduzca los errores según el `ExceptionKind` de `ExceptionClassifier` | [IDDD cap. 4] | parcial | Alta |
| A4 | ¿Un caso de uso, servicio de aplicación o el dominio abre o maneja transacciones (`BEGIN`/`COMMIT`, `startSession`, `withTransaction`) o recibe un runner de transacciones o una unidad de trabajo? IDDD pone la transacción en la aplicación [IDDD cap. 12; IDDD cap. 14]; con el paquete se mueve al adaptador del repositorio, que hace atómico cada `save`/`remove` | `[Fuera de los libros: convención de @archi-code/ddd]` | sí | Media |
| A5 | ¿Un caso de uso devuelve el agregado al controlador o la API expone `toPrimitives()` tal cual? | [IDDD cap. 4; Destilado cap. 4] | no | Media |
| A6 | ¿La estructura de un contexto se aparta de la del paquete: `domain/` sin dividir por tipo de clase (`aggregate/`, `value-object/`, `event/`…), carpetas por patrón en `application/` (`listeners/`, `use-cases/`, `dtos/`) en vez de una por acción de negocio, o ficheros de dominio que no se llaman como su clase? Los libros piden módulos con nombres del lenguaje [PHP: Modules] | `[Fuera de los libros: convención de @archi-code/ddd]` | no | Baja |
| A7 | ¿El dominio lee `process.env` o usa el logger? Solo la raíz de composición lee el entorno | `[Fuera de los libros]` | parcial (solo `process.env`) | Media |
| A8 | ¿El dominio importa `@archi-code/ddd/application`, `/infrastructure` (por ejemplo `SystemClock`) o un adaptador de `infrastructure/` del proyecto? | `[Fuera de los libros: convención de @archi-code/ddd]` | sí | Alta |
| A9 | ¿`new Date()` en dominio o aplicación en vez del `Clock` inyectado (`FixedClock` en tests)? | `[Fuera de los libros: convención de @archi-code/ddd]` | sí | Media |
| A10 | ¿Errores de negocio como `Error` o `ApplicationException` genéricos en vez de errores de negocio con nombre (`OrderNotModifiable extends DomainException`, sin sufijo `Exception`, código `SAL001`), o errores traducidos sin `{ cause }`? | `[Fuera de los libros: convención de @archi-code/ddd]` | no | Media |

## Táctico

| # | Comprobación | Fuente | Script | Severidad |
|---|---|---|---|---|
| T1 | Prueba de anemia: ¿el agregado solo tiene getters y setters? ¿la lógica está en los casos de uso? | [IDDD cap. 1] | parcial | Alta |
| T2 | ¿Setters públicos o campos públicos mutables en el dominio? Los cambios son métodos de negocio que llaman a `record()`; los campos son `private _x` con su getter, o `readonly` | [Destilado cap. 5] | sí | Media |
| T3 | ¿Primitivos en el estado (`private _total: number`, `private _status: string`)? Todo campo de estado es un value object: `Required(XType)` con `@Validations`, `Composite` (`Money`), `EnumType` (`OrderStatus`) o una entidad hija | [IDDD cap. 6] | parcial | Media |
| T4 | ¿Agregados con colecciones que crecen sin límite? | [IDDD cap. 10] | no | Alta |
| T5 | ¿Referencias a objetos de otros agregados en vez de identidades (`CustomerId extends IdType<'CustomerId'>`)? | [Destilado cap. 5] | no | Media |
| T6 | ¿Un caso de uso guarda más de un agregado (o los junta en una misma transacción) sin una excepción de IDDD cap. 10 escrita como decisión? Una escritura atómica por agregado, garantizada por el repositorio | [Destilado cap. 5; IDDD cap. 10] | parcial | Alta |
| T7 | ¿El repositorio lleva la versión de concurrencia optimista él mismo: recuerda la de cada agregado que carga o guarda en un `WeakMap<Order, number>` (`0` si es nuevo), guarda con condición de versión, lanza `ConcurrencyException`, guarda `order.toPrimitives()` con `version + 1` al lado (nunca dentro) y actualiza el `WeakMap` solo tras escribir con éxito? ¿El agregado no declara ni mapea ninguna versión? | [IDDD cap. 10]; `[Fuera de los libros: convención de @archi-code/ddd]` para el `WeakMap` | no | Alta si hay concurrencia |
| T8 | ¿Repositorios de partes internas, una interfaz `Repository` todo en uno, métodos con nombres o reglas de negocio, o lecturas que cargan agregados? Solo `AggregateFinder`/`AggregateSaver`/`AggregateRemover`, y las lecturas son consultas de aplicación | [IDDD cap. 12] | parcial | Media |
| T9 | ¿Casos de uso con nombres CRUD o técnicos (`UpdateOrder`, `OrderService`), que hacen varias cosas según el input, que llaman a otro caso de uso, o clases `Manager`/`Helper`? | [IDDD cap. 14; Destilado cap. 5] | parcial | Media |
| T10 | ¿Eventos con nombre en pasado y del lenguaje (`OrderCreatedDomainEvent` con `static readonly eventName = 'order.created'`, campos primitivos y constructor `{ …campos } & EventMetadata`)? ¿O `OrderUpdated` con todo el estado, value objects en el payload o tipos propios en el fichero del evento? | [Destilado cap. 6]; `[Fuera de los libros: convención de @archi-code/ddd]` para el nombre | no | Media |
| T11 | ¿El caso de uso publica con `events.publish(order.pullDomainEvents())` después de `save`, y, si un evento no puede perderse, el repositorio escribe el agregado y sus eventos pendientes en la misma escritura atómica (outbox) que un relay entrega por un `EventChannel`? | [Destilado cap. 6; IDDD cap. 8] | no | Crítica si se pierden |
| T12 | ¿Las reacciones son idempotentes (id derivado y "si ya existe, retorna" al crear; método de reacción que retorna sin cambios; proyección que salta un `eventId` aplicado)? ¿Retornan si el agregado no existe en vez de lanzar? | [Destilado cap. 4] | no | Alta |
| T13 | ¿Identidad generada temprano por el caso de uso (`OrderId.generate()`, o derivada como `PaymentId.forOrder(order)`) y pasada a `Order.create`, nunca calculada dentro de `create`? ¿Algún id opcional (`extends StringType` sin `Required`)? | [IDDD cap. 5] | no | Media |
| T14 | ¿Tests de aceptación con lenguaje del negocio y datos realistas (el `InMemoryOrderRepository` del proyecto, `FixedClock`, `channel.sent`)? | [Destilado cap. 2; IDDD cap. 1] | no | Media |
| T15 | ¿Cada reacción es un caso de uso por reacción: una sola clase `<Acción>On<Evento>` que extiende `EventListener`, con `@ListensTo(Evento, { consumer: '<contexto>.<acción>-on-<evento>' })`, que construye sus value objects, busca o crea, llama al método de reacción, guarda y publica, sin un `UseCase` detrás, sin autorización ni `AggregateNotFoundException` ni errores de negocio? | `[Fuera de los libros: convención de @archi-code/ddd]` | no | Media |
| T16 | ¿Los value objects se construyen en `toCommand` (o al principio de una reacción) con `ValueObjectBuilder.build` (todos los campos a la vez) y no en `handle` ni en el controlador? ¿`Input` y `Command` están en el fichero del caso de uso? | `[Fuera de los libros: convención de @archi-code/ddd]` | no | Media |
| T17 | ¿Un repositorio genérico compartido por varios agregados, o un repositorio cuyo constructor recibe la clase del agregado o un mapper? Cada repositorio es de un agregado (`MongoOrderRepository` implementa los roles de `Order`), su constructor recibe solo las dependencias de su tecnología (`collection`, `pool`) y llama directamente a `toPrimitives()`/`fromPrimitives()` del agregado | `[Fuera de los libros: convención de @archi-code/ddd]` | no | Media |
| T18 | ¿La conversión a o desde primitivos está fuera del agregado (un servicio de dominio o un mapper escrito a mano)? Es del agregado: `toPrimitives()` y `static fromPrimitives()`, que el repositorio llama directamente; un test de ida y vuelta por agregado comprueba que no se pierde ningún campo | `[Fuera de los libros: convención de @archi-code/ddd]` | no | Media |
| T19 | ¿Un repositorio en memoria que no copia (`structuredClone`) ni comprueba versiones, o usado en producción por una aplicación que no corre en memoria? Vive en `infrastructure/persistence/` o, si solo es un doble de test, en `test/support/` (ver `ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`) | `[Fuera de los libros: convención de @archi-code/ddd]` | no | Baja |
| T20 | ¿El agregado sigue la forma del paquete: constructor público que solo asigna, `static create(id, …, clock)` con estado inicial, invariantes de creación y `<Agregado>CreatedDomainEvent`, métodos de usuario que lanzan errores de negocio y métodos de reacción que retornan sin cambios? | `[Fuera de los libros: convención de @archi-code/ddd]` | no | Baja |
