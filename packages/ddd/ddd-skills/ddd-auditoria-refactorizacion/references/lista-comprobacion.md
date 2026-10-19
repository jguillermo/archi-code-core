# Lista de comprobación DDD

La columna "Script" indica si `scan_ddd_smells.py` lo detecta (sí / parcial / no). Lo que dice "no" se revisa leyendo el código. En código hecho con `@archi-code/ddd`, cada comprobación nombra la pieza del paquete que la resuelve; recorre además `ddd-skills/archi-code-ddd/what-not-to-do.md`.

## Integración entre contextos

| # | Comprobación | Fuente | Script | Severidad típica |
|---|---|---|---|---|
| E1 | ¿Hay un término con varios significados usado en el mismo código (Customer, Product, Order)? | [IDDD cap. 2; Destilado cap. 2] | no | Alta |
| E2 | ¿Se importan clases de dominio entre contextos (`contexts/sales` importando de `contexts/billing`) fuera de un `shared-kernel/` explícito? | [IDDD cap. 13; Destilado cap. 4] | sí | Alta |
| E3 | ¿Hay integración por base de datos compartida? | [Destilado cap. 4] | no | Alta |
| E4 | ¿Las integraciones con sistemas externos pasan por una ACL (puerto del dominio con value objects, adaptador y traductor en `infrastructure/`)? | [Destilado cap. 4] | no | Alta |
| E5 | ¿Hay cadenas de llamadas síncronas entre servicios dentro de una petición? | [Destilado cap. 4] | no | Alta |
| E6 | ¿Usuarios y permisos mezclados en el modelo del núcleo? La autorización va en el caso de uso (`NotAllowedException`), no en el agregado | [IDDD cap. 2] | no | Media |
| E7 | ¿Se envía `event.toJSON()` de un evento de dominio a otro contexto en vez de un contrato publicado y versionado? | [IDDD cap. 13] | no | Alta |

## Arquitectura

| # | Comprobación | Fuente | Script | Severidad |
|---|---|---|---|---|
| A1 | ¿El dominio importa frameworks, ORM o clientes HTTP? | [Destilado cap. 2; IDDD cap. 4] | sí | Alta |
| A2 | ¿Decoradores del ORM en clases de dominio? | [IDDD cap. 6] | sí | Alta |
| A3 | ¿Controladores con lógica de negocio, que importan repositorios o acceden a la base de datos? Un punto de entrada solo llama a casos de uso y traduce errores con `HttpErrorMapper` | [IDDD cap. 4] | parcial | Alta |
| A4 | ¿Un caso de uso, servicio de aplicación o el dominio abre o maneja transacciones (`BEGIN`/`COMMIT`, `startSession`, `withTransaction`) o recibe un runner de transacciones o una unidad de trabajo? IDDD pone la transacción en la aplicación [IDDD cap. 12; IDDD cap. 14]; con el paquete se mueve al adaptador del repositorio, que hace atómico cada `save`/`remove` | `[Fuera de los libros: convención de @archi-code/ddd]` | sí | Media |
| A5 | ¿Un caso de uso devuelve el agregado al controlador o la API expone `toPrimitives()` tal cual? | [IDDD cap. 4; Destilado cap. 4] | no | Media |
| A6 | ¿Módulos nombrados por patrón (`entities/`, `services/`, `listeners/`)? | [PHP: Modules] | no | Baja |
| A7 | ¿El dominio lee `process.env` o usa el logger? Solo la raíz de composición lee el entorno | `[Fuera de los libros]` | parcial (solo `process.env`) | Media |
| A8 | ¿El dominio importa `@archi-code/ddd/application` o `/infrastructure` (por ejemplo `AggregateMapper`)? | `[Fuera de los libros: convención de @archi-code/ddd]` | sí | Alta |
| A9 | ¿`new Date()` en dominio o aplicación en vez del `Clock` inyectado (`FixedClock` en tests)? | `[Fuera de los libros: convención de @archi-code/ddd]` | sí | Media |
| A10 | ¿Errores de negocio como `Error` o `ApplicationException` genéricos en vez de `DomainException(message, ['ORD001'])`, o errores traducidos sin `{ cause }`? | `[Fuera de los libros: convención de @archi-code/ddd]` | no | Media |

## Táctico

| # | Comprobación | Fuente | Script | Severidad |
|---|---|---|---|---|
| T1 | Prueba de anemia: ¿el agregado solo tiene getters y setters? ¿la lógica está en los casos de uso? | [IDDD cap. 1] | parcial | Alta |
| T2 | ¿Setters públicos o campos públicos mutables en el dominio? Los cambios son métodos de negocio que llaman a `record()`; los campos son `private _x` con su getter, o `readonly` | [Destilado cap. 5] | sí | Media |
| T3 | ¿Primitivos en el estado (`private _total: number`, `private _status: string`)? Todo campo de estado es un value object: `Required(XType)` con `@Validations`, `Composite` (`Money`), `EnumType` (`OrderStatus`) o una entidad hija | [IDDD cap. 6] | parcial | Media |
| T4 | ¿Agregados con colecciones que crecen sin límite? | [IDDD cap. 10] | no | Alta |
| T5 | ¿Referencias a objetos de otros agregados en vez de identidades (`CustomerId extends IdType<'CustomerId'>`)? | [Destilado cap. 5] | no | Media |
| T6 | ¿Un caso de uso guarda más de un agregado (o los junta en una misma transacción) sin una excepción de IDDD cap. 10 escrita como decisión? Una escritura atómica por agregado, garantizada por el repositorio | [Destilado cap. 5; IDDD cap. 10] | parcial | Alta |
| T7 | ¿El repositorio usa la `version` de `AggregateRoot`: guarda con condición de versión, lanza `ConcurrencyException`, llama a `markPersisted()` y carga con `mapper.fromPrimitives(row, version)`? | [IDDD cap. 10] | no | Alta si hay concurrencia |
| T8 | ¿Repositorios de partes internas, una interfaz `Repository` todo en uno, métodos con nombres o reglas de negocio, o lecturas que cargan agregados? Solo `AggregateFinder`/`AggregateSaver`/`AggregateRemover`, y las lecturas son consultas de aplicación | [IDDD cap. 12] | parcial | Media |
| T9 | ¿Casos de uso con nombres CRUD o técnicos (`UpdateOrder`, `OrderService`), que hacen varias cosas según el input, que llaman a otro caso de uso, o clases `Manager`/`Helper`? | [IDDD cap. 14; Destilado cap. 5] | parcial | Media |
| T10 | ¿Eventos con nombre en pasado y del lenguaje (`static readonly eventName = 'OrderPlaced'`)? ¿O `OrderUpdated` con todo el estado o con value objects en el payload? | [Destilado cap. 6] | no | Media |
| T11 | ¿El caso de uso publica con `events.publish(order.pullDomainEvents())` después de `save`, y, si un evento no puede perderse, el repositorio escribe el agregado y sus eventos pendientes en la misma escritura atómica (outbox) que un relay entrega por un `EventChannel`? | [Destilado cap. 6; IDDD cap. 8] | no | Crítica si se pierden |
| T12 | ¿Los listeners saltan un `eventId` ya procesado? ¿El caso de uso que ejecutan vuelve si el agregado no existe en vez de lanzar? | [Destilado cap. 4] | no | Alta |
| T13 | ¿Identidad generada temprano (`OrderId.generate()` antes de crear) y pasada a `super(id)`? ¿Algún id opcional (`extends StringType` sin `Required`)? | [IDDD cap. 5] | no | Media |
| T14 | ¿Tests de aceptación con lenguaje del negocio y datos realistas (`InMemoryRepository`, `FixedClock`, `channel.sent`)? | [Destilado cap. 2; IDDD cap. 1] | no | Media |
| T15 | ¿Cada listener se llama `<Action>On<Event>`, tiene `@ListensTo(Event, { consumer: '…' })` con un nombre literal estable y solo traduce el evento a la entrada de un caso de uso? | `[Fuera de los libros: convención de @archi-code/ddd]` | no | Media |
| T16 | ¿Los value objects se construyen en `toCommand` con `ValueObjects.build` (todos los campos a la vez) y no en `handle` ni en el controlador? | `[Fuera de los libros: convención de @archi-code/ddd]` | no | Media |
