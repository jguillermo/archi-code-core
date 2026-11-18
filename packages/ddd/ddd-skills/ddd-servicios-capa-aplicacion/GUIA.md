# Servicios de dominio y capa de aplicación

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Los ejemplos usan la API de `@archi-code/ddd`; la forma del código la fija `ddd-skills/archi-code-ddd/`, que manda si un ejemplo difiere. El paquete se aparta de los libros donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]`.
>
> **Cuándo consultarla.** Al escribir o revisar un "service", "manager", "handler", "use case" o "interactor", al decidir dónde va una regla que implica varios objetos o al conectar un controlador con el dominio.

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

La forma del código (clases, constructores, `toCommand`/`handle`, reacciones, servicios de dominio, controladores y `composition.ts`) está en `ddd-skills/archi-code-ddd/use-cases.md`, `ddd-skills/archi-code-ddd/reactions.md`, `ddd-skills/archi-code-ddd/domain-services.md` y `ddd-skills/archi-code-ddd/composition-and-entry-points.md`. Lo que se aparta de los libros:

* La reacción a un evento **es** el caso de uso (un listener, sin servicio de aplicación detrás); los libros ponen un suscriptor que llama a un servicio de aplicación [IDDD cap. 8].
* Un caso de uso nunca usa otro caso de uso, sin excepción: las acciones se encadenan con eventos y la lógica compartida va al agregado o a un servicio de dominio.
* Servicio de dominio solo si lo comparten dos casos de uso o la regla necesita varios agregados (IDDD cap. 7 es más amplio); lo instancia el caso de uso, nunca se inyecta ni lo construye el composition root.
* Solo los casos de uso ejecutan servicios de dominio, sin excepción: el caso de uso tiene en su constructor el repositorio que el servicio necesita y lo ejecuta dentro de `handle`. Un agregado nunca llama, instancia ni recibe un servicio de dominio (ni por constructor ni como argumento de un método), y un servicio de dominio nunca instancia, recibe ni ejecuta otro servicio de dominio. El servicio de dominio sí instancia y modifica agregados, y sí puede persistirlos con el `save` del repositorio abstracto que recibió por constructor: es posible porque el caso de uso tiene esa instancia del repositorio, instancia el servicio con ella y lo ejecuta (IDDD cap. 7 deja el guardado al servicio de aplicación). Un agregado se guarda una sola vez por caso de uso, en el servicio o en el caso de uso; publicar sigue siendo del caso de uso.
* **La regla más importante: el dominio solo se implementa en sus repositorios; no existen los puertos de dominio**, sin excepción. Lo único del dominio que otra capa implementa es el repositorio abstracto de un agregado (en `infrastructure/`). Nada más del dominio se implementa nunca en infraestructura ni en aplicación: en `domain/<agregado>/service/` solo hay clases concretas, nunca una interfaz, una clase abstracta ni un tipo para implementar en otro lugar. Un «puerto de dominio» no existe y nunca se crea. Si el dominio parece necesitar una interfaz, se refactoriza el dominio: el dato pasa a ser un agregado del contexto leído por su repositorio abstracto (`Coupon` y `CouponRepository`, nunca una interfaz `CouponCatalog`), o la capacidad técnica pasa a ser un puerto de aplicación (interfaz en `application/`, implementada en `infrastructure/`) que llama el caso de uso, que entrega al dominio lo cargado como value objects (los libros ponen la interfaz en el dominio [IDDD cap. 4 y cap. 7]).
* Un servicio de dominio es siempre una clase concreta (no abstracta) del dominio que realiza lógica de negocio, sin excepción: nunca es una clase abstracta ni una interfaz, ni tiene métodos abstractos, para que la infraestructura lo implemente, y la infraestructura nunca implementa ni extiende un servicio de dominio. Del dominio, la infraestructura solo implementa los repositorios abstractos (IDDD cap. 7 admite una interfaz separada con implementación técnica).
* El caso de uso no abre transacciones: cada `save`/`remove` es atómico en el repositorio (IDDD cap. 14 las pone en el servicio de aplicación).
* No hay bus de comandos (*DDD in PHP* lo usa): el punto de entrada llama al caso de uso directamente.
* No hay caso de uso de consulta: leer es el puerto de consulta de un read model.
* Un efecto externo (cobrar, enviar un email) nunca va antes de guardar: el caso de uso guarda la intención y una reacción ejecuta el efecto con clave de idempotencia y registra el resultado.
* Un "no encontrado" que detecta un servicio de dominio es un error de negocio del contexto, no el de aplicación; el ayudante de protocolo decide si responde 404.

## Dos servicios distintos

| | Servicio de dominio | Servicio de aplicación |
|---|---|---|
| Lógica de negocio | Sí | No, coordina |
| Vive en | `domain/<agregado>/service/` | `application/<acción>/` |
| Nombre | Lenguaje ubicuo | Caso de uso |
| Estado | Sin estado [IDDD cap. 7] | Sin estado |
| Transacciones y seguridad | Nunca [IDDD cap. 7] | Seguridad sí; transacciones según IDDD [IDDD cap. 14], aquí del repositorio |
| Lo llama | Solo casos de uso (nunca un agregado ni otro servicio de dominio) `[Fuera de los libros: convención de @archi-code/ddd]` | Adaptadores de entrada (HTTP, mensajes, CLI) |

Confundirlos lleva al modelo anémico [IDDD cap. 7 y cap. 14]. Ninguno es un servicio SOA remoto ni tiene por qué ser pesado [IDDD cap. 7].

## ¿Dónde va esta lógica?

`[Fuera de los libros: síntesis de IDDD cap. 7, cap. 10 y cap. 14]`

1. Regla sobre el estado de un agregado → método del agregado.
2. Cálculo sobre valores → value object.
3. Proceso de negocio, transformación o cálculo que necesita varios objetos y queda forzado en cualquiera → servicio de dominio [IDDD cap. 7], con los límites de arriba.
4. Coordinar, autorizar, publicar, y cargar o guardar sin regla de negocio alrededor → caso de uso [IDDD cap. 14].
5. Formato, protocolo, otro sistema → adaptador o ACL.

Una regla con nombre que decide si algo cumple un criterio es una `Specification` (`ddd-skills/ddd-value-objects-entidades/GUIA.md`). Usar servicios por defecto lleva al modelo anémico; una "mini capa" de servicios de dominio es un camino peligroso [IDDD cap. 7].

## Reglas de los libros

* Servicio de dominio: sin estado, operación del lenguaje ubicuo, recibe y devuelve objetos de dominio [IDDD cap. 7]; puede leer agregados para cálculos o validar composiciones, pero no modifica varios [IDDD cap. 5 y cap. 7]; es siempre una clase concreta con su lógica de negocio dentro: nunca abstracto ni interfaz, y nunca implementado en infraestructura; si un paso necesita tecnología, ese paso es un puerto de aplicación que llama el caso de uso, que pasa al servicio lo cargado como value objects; no existen puertos de dominio `[Fuera de los libros: convención de @archi-code/ddd]` (IDDD cap. 7 admite una interfaz separada con implementación técnica en infraestructura).
* Caso de uso: fino, cliente directo del modelo [IDDD cap. 4 y cap. 14; PHP: Application]; entrada como comando [PHP: Application]; salida id, DTO o nada, nunca el agregado [IDDD cap. 14].
* Autorización del caso de uso en la aplicación [IDDD cap. 14]; una regla de negocio sobre quién puede algo va en el modelo con conceptos del contexto (`Customer`, no `User`) [IDDD cap. 2]. Cuando la decide solo el actor, el caso de uso la comprueba antes que nada; si depende de más datos, consulta un puerto de aplicación propio; una reacción nunca autoriza (registra hechos que no se rechazan). La identidad o el rol salen del token en el adaptador de entrada, nunca del cuerpo de la petición; la autenticación es de la plataforma o de ese adaptador `[Fuera de los libros: convención de @archi-code/ddd]`. Código: `ddd-skills/archi-code-ddd/use-cases.md`, apartado Rules ("Authorization belongs to the use case").
* Probar servicios de dominio con objetos reales [IDDD cap. 7]; casos de uso con adaptadores en memoria, comprobando la orquestación [IDDD cap. 12; PHP: Application]; las reglas, en el agregado. Código: `ddd-skills/archi-code-ddd/tests.md`.

## Referencias

* Cuándo hay servicio de dominio, sus formas, por qué no existen puertos de dominio y cómo se prueba: `ddd-skills/ddd-servicios-capa-aplicacion/references/servicios-dominio-ts.md`.
* Caso de uso según los libros: entrada, salida, concurrencia, errores y tests: `ddd-skills/ddd-servicios-capa-aplicacion/references/capa-aplicacion-ts.md`.
* Dónde va cada lógica en Ventas, `PlaceOrder` y la reacción a la reserva de stock: `ddd-skills/ddd-servicios-capa-aplicacion/references/ejemplo-ecommerce.md`.

## Señales de alarma

* `OrderService` con 40 métodos y entidades con getters y setters; `XxxManager`, `XxxHelper` [Destilado cap. 5].
* `if` sobre el estado de una entidad en el caso de uso.
* Un caso de uso que usa otro caso de uso o una reacción, o un servicio de dominio inyectado o construido en `composition.ts`.
* Un servicio de dominio que publica, abre transacciones o comprueba permisos; un agregado guardado dos veces en un caso de uso, por el servicio de dominio y por el caso de uso.
* Un agregado, entidad o value object que llama, instancia o recibe un servicio de dominio; un servicio de dominio ejecutado por algo que no es un caso de uso, o que instancia a otro servicio de dominio.
* Un «puerto de dominio»: una interfaz o clase abstracta en `domain/<agregado>/service/` (o en cualquier carpeta del dominio salvo `repository/`) implementada en infraestructura o aplicación.
* Un servicio de dominio declarado como clase abstracta o interfaz, o con métodos abstractos, para implementarlo en infraestructura; una clase de infraestructura que extiende o implementa un servicio de dominio.
* Un caso de uso que maneja transacciones, guarda dos agregados o devuelve el agregado.
* Un listener que llama a un `UseCase` (o un `UseCase` junto a un listener para la misma reacción); una reacción que lanza errores de negocio o `AggregateNotFoundException` (el canal la reentrega sin fin).
* Reglas de negocio probadas a través del caso de uso con mocks de todo.

## Siguiente guía

* Lecturas complejas → `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`; revisar un proyecto → `ddd-skills/ddd-auditoria-refactorizacion/GUIA.md`.
