# Servicios de dominio y capa de aplicación

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Los ejemplos usan la API de `@archi-code/ddd`; la forma del código la fija `ddd-skills/archi-code-ddd/`, que manda si un ejemplo difiere. El paquete se aparta de los libros donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]`.
>
> **Cuándo consultarla.** Al escribir o revisar un "service", "manager", "handler", "use case" o "interactor", al decidir dónde va una regla que implica varios objetos o al conectar un controlador con el dominio.

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* **Caso de uso de usuario**: `<Acción> extends UseCase<Input, Command, Output>` en `application/<acción>/<acción>.ts`, que exporta `<Acción>Input` (primitivos; `actorId`/`actorRole` si importa el actor) y `<Acción>Command` (value objects). `toCommand` es exactamente `return ValueObjectBuilder.build({ … })`. Orden de `handle`: autorización (`NotAllowedException`) → id nuevo (`OrderId.generate()`) → `create` o `findById` (`AggregateNotFoundException` si `null`) → método de negocio → `save` una vez → `publish(x.pullDomainEvents())` → log si hace falta → salida. Sin ayudas en la base.
* **Caso de uso por reacción**: `<Acción>On<Evento> extends EventListener<Evento>` con `@ListensTo(Evento, { consumer: '<contexto>.<acción>-on-<evento>' })`. `handle(event)`: `ValueObjectBuilder.build` → id derivado → buscar o crear (retorna si ya existe al crear o falta al cambiar) → método de reacción (vuelve sin cambios si no aplica) → `save` → `publish`. Sin `UseCase` detrás, sin autorización, sin `AggregateNotFoundException` ni errores de negocio, sin `try/catch`: `DomainEventBus` registra el fallo y el canal reentrega. Los libros ponen un suscriptor que llama a un servicio de aplicación [IDDD cap. 8].
* El constructor recibe solo lo que usa `handle`: el repositorio abstracto del agregado (`OrderRepository`, nunca roles), las dependencias de los servicios de dominio que instancia, `EventBus` y `Logger`. Nunca transacciones ni unidad de trabajo: cada `save`/`remove` es atómico en el repositorio.
* Una acción de negocio por caso de uso, nombre de verbo del negocio (`PlaceOrder`, `CancelOrder`), un agregado guardado una vez.
* **Un caso de uso nunca instancia, recibe, importa ni llama a otro caso de uso, sin excepción.** Las acciones se encadenan con eventos; la lógica compartida va al agregado o a un servicio de dominio. No hay bus de comandos: el punto de entrada llama a `execute(input)`.
* **Servicio de dominio** (clase sin base en `domain/service/`) solo cuando dos casos de uso comparten lógica de negocio o una regla no cabe en un agregado ni value object (necesita varios agregados o un puerto de dominio). Formas, por preferencia: (1) agregados ya cargados como argumentos, sin dependencias; (2) el repositorio abstracto por constructor, solo `findById`, nunca su implementación; (3) un puerto de dominio por constructor. Nunca guarda, publica ni toca persistencia.
* El servicio de dominio no se inyecta ni lo construye `composition.ts`: el caso de uso (de usuario o por reacción) recibe sus dependencias por su constructor y lo instancia dentro de `handle`. Ejemplo: `CreateCourse` y `PublishCourse` comparten buscar el curso; ambos hacen `new CourseFinder(this.courses)` (`find` lanza `CourseNotFound`, `assertDoesNotExist` lanza `CourseAlreadyExists`). Se prueba con objetos de dominio reales y dependencias stub con `vi.fn()`. Nunca hay caso de uso de consulta (ni `FindCourse`): leer por id es el puerto de consulta de un read model. Un efecto externo (cobrar, enviar un email) nunca va antes de `save`: el caso de uso guarda la intención y una reacción ejecuta el efecto con clave de idempotencia y registra el resultado `[Fuera de los libros: convención de @archi-code/ddd]`. Código en `ddd-skills/archi-code-ddd/patterns.md` y reglas en `ddd-skills/archi-code-ddd/layers.md`.
* Una regla que depende del estado de un agregado es un método suyo: "solo el comprador cancela" es `order.cancel(requester, reason)`, que lanza `NotTheCustomerOfOrder`; `CancelOrder` solo llama a `order.cancel`.
* Errores: de negocio en el dominio (`OrderNotCancellable extends DomainException`, sin sufijo, código por contexto `SAL002`); `AggregateNotFoundException` (404) y `NotAllowedException` (403) en el caso de uso; `execute` envuelve lo ajeno en `UnexpectedErrorException`. Los puntos de entrada traducen con `ExceptionClassifier.classify(error)`.
* `ConcurrencyException` llega al punto de entrada (409) o, si el comando es seguro de repetir, se reintenta en `handle` recargando (`ATTEMPTS = 3`). Una reacción no reintenta: reentrega el canal.

## Dos servicios distintos

| | Servicio de dominio | Servicio de aplicación |
|---|---|---|
| Lógica de negocio | Sí | No, coordina |
| Vive en | `domain/service/` | `application/<acción>/` |
| Nombre | Lenguaje ubicuo | Caso de uso |
| Estado | Sin estado [IDDD cap. 7] | Sin estado |
| Transacciones y seguridad | Nunca [IDDD cap. 7] | Seguridad sí; transacciones según IDDD [IDDD cap. 14], aquí del repositorio |
| Lo llama | Casos de uso u otros servicios de dominio | Adaptadores de entrada (HTTP, mensajes, CLI) |

Confundirlos lleva al modelo anémico [IDDD cap. 7 y cap. 14]. Ninguno es un servicio SOA remoto ni tiene por qué ser pesado [IDDD cap. 7].

## ¿Dónde va esta lógica?

`[Fuera de los libros: síntesis de IDDD cap. 7, cap. 10 y cap. 14]`

1. Regla sobre el estado de un agregado → método del agregado.
2. Cálculo sobre valores → value object.
3. Proceso de negocio, transformación o cálculo que necesita varios objetos y queda forzado en cualquiera → servicio de dominio [IDDD cap. 7], con los límites de arriba.
4. Coordinar, autorizar, cargar, guardar, publicar → caso de uso [IDDD cap. 14].
5. Formato, protocolo, otro sistema → adaptador o ACL.

Una regla con nombre que decide si algo cumple un criterio es una `Specification` (`ddd-skills/ddd-value-objects-entidades/GUIA.md`). Usar servicios por defecto lleva al modelo anémico; una "mini capa" de servicios de dominio es un camino peligroso [IDDD cap. 7].

## Reglas de los libros

* Servicio de dominio: sin estado, operación del lenguaje ubicuo, recibe y devuelve objetos de dominio [IDDD cap. 7]; puede leer agregados para cálculos o validar composiciones, pero no modifica varios [IDDD cap. 5 y cap. 7]; su interfaz puede tener implementación técnica en infraestructura [IDDD cap. 7]. Sin `Impl` [IDDD cap. 7].
* Caso de uso: fino, cliente directo del modelo [IDDD cap. 4 y cap. 14; PHP: Application]; entrada como comando [PHP: Application]; salida id, DTO o nada, nunca el agregado [IDDD cap. 14].
* Autorización del caso de uso en la aplicación [IDDD cap. 14]; una regla de negocio sobre quién puede algo va en el modelo con conceptos del contexto (`Customer`, no `User`) [IDDD cap. 2]. Cuando la decide solo el actor, `handle` la comprueba primero (`NotAllowedException`); si depende de más datos, consulta un puerto de aplicación propio; una reacción nunca autoriza. La identidad o el rol salen del token en el adaptador, nunca del cuerpo: van al `Input` (`actorId`, `actorRole`) y `toCommand` los convierte en value objects. La autenticación es de la plataforma o del adaptador de entrada.
* Probar servicios de dominio con objetos reales [IDDD cap. 7]; casos de uso con adaptadores en memoria (`InMemoryOrderRepository` del proyecto y `DomainEventBus` sobre `InMemoryEventChannel`), comprobando orquestación [IDDD cap. 12; PHP: Application]; las reglas, en el agregado.

## Referencias

* Servicios de dominio, puertos y tests: `ddd-skills/ddd-servicios-capa-aplicacion/references/servicios-dominio-ts.md`.
* Plantillas de casos de uso, entrada, salida, errores y tests: `ddd-skills/ddd-servicios-capa-aplicacion/references/capa-aplicacion-ts.md`.
* Dónde va cada lógica en Ventas, `PlaceOrder` y reacción: `ddd-skills/ddd-servicios-capa-aplicacion/references/ejemplo-ecommerce.md`.

## Señales de alarma

* `OrderService` con 40 métodos y entidades con getters y setters; `XxxManager`, `XxxHelper` [Destilado cap. 5].
* `if` sobre el estado de una entidad en el caso de uso.
* Un caso de uso que usa otro caso de uso o una reacción, o un servicio de dominio inyectado o construido en `composition.ts`.
* Un servicio de dominio que guarda, publica, abre transacciones o comprueba permisos.
* Un caso de uso que maneja transacciones, guarda dos agregados o devuelve el agregado.
* Un listener que llama a un `UseCase` (o un `UseCase` junto a un listener para la misma reacción); una reacción que lanza errores de negocio o `AggregateNotFoundException` (el canal la reentrega sin fin).
* Reglas de negocio probadas a través del caso de uso con mocks de todo.

## Siguiente guía

* Lecturas complejas → `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`; revisar un proyecto → `ddd-skills/ddd-auditoria-refactorizacion/GUIA.md`.
