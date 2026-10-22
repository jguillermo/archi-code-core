# Arquitectura de un Bounded Context

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Los ejemplos están escritos con la API de `@archi-code/ddd` (las clases de su `src`) y se copian tal cual; las guías son la fuente de verdad: el paquete solo se aparta de ellas donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]`, y cualquier otra discrepancia es un defecto del paquete.
>
> **Cuándo consultar esta guía.** Arquitectura interna de un Bounded Context con DDD en TypeScript/Node. Cubre capas e inversión de dependencias, arquitectura hexagonal (puertos y adaptadores), qué va en dominio, aplicación, infraestructura e interfaz, módulos con nombres del lenguaje ubicuo, estructura de carpetas, composition root e inyección de dependencias, reglas automáticas de dependencias, cómo exponer REST sin exponer el modelo y cuándo (y cuándo no) añadir CQRS, arquitectura dirigida por eventos o Event Sourcing. Consúltala siempre que haya que crear o reorganizar la estructura de un proyecto o servicio con DDD, decidir dónde va un fichero o una clase, separar dominio de framework u ORM, montar la inyección de dependencias, configurar límites entre módulos, o cuando el dominio importe Express, Prisma, TypeORM o similares, aunque no se diga "arquitectura hexagonal".

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* El dominio importa `@archi-code/ddd/domain`, `@archi-code/ddd/exceptions` y `@archi-code/validation` (no "nada externo"); la aplicación añade `@archi-code/ddd/application`; solo infraestructura y el composition root importan `@archi-code/ddd/infrastructure`; los puntos de entrada traducen los errores con `ExceptionClassifier` de `@archi-code/ddd/exceptions`.
* No se escriben clases base ni puertos genéricos en el proyecto: `AggregateRoot`, `Entity`, `EventBase`, los tipos de value object y `Composite` vienen de `@archi-code/ddd/domain`; los contratos de repositorio son los roles `AggregateFinder`, `AggregateSaver` y `AggregateRemover` de `@archi-code/ddd/domain` (no hay un `OrderRepository` propio); `EventBus` y `Clock` vienen de `@archi-code/ddd/application` y `EventChannel` de `@archi-code/ddd/infrastructure`. No hay puerto de transacciones: el repositorio es responsable de la transacción y de todo lo relacionado con la persistencia.
* Un mecanismo de mensajería es solo un `EventChannel` en `infrastructure/messaging/`; el bus es siempre `DomainEventBus`, y cambiar de tecnología cambia una línea del composition root. `DomainEventBus`, `EventRegistry` y el puerto `EventChannel` (con `ChannelHandler` y `ChannelSubscription`) se importan de `@archi-code/ddd/infrastructure`: son cableado de infraestructura. La aplicación solo ve el contrato para publicar (`EventBus`) y para escuchar (`EventListener` + `@ListensTo`) de `@archi-code/ddd/application`.
* El composition root de cada contexto es el único que construye y conecta todo (repositorios, canal, `DomainEventBus`, suscripción de listeners con `bus.subscribe`) y lee `process.env`; nadie lo importa. El `dependency-cruiser.cjs` de esta guía ya aplica estas reglas.
* Capa, dependencias permitidas y nombres de cada clase: `ddd-skills/archi-code-ddd/where-each-class-goes.md`.

La arquitectura existe para proteger el modelo de dominio. El modelo debe estar libre de tecnología; por eso, por ejemplo, las transacciones las gestionan los servicios de aplicación y no el dominio [Destilado cap. 2]. Con el paquete tampoco las gestiona la aplicación: cada `save` y `remove` del adaptador del repositorio es una escritura atómica `[Fuera de los libros: convención de @archi-code/ddd]`. Y ningún estilo arquitectónico es una colección de herramientas para usar en todas partes: se aplica donde mitiga un riesgo concreto [IDDD cap. 4].


## La arquitectura por defecto: hexagonal

Recomendación de estas fuentes para cualquier contexto con modelo de dominio: **puertos y adaptadores** con inversión de dependencias. Motivos:

* Con capas tradicionales, la infraestructura queda debajo del dominio y implementar repositorios obliga a romper las reglas o a hacer apaños [IDDD cap. 4].
* Con DIP, módulos de alto y bajo nivel dependen de abstracciones; la infraestructura implementa interfaces definidas por las capas interiores [IDDD cap. 4].
* Hexagonal da simetría: cada cliente o mecanismo de salida tiene su adaptador, y todos llegan al interior por la misma API de aplicación [IDDD cap. 4].
* *DDD in PHP* la adopta como arquitectura base de sus ejemplos [PHP: Modules; PHP: Appendix Hexagonal].

### Las cuatro zonas y la regla de dependencia

```
interfaces (adaptadores de entrada) ─┐
                                     ├──▶ application ──▶ domain
infrastructure (adaptadores salida) ─┘                     ▲
         └──────────── implementa interfaces de ───────────┘
```

| Zona | Contiene | Puede depender de | Nunca |
|---|---|---|---|
| `domain` | Agregados (`AggregateRoot`), entidades (`Entity`), value objects, eventos de dominio (`EventBase`), servicios de dominio, puertos hacia servicios externos (`ProductPricing`); los contratos de repositorio son los roles `AggregateFinder`/`AggregateSaver`/`AggregateRemover` del paquete | Nada externo salvo `@archi-code/ddd/domain`, `@archi-code/ddd/exceptions` y `@archi-code/validation` | Framework web, ORM, cliente HTTP, `process.env`, logger |
| `application` | Casos de uso (`UseCase`), listeners (`EventListener` + `@ListensTo`), consultas de lectura con sus DTOs, puertos de salida no de dominio (`EventBus` y `Clock` del paquete; los tuyos, como `Warehouse`) | `domain`, `@archi-code/ddd/application` | Express/Fastify, SQL, detalles de mensajería |
| `infrastructure` | Repositorios concretos (`MongoOrderRepository`), ACL, canales de eventos (`EventChannel`) y el cableado de eventos (`DomainEventBus`, `EventRegistry`, en el composition root), clientes HTTP; el repositorio se encarga de la atomicidad de cada escritura, la versión, la conexión y los errores del driver | `domain`, `application`, `@archi-code/ddd/infrastructure` | Lógica de negocio |
| `interfaces` | Controladores REST, consumidores de mensajes, CLI, resolvers GraphQL | `application`, `@archi-code/ddd/exceptions` (y tipos de `domain` solo si es imprescindible) | Lógica de negocio, acceso directo a repositorios |

Responsabilidades de los servicios de aplicación según IDDD: sin lógica de dominio, controlan transacciones y seguridad (en el paquete, la seguridad con `NotAllowedException`; la transacción pasa al adaptador del repositorio, que hace atómico cada `save` y `remove` `[Fuera de los libros: convención de @archi-code/ddd]`), pueden enviar notificaciones; son clientes directos del modelo y deben ser **finos**. Si crecen, la lógica de dominio se está escapando y el modelo se vuelve anémico [IDDD cap. 4]. Detalle en `ddd-skills/ddd-servicios-capa-aplicacion/GUIA.md`.

En la interfaz se valida formato (campo obligatorio, longitud), no conocimiento profundo del negocio, que se queda en el modelo [IDDD cap. 4].

## Flujo de trabajo

1. **Decide si el contexto merece modelo de dominio.** Si no tiene reglas de negocio, un CRUD sencillo y bien encapsulado es legítimo [IDDD cap. 1]. La estructura hexagonal sigue siendo útil, pero sin agregados artificiales.
2. **Crea la estructura de carpetas** con `ddd-skills/ddd-arquitectura/references/estructura-hexagonal-ts.md`. Si el proyecto ya reserva `src/app/` para la lógica principal, usa la variante descrita allí.
3. **Nombra los módulos** con el lenguaje ubicuo, nunca por tipo de patrón (`entities/`, `services/`, `valueobjects/`). Guía en `ddd-skills/ddd-arquitectura/references/modulos.md`.
4. **Monta el composition root**: un único punto donde se instancian adaptadores, se construye el `DomainEventBus` sobre un `EventChannel`, se inyectan los puertos en los casos de uso y se suscriben los listeners con `bus.subscribe`. Sin contenedor mágico salvo necesidad.
5. **Automatiza las reglas de dependencia** con `ddd-skills/ddd-arquitectura/assets/dependency-cruiser.cjs`. Una regla que no se comprueba en CI acaba violándose `[Fuera de los libros]`.
6. **Decide los estilos adicionales** (CQRS, eventos, Event Sourcing) con `ddd-skills/ddd-arquitectura/references/estilos-adicionales.md`. Por defecto, ninguno.

## REST sin exponer el modelo

Exponer el modelo directamente por REST produce interfaces frágiles: cada cambio del modelo rompe a los clientes. IDDD prefiere separar el modelo de la interfaz: recursos diseñados por casos de uso, construidos a partir de uno o varios agregados [IDDD cap. 4]. En TypeScript: el controlador comprueba la forma de la petición, llama a `execute` del caso de uso con su input, responde con lo que este devuelve (un id, un DTO o nada; nunca el agregado) y traduce los errores según el `ExceptionKind` de `ExceptionClassifier.classify(error)` (`@archi-code/ddd/exceptions`) a su protocolo (404, 403, 409, 422… en HTTP). Ejemplo en `ddd-skills/ddd-arquitectura/references/estructura-hexagonal-ts.md`.

## Señales de alarma

* `import` de `express`, `@prisma/client`, `typeorm`, `axios`, `pg`, `kafkajs` o similares dentro de `domain/`.
* Decoradores de ORM (`@Entity`, `@Column`) en clases de dominio. Mezclan el modelo con la persistencia.
* Clases base propias (`domain/shared/AggregateRoot.ts`, `ValueObject.ts`, `DomainEvent.ts`), un `OrderRepository` que lo hace todo, un `OrderMapper` a mano o un `EventPublisher` propio: el paquete ya da `AggregateRoot`, los roles de repositorio y `EventBus`, y la conversión a primitivos es del propio agregado (`toPrimitives()` y `static fromPrimitives()`).
* `@archi-code/ddd/infrastructure` importado desde `domain/` o `application/`.
* Carpetas `domain/entities`, `domain/services`, `domain/valueobjects`: módulos por tipo de patrón [PHP: Modules].
* Controladores que llaman a repositorios o contienen `if` de negocio.
* Servicios de aplicación de cientos de líneas [IDDD cap. 4].
* Un único `utils/` o `common/` compartido entre contextos con lógica de negocio.
* CQRS o Event Sourcing "porque es la arquitectura moderna", sin un riesgo concreto que mitiguen [IDDD cap. 4].
* Un contexto nuevo creado para separar algo que bastaba con un módulo [IDDD cap. 9].

## Siguiente guía

* Diseñar lo que va dentro de `domain/` → `ddd-skills/ddd-value-objects-entidades/GUIA.md` y `ddd-skills/ddd-agregados/GUIA.md`.
* Implementar repositorios en `infrastructure/` → `ddd-skills/ddd-repositorios-persistencia/GUIA.md`.
* Casos de uso en `application/` → `ddd-skills/ddd-servicios-capa-aplicacion/GUIA.md`.
* CQRS y Event Sourcing en profundidad → `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`.
