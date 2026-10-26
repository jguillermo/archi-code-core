# Servicios de dominio y capa de aplicación

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Los ejemplos están escritos con la API de `@archi-code/ddd` (las clases de su `src`) y se copian tal cual. Las guías deciden el diseño; la forma del código (carpetas y nombres, eventos, constructor y `create` del agregado, casos de uso de usuario y por reacción) la fija `ddd-skills/archi-code-ddd/`, que manda si un ejemplo difiere. El paquete se aparta de los libros donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]`; cualquier otra discrepancia sobre una regla de DDD es un defecto del paquete.
>
> **Cuándo consultar esta guía.** Servicios de dominio y servicios de aplicación (casos de uso) en DDD con TypeScript. Cubre cuándo una operación merece un servicio de dominio y cuándo pertenece a una entidad o value object, cómo evitar el modelo anémico, cómo escribir casos de uso finos (cargar, invocar, guardar, publicar), comandos y DTOs de entrada, salida mediante DTOs o read models, command bus, dónde queda la transacción (en el repositorio), seguridad y autorización, manejo de errores y tests de la capa de aplicación con adaptadores en memoria. Consúltala siempre que se escriba o revise un "service", "manager", "handler", "use case" o "interactor", cuando la lógica de negocio esté en servicios en vez de en el modelo, al decidir dónde va una regla que implica varios objetos, o al conectar un controlador con el dominio, aunque no se mencione DDD.

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* Hay dos clases de caso de uso; solo cambia de dónde llega la entrada. Un **caso de uso de usuario** extiende `UseCase<Input, Command, Output>`: su fichero (`application/<acción>/<acción>.ts`) exporta `interface <Acción>Input` (primitivos y tipos de datos; `actorId` o `actorRole` si importa el actor), `interface <Acción>Command` (value objects) y la clase; `toCommand` es exactamente `return ValueObjectBuilder.build({ … })` (informa de todos los campos a la vez), y `handle`, sin ayudas de la clase base, sigue este orden: autorización (`NotAllowedException`), id nuevo (`OrderId.generate()`), `Order.create(...)` o `findById` (`AggregateNotFoundException` si es `null`), método de negocio con `this.clock`, `await this.orders.save(order)` una vez, `await this.events.publish(order.pullDomainEvents())`, log si el negocio quiere traza y devolver la salida. No hay puerto de transacciones: el caso de uso recibe el repositorio abstracto de su agregado (`private readonly orders: OrderRepository`, declarado en `domain/repository/`; nunca `AggregateFinder<Order> & AggregateSaver<Order>` ni un rol suelto), `EventBus`, `Clock` y sus puertos propios, y el repositorio garantiza que cada `save` o `remove` es una escritura atómica. Una acción de negocio por caso de uso, con nombre de verbo del negocio (`PlaceOrder`, `CancelOrder`).
* Un **caso de uso por reacción** es el propio listener: una clase `<Acción>On<Evento>` (`application/<acción>/<acción>-on-<evento>.ts`) que extiende `EventListener<Evento>` con `@ListensTo(Evento, { consumer: '<contexto>.<acción>-on-<evento>' })`; su `handle(event)` construye los value objects con `ValueObjectBuilder.build`, calcula el id derivado (`PaymentId.forOrder(order)`), busca o crea el agregado (si ya existe al crear, o falta al cambiar, retorna), llama al método de reacción, guarda una vez y publica. No hay un `UseCase` detrás: los libros ponen un suscriptor en aplicación que llama a un servicio de aplicación [IDDD cap. 8]. Nunca comprueba autorización ni lanza `AggregateNotFoundException` ni errores de negocio, y no captura errores: `DomainEventBus` registra el fallo y lo devuelve al canal, cuya reentrega es el reintento.
* Un caso de uso nunca importa ni llama a otro: las acciones se encadenan con eventos. No hay bus de comandos: el punto de entrada llama a `execute(input)` y el bus entrega cada evento a sus reacciones.
* Los servicios de dominio son clases sin base en `domain/service/` (junto a sus puertos de dominio) que reciben agregados y value objects, y pueden leer con el repositorio del agregado (solo `findById`) o un puerto de dominio; nunca guardan ni publican, y no tocan la persistencia.
* Errores: `AggregateNotFoundException` (404) y `NotAllowedException` (403) en el caso de uso de usuario, errores de negocio en el dominio (`OrderNotCancellable extends DomainException`, sin sufijo `Exception`, código por contexto como `SAL002`), y en los puntos de entrada un ayudante por protocolo con `ExceptionClassifier.classify(error)`, cuyo `ExceptionKind` traduce a sus códigos; `execute` envuelve cualquier error ajeno al paquete en `UnexpectedErrorException` con `cause`.
* Un `ConcurrencyException` se deja llegar al punto de entrada (409) o, si el comando es seguro de repetir, se reintenta con un bucle en `handle` (`private static readonly ATTEMPTS = 3`) en el que cada intento vuelve a cargar el agregado y vuelve a guardarlo. Un caso de uso por reacción no reintenta por sí mismo: reintenta la reentrega del canal.
* Un caso de uso por reacción registra un hecho: no lanza si falta el agregado (retorna, para que el canal no lo reentregue sin fin) y el método de reacción del agregado retorna sin cambios cuando el hecho ya no aplica.

Dos cosas con el mismo nombre ("servicio") y papeles opuestos. Confundirlas es la vía más rápida hacia un modelo anémico [IDDD cap. 7 y cap. 14].

| | Servicio de dominio | Servicio de aplicación |
|---|---|---|
| Contiene lógica de negocio | **Sí** | **No** |
| Vive en | `domain/service/` | `application/<acción>/` |
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
* Pueden leer agregados por repositorio para cálculos o validaciones de composición [IDDD cap. 5 y cap. 7], pero **no modifican varios agregados** en una misma operación. Con el paquete, el servicio recibe el repositorio del agregado (`OrderRepository`, el que declara el dominio) y solo llama a `findById`, o el caso de uso le pasa los agregados ya cargados; nunca guarda ni borra.
* El paquete no trae clase base: un servicio de dominio es una clase normal; una regla con nombre que decide si algo cumple un criterio es una `Specification<T>` de `@archi-code/ddd/domain`.

Ejemplos e implementación en `ddd-skills/ddd-servicios-capa-aplicacion/references/servicios-dominio-ts.md`.

## Paso 3. Servicios de aplicación

* Clientes directos del modelo; un método por flujo de caso de uso; según IDDD controlan transacciones y seguridad [IDDD cap. 14]. Con el paquete la seguridad sigue en el caso de uso, pero la transacción pasa al repositorio `[Fuera de los libros: convención de @archi-code/ddd]`.
* **Finos.** Si crecen, la lógica de dominio se escapa y el modelo se vuelve anémico [IDDD cap. 4 y cap. 14; PHP: Application].
* Forma típica: recibir parámetros, obtener el agregado del repositorio, ejecutar un comando sobre él, guardar [IDDD cap. 4].
* Entrada con primitivos, DTOs o, mejor, objetos comando [PHP: Application, citando a Vernon]. Con el paquete, un `Input` plano de primitivos y un `Command` de value objects que construye `toCommand`, las dos interfaces en el fichero del caso de uso; un caso de uso por reacción recibe el evento `[Fuera de los libros: convención de @archi-code/ddd]`.
* Salida: identificador, DTO de lectura, o nada (con un puerto de salida), según lo que necesite el cliente [IDDD cap. 14]. Es el tipo `Output` de `UseCase`; nunca el agregado.
* Transacciones: IDDD las pone en el servicio de aplicación [IDDD cap. 14]. Con el paquete la aplicación nunca abre, une ni cierra transacciones y no hay puerto para ello: el adaptador del repositorio es responsable de todo lo de persistencia (que cada `save`/`remove` sea atómico, la comprobación de versión con `ConcurrencyException`, la conexión o sesión, envolver los errores del driver en `InternalErrorException` con `{ cause }`). "Una transacción por agregado" se traduce en "una escritura atómica por agregado, garantizada por el repositorio" `[Fuera de los libros: convención de @archi-code/ddd]`.

Plantilla, variantes y errores frecuentes en `ddd-skills/ddd-servicios-capa-aplicacion/references/capa-aplicacion-ts.md`.

## Paso 4. Seguridad

* La autorización del caso de uso ("¿puede este usuario cancelar pedidos?") es responsabilidad de la aplicación [IDDD cap. 14]: cuando la decide solo el actor (únicamente tesorería confirma transferencias), `handle` la comprueba primero y lanza `NotAllowedException` (403); si depende de más datos, consulta un puerto de aplicación propio. Un caso de uso por reacción nunca autoriza.
* Si la regla es de negocio ("solo el cliente que hizo el pedido puede cancelarlo"), pertenece al modelo y se expresa con conceptos del contexto (`Customer`, no `User`) [IDDD cap. 2].
* La identidad o el rol del solicitante vienen del token en el adaptador, nunca del cuerpo de la petición; el adaptador los pone en el `Input` (`actorId`, `actorRole`) y `toCommand` los convierte en value objects.
* La autenticación (quién es el solicitante) la resuelve la plataforma o el adaptador de entrada según las normas del proyecto; esta guía solo cubre dónde encaja la autorización en la arquitectura.

## Paso 5. Probar

* Servicios de dominio: tests unitarios con objetos de dominio reales [IDDD cap. 7].
* Servicios de aplicación: con repositorios y adaptadores **en memoria**; comprueban orquestación, no reglas de negocio [IDDD cap. 12; PHP: Application]. El repositorio en memoria lo escribe el proyecto, uno por agregado, en `infrastructure/persistence/` si la aplicación corre en memoria o en `test/support/` como doble de test (`InMemoryOrderRepository extends OrderRepository`, como en `ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`); del paquete: `DomainEventBus` sobre `InMemoryEventChannel` (`channel.sent`) y `FixedClock`.
* Las reglas de negocio se prueban en el agregado o el value object, no a través del caso de uso.

## Señales de alarma

* `OrderService` con 40 métodos y entidades con solo getters y setters [Destilado cap. 5].
* `if` sobre el estado de una entidad dentro del servicio de aplicación.
* Servicios de dominio llamados `XxxManager`, `XxxHelper`, `XxxUtils` [Destilado cap. 5].
* Un servicio de dominio que abre transacciones o comprueba permisos de usuario.
* Un caso de uso que abre o maneja transacciones, o recibe un runner de transacciones o una unidad de trabajo: eso va dentro del adaptador del repositorio.
* Un caso de uso que guarda dos agregados.
* El caso de uso devuelve el agregado al controlador.
* Un caso de uso que importa o llama a otro caso de uso o a una reacción.
* Un listener que llama a un `UseCase` (o un `UseCase` junto a un listener para la misma reacción): la reacción es el caso de uso.
* Una reacción que lanza un error de negocio o `AggregateNotFoundException`: el canal la reentrega sin fin.
* Tests de reglas de negocio escritos contra el caso de uso con mocks de todo.

## Ejemplo

`ddd-skills/ddd-servicios-capa-aplicacion/references/ejemplo-ecommerce.md`: lo que Ventas añade al `Order` de `ddd-skills/ddd-agregados/references/implementacion-ts.md` (`TotalAtLeast`, `Customer`, `OrderCancellation`), caso de uso `PlaceOrder`, caso de uso por reacción `RegisterStockReservationOnStockItemReserved` con su copia del evento de Almacén y su test. El servicio de dominio `ShippingCostCalculator` está en `ddd-skills/ddd-servicios-capa-aplicacion/references/servicios-dominio-ts.md`, y `CancelOrder`, `AddOrderLine` y la plantilla de caso de uso por reacción en `ddd-skills/ddd-servicios-capa-aplicacion/references/capa-aplicacion-ts.md`.

## Siguiente guía

* Si las lecturas se complican o hay mucho volumen → `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`.
* Para revisar un proyecto existente con todo esto → `ddd-skills/ddd-auditoria-refactorizacion/GUIA.md`.
