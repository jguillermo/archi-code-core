# Servicios de dominio y capa de aplicación

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Los ejemplos están escritos con la API de `@archi-code/ddd` (las clases de su `src`) y se copian tal cual; las guías son la fuente de verdad: el paquete solo se aparta de ellas donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]`, y cualquier otra discrepancia es un defecto del paquete.
>
> **Cuándo consultar esta guía.** Servicios de dominio y servicios de aplicación (casos de uso) en DDD con TypeScript. Cubre cuándo una operación merece un servicio de dominio y cuándo pertenece a una entidad o value object, cómo evitar el modelo anémico, cómo escribir casos de uso finos (cargar, invocar, guardar, publicar), comandos y DTOs de entrada, salida mediante DTOs o read models, command bus, dónde queda la transacción (en el repositorio), seguridad y autorización, manejo de errores y tests de la capa de aplicación con adaptadores en memoria. Consúltala siempre que se escriba o revise un "service", "manager", "handler", "use case" o "interactor", cuando la lógica de negocio esté en servicios en vez de en el modelo, al decidir dónde va una regla que implica varios objetos, o al conectar un controlador con el dominio, aunque no se mencione DDD.

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* Un caso de uso extiende `UseCase<Input, Command, Output>`: un `Input` de primitivos, un `Command` de value objects que construye `toCommand` con `ValueObjects.build` (informa de todos los campos a la vez), y `handle`, sin ayudas de la clase base, carga, cambia, guarda (`await this.orders.save(order)`) y publica (`await this.events.publish(order.pullDomainEvents())`). No hay puerto de transacciones: el caso de uso recibe solo los roles de repositorio que usa (`AggregateFinder`, `AggregateSaver`, `AggregateRemover`), `EventBus`, `Clock` y sus puertos propios, y el repositorio garantiza que cada `save` o `remove` es una escritura atómica. Una acción de negocio por caso de uso, con nombre de verbo del negocio (`PlaceOrder`, `AddOrderLine`).
* Un caso de uso nunca importa ni llama a otro: las acciones se encadenan con eventos y listeners `<Acción>On<Evento>` decorados con `@ListensTo`, que solo mapean el evento a la entrada de un caso de uso. No hay bus de comandos: el punto de entrada llama a `execute(input)`.
* Los servicios de dominio son clases sin base en `domain/` que reciben agregados y value objects, y pueden leer con un contrato `AggregateFinder` o un puerto de dominio; nunca guardan ni publican, y no tocan la persistencia.
* Errores: `AggregateNotFoundException` (404) y `NotAllowedException` (403) en el caso de uso, `DomainException` con código propio en el dominio, y `HttpErrorMapper` en los puntos de entrada; `execute` envuelve cualquier error ajeno al paquete en `InternalErrorException` con `cause`.
* Un `ConcurrencyException` se reintenta, si el comando es seguro de repetir, con un bucle en `handle` con un límite de intentos en el que cada intento vuelve a cargar el agregado y vuelve a guardarlo. Un caso de uso que ejecuta un listener no reintenta por sí mismo: reintenta la reentrega del canal.
* Un caso de uso que ejecuta un listener para registrar un hecho no lanza si falta el agregado: retorna, para que el canal no lo reentregue sin fin.

Dos cosas con el mismo nombre ("servicio") y papeles opuestos. Confundirlas es la vía más rápida hacia un modelo anémico [IDDD cap. 7 y cap. 14].

| | Servicio de dominio | Servicio de aplicación |
|---|---|---|
| Contiene lógica de negocio | **Sí** | **No** |
| Vive en | `domain/` | `application/` |
| Nombre | Del lenguaje ubicuo | Del caso de uso |
| Estado | Sin estado [IDDD cap. 7] | Sin estado; coordina |
| Transacciones y seguridad | Nunca [IDDD cap. 7] | Seguridad sí; transacciones según IDDD sí [IDDD cap. 14], con el paquete las garantiza el repositorio `[Fuera de los libros: convención de @archi-code/ddd]` |
| Quién lo llama | Servicios de aplicación (u otros de dominio) | Adaptadores de entrada (HTTP, mensajes, CLI) |

Ninguno es un servicio SOA remoto ni tiene por qué ser pesado [IDDD cap. 7].


## Paso 1. ¿Dónde va esta lógica?

Árbol de decisión `[Fuera de los libros: síntesis de IDDD cap. 7, cap. 10 y cap. 14]`:

1. ¿Es una regla sobre el estado de **un** agregado? → método del agregado.
2. ¿Es un cálculo o comportamiento sobre unos valores? → método del value object.
3. ¿Es un proceso de negocio relevante, una transformación de una composición a otra, o un cálculo que necesita **varios** objetos de dominio y queda forzado en cualquiera de ellos? → **servicio de dominio** [IDDD cap. 7].
4. ¿Es coordinación: cargar, decidir qué invocar, guardar, publicar, autorizar? → **servicio de aplicación** [IDDD cap. 14].
5. ¿Es formato, protocolo o traducción de otro sistema? → adaptador o ACL.

Si la "lógica" es una regla con nombre que decide si algo cumple un criterio (cliente moroso, pedido apto para envío urgente), suele ser una **Specification**, no un servicio (ver `ddd-skills/ddd-value-objects-entidades/GUIA.md`).

Antes de crear un servicio de dominio, asegúrate de que lo necesitas. Usarlos por defecto lleva al modelo anémico [IDDD cap. 7]. IDDD admite una "mini capa" de servicios de dominio en algunos contextos, pero avisa de que es un camino peligroso [IDDD cap. 7].

## Paso 2. Servicios de dominio

* Interfaz con el lenguaje del modelo; el nombre de la operación forma parte del lenguaje ubicuo; sin estado [IDDD cap. 7, citando a Evans].
* Reciben y devuelven objetos de dominio, no DTOs ni primitivos.
* Algunos tienen implementación técnica en infraestructura, sobre todo los de integración, con interfaz en el dominio (ver la ACL en `ddd-skills/ddd-context-mapping/GUIA.md`) [IDDD cap. 7].
* Pueden leer agregados por repositorio para cálculos o validaciones de composición [IDDD cap. 5 y cap. 7], pero **no modifican varios agregados** en una misma operación. Con el paquete, el servicio lee con `AggregateFinder` (el contrato del dominio) o el caso de uso le pasa los agregados ya cargados; nunca recibe `AggregateSaver` ni `AggregateRemover`.
* El paquete no trae clase base: un servicio de dominio es una clase normal; una regla con nombre que decide si algo cumple un criterio es una `Specification<T>` de `@archi-code/ddd/domain`.

Ejemplos e implementación en `ddd-skills/ddd-servicios-capa-aplicacion/references/servicios-dominio-ts.md`.

## Paso 3. Servicios de aplicación

* Clientes directos del modelo; un método por flujo de caso de uso; según IDDD controlan transacciones y seguridad [IDDD cap. 14]. Con el paquete la seguridad sigue en el caso de uso, pero la transacción pasa al repositorio `[Fuera de los libros: convención de @archi-code/ddd]`.
* **Finos.** Si crecen, la lógica de dominio se escapa y el modelo se vuelve anémico [IDDD cap. 4 y cap. 14; PHP: Application].
* Forma típica: recibir parámetros, obtener el agregado del repositorio, ejecutar un comando sobre él, guardar [IDDD cap. 4].
* Entrada con primitivos, DTOs o, mejor, objetos comando [PHP: Application, citando a Vernon]. Con el paquete, un `Input` plano de primitivos y un `Command` de value objects que construye `toCommand` `[Fuera de los libros: convención de @archi-code/ddd]`.
* Salida: identificador, DTO de lectura, o nada (con un puerto de salida), según lo que necesite el cliente [IDDD cap. 14]. Es el tipo `Output` de `UseCase`; nunca el agregado.
* Transacciones: IDDD las pone en el servicio de aplicación [IDDD cap. 14]. Con el paquete la aplicación nunca abre, une ni cierra transacciones y no hay puerto para ello: el adaptador del repositorio es responsable de todo lo de persistencia (que cada `save`/`remove` sea atómico, la comprobación de versión con `ConcurrencyException`, la conexión o sesión, envolver los errores del driver en `InternalErrorException` con `{ cause }`). "Una transacción por agregado" se traduce en "una escritura atómica por agregado, garantizada por el repositorio" `[Fuera de los libros: convención de @archi-code/ddd]`.

Plantilla, variantes y errores frecuentes en `ddd-skills/ddd-servicios-capa-aplicacion/references/capa-aplicacion-ts.md`.

## Paso 4. Seguridad

* La autorización del caso de uso ("¿puede este usuario cancelar pedidos?") es responsabilidad de la aplicación [IDDD cap. 14]: el caso de uso consulta un puerto de aplicación propio (`SalesPermissions`) y lanza `NotAllowedException` (403).
* Si la regla es de negocio ("solo el cliente que hizo el pedido puede cancelarlo"), pertenece al modelo y se expresa con conceptos del contexto (`Customer`, no `User`) [IDDD cap. 2].
* La identidad del solicitante viene del token en el adaptador, nunca del cuerpo de la petición; el adaptador la pone en el `Input` y `toCommand` la convierte en value object.
* La autenticación (quién es el solicitante) la resuelve la plataforma o el adaptador de entrada según las normas del proyecto; esta guía solo cubre dónde encaja la autorización en la arquitectura.

## Paso 5. Probar

* Servicios de dominio: tests unitarios con objetos de dominio reales [IDDD cap. 7].
* Servicios de aplicación: con repositorios y adaptadores **en memoria**; comprueban orquestación, no reglas de negocio [IDDD cap. 12; PHP: Application]. El repositorio en memoria lo escribe el proyecto en `test/support/`, uno por agregado (`InMemoryOrderRepository`, como en `ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`); del paquete: `DomainEventBus` sobre `InMemoryEventChannel` (`channel.sent`) y `FixedClock`.
* Las reglas de negocio se prueban en el agregado o el value object, no a través del caso de uso.

## Señales de alarma

* `OrderService` con 40 métodos y entidades con solo getters y setters [Destilado cap. 5].
* `if` sobre el estado de una entidad dentro del servicio de aplicación.
* Servicios de dominio llamados `XxxManager`, `XxxHelper`, `XxxUtils` [Destilado cap. 5].
* Un servicio de dominio que abre transacciones o comprueba permisos de usuario.
* Un caso de uso que abre o maneja transacciones, o recibe un runner de transacciones o una unidad de trabajo: eso va dentro del adaptador del repositorio.
* Un caso de uso que guarda dos agregados.
* El caso de uso devuelve el agregado al controlador.
* Un caso de uso que importa o llama a otro caso de uso.
* Tests de reglas de negocio escritos contra el caso de uso con mocks de todo.

## Ejemplo

`ddd-skills/ddd-servicios-capa-aplicacion/references/ejemplo-ecommerce.md`: lo que Ventas añade al `Order` de `ddd-skills/ddd-agregados/references/implementacion-ts.md` (`OrderAbove`, `Customer`, `OrderCancellation`), caso de uso `PlaceOrder`, listener `RegisterReservationOnStockReserved` con su caso de uso `RegisterReservation` y su test. El servicio de dominio `ShippingCostCalculator` está en `ddd-skills/ddd-servicios-capa-aplicacion/references/servicios-dominio-ts.md`, y `CancelOrder` y `AddOrderLine` en `ddd-skills/ddd-servicios-capa-aplicacion/references/capa-aplicacion-ts.md`.

## Siguiente guía

* Si las lecturas se complican o hay mucho volumen → `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`.
* Para revisar un proyecto existente con todo esto → `ddd-skills/ddd-auditoria-refactorizacion/GUIA.md`.
