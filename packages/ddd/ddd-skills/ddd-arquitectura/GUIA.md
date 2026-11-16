# Arquitectura de un Bounded Context

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Capas, hexagonal, carpetas, módulos, composition root, reglas de dependencias, REST sin exponer el modelo y cuándo añadir CQRS o Event Sourcing. La forma del código la fija `ddd-skills/archi-code-ddd/` (capa y nombre de cada clase: `ddd-skills/archi-code-ddd/where-each-class-goes.md`).

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* Cada capa importa su subpath y los interiores: `domain` → `@archi-code/ddd/domain` y `@archi-code/validation`; `application` → además `@archi-code/ddd/application`; `@archi-code/ddd/infrastructure` solo en infraestructura, composition root y puntos de entrada (`ExceptionClassifier`).
* Sin clases base ni puertos genéricos propios: `AggregateRoot`, `Entity`, `EventBase`, value objects y `Composite` vienen del paquete; `EventBus` y `Logger` de `/application`; `EventChannel`, `DomainEventBus` y `EventRegistry` de `/infrastructure`. El dominio declara el repositorio abstracto de cada agregado (`OrderRepository extends AggregateRepository<Order>`, solo con los verbos `findById`, `search`, `save`, `remove` que necesite) y todo caso de uso lo recibe, nunca los roles. No hay puerto de transacciones: la transacción es del repositorio.
* Una tecnología de mensajería es solo un `EventChannel` en `infrastructure/messaging/`; el bus es siempre `DomainEventBus` y cambiar de tecnología cambia una línea del composition root.
* Un `composition.ts` por contexto (`<Context>Context` con `static async start(settings)`, `async stop()`, `private static registry()`) es el único que construye y conecta (repositorios, `DomainEventBus` sobre el canal compartido, reacciones con `bus.subscribe`, controladores con los casos de uso); nadie lo importa. El arranque lee la configuración y arranca cada contexto con el mismo canal y logger.
* `domain/` por tipo de clase (`aggregate/`, `entity/`, `value-object/`, `event/`, `exception/`, `repository/`, `service/`, `specification/`, PascalCase); `application/` por acción de negocio (kebab-case); luego `infrastructure/`, `interfaces/`. Los libros nombran los módulos con el lenguaje [IDDD cap. 9; PHP: Modules]. Un contexto nunca importa otro; solo `shared-kernel/`.
* Un caso de uso por reacción es un `EventListener` con `@ListensTo`, sin `UseCase` detrás; los libros ponen un suscriptor que llama a un servicio de aplicación [IDDD cap. 8].

El modelo debe estar libre de tecnología; los libros ponen las transacciones en la aplicación [Destilado cap. 2], aquí en cada `save`/`remove` del repositorio `[Fuera de los libros: convención de @archi-code/ddd]`. Un estilo arquitectónico se aplica solo donde mitiga un riesgo concreto [IDDD cap. 4].

## Hexagonal por defecto

Puertos y adaptadores con inversión de dependencias: la infraestructura implementa interfaces de las capas interiores y todos los clientes entran por la misma API de aplicación [IDDD cap. 4; PHP: Appendix Hexagonal].

| Zona | Contiene | Depende de | Nunca |
|---|---|---|---|
| `domain` | Agregados, entidades, value objects, eventos, errores, especificaciones, servicios y puertos de dominio, repositorios abstractos | `@archi-code/ddd/domain`, `@archi-code/validation` | Framework, ORM, HTTP, `process.env`, logger |
| `application` | Casos de uso de usuario y por reacción (con las copias de eventos ajenos), tipos de entrada, read models | `domain`, `@archi-code/ddd/application` | Framework web, SQL, mensajería |
| `infrastructure` | Repositorios concretos, ACL, canales, clientes | `domain`, `application`, `@archi-code/ddd/infrastructure` | Lógica de negocio |
| `interfaces` | Controladores, consumidores, CLI | `application`, ayudante por protocolo con `ExceptionClassifier` | Lógica de negocio, repositorios, capturar errores uno a uno |

* Servicios de aplicación sin lógica de dominio y **finos**; controlan seguridad (aquí `NotAllowedException`) y pueden enviar notificaciones; si crecen, la lógica se escapa y el modelo se vuelve anémico [IDDD cap. 4]. Detalle en `ddd-skills/ddd-servicios-capa-aplicacion/GUIA.md`.
* La interfaz valida formato, no reglas de negocio [IDDD cap. 4].

## Flujo de trabajo

1. Sin reglas de negocio, un CRUD encapsulado es legítimo [IDDD cap. 1]; hexagonal sigue sirviendo, sin agregados artificiales.
2. Estructura de carpetas: `ddd-skills/ddd-arquitectura/references/estructura-hexagonal-ts.md`.
3. Módulos: `ddd-skills/ddd-arquitectura/references/modulos.md`.
4. Composition root por contexto, sin contenedor salvo necesidad.
5. Reglas de dependencia en CI con `ddd-skills/ddd-arquitectura/assets/dependency-cruiser.cjs` `[Fuera de los libros]`.
6. Estilos adicionales (CQRS, eventos, ES), por defecto ninguno: `ddd-skills/ddd-arquitectura/references/estilos-adicionales.md`.

## REST sin exponer el modelo

Recursos diseñados por caso de uso, no el agregado [IDDD cap. 4]. El controlador comprueba actor y forma, llama a `execute`, responde 201 `{ id }`, 204 o 200 con el puerto de consulta de un read model (nunca el agregado), y deja que el ayudante traduzca el `ExceptionKind` `[Fuera de los libros: convención de @archi-code/ddd]`.

## Señales de alarma

* `express`, `@prisma/client`, `typeorm`, `axios`, `pg`… o decoradores de ORM en `domain/`.
* Clases base propias, `interface OrderRepository`, repositorio con métodos de negocio o que no extiende `AggregateRepository`, `OrderMapper` o `EventPublisher` propios.
* `@archi-code/ddd/infrastructure` en `domain/` o `application/`.
* `listeners/`, `use-cases/`, `commands/` en `application/`; `models/` o `shared/` en `domain/`.
* Un contexto que importa clases de otro.
* Un `utils/` o `common/` compartido entre contextos con lógica de negocio.
* Controladores con repositorios, `if` de negocio o `catch` para elegir estado.
* Servicios de aplicación enormes; CQRS o ES sin riesgo que mitigar [IDDD cap. 4].
* Un contexto nuevo donde bastaba un módulo [IDDD cap. 9].
