# Chuleta de reglas DDD

Las marcadas `[Fuera de los libros: convención de @archi-code/ddd]` son del paquete.

## Integración
* Un Bounded Context es una frontera lingüística con su lenguaje ubicuo, implementado en el código [IDDD cap. 1 y 2; Destilado cap. 2].
* No partir contextos por tecnología ni por equipos; usar módulos [IDDD cap. 2 y 9].
* ACL frente a sistemas heredados y externos [Destilado cap. 4].
* Los consumidores dependen del esquema publicado, no de clases del productor [Destilado cap. 4; IDDD cap. 13]. Un contexto nunca importa otro: declara una copia de cada evento ajeno por contexto (unión de los campos que leen sus reacciones, junto a la primera reacción que lo escucha, registrada una vez); si un hecho de cierre llega antes que el de creación, la reacción crea el agregado ya cerrado con el id derivado `[Fuera de los libros: convención de @archi-code/ddd]`.
* Mensajería al menos una vez + receptor idempotente; nada de cadenas síncronas bloqueantes [Destilado cap. 4].

## Arquitectura
* Dominio libre de tecnología; hexagonal con inversión de dependencias [Destilado cap. 2; IDDD cap. 4].
* Los libros ponen la transacción en la aplicación [IDDD cap. 12]; aquí es del repositorio: cada `save`/`remove` es atómico `[Fuera de los libros: convención de @archi-code/ddd]`.
* Servicios de aplicación finos; no exponer el modelo por REST [IDDD cap. 4 y 14].
* Módulos con nombres del lenguaje [IDDD cap. 9; PHP: Modules]; aquí `domain/<agregado>/<tipo>/` (una carpeta por agregado y, dentro, por tipo de clase; la única excepción es `domain/shared/<tipo>/`, para los tipos que usa más de un agregado del contexto) y `application/` por acción de negocio `[Fuera de los libros: convención de @archi-code/ddd]`.
* Un `composition.ts` por contexto, el único que construye y suscribe; controladores que solo comprueban actor y forma y traducen errores con `ExceptionClassifier` vía un ayudante `[Fuera de los libros: convención de @archi-code/ddd]`.
* CQRS y Event Sourcing solo para riesgos concretos [IDDD cap. 4].

## Táctico
* Preferir value objects: inmutables, igualdad por valor, sin efectos secundarios [IDDD cap. 6].
* Entidades con identidad estable y comportamiento del negocio, sin setters [IDDD cap. 5]. Constructor público que solo asigna y `static create(id, …)` con el evento de creación; el id lo pasa el caso de uso `[Fuera de los libros: convención de @archi-code/ddd]`.
* Identidad temprana [IDDD cap. 5]. El modelo de datos se subordina al de dominio [IDDD cap. 6].
* Agregados pequeños, invariantes reales dentro, referencias por identidad, consistencia eventual fuera; una transacción, un agregado [Destilado cap. 5; IDDD cap. 10]. "¿De quién es el trabajo?" para desempatar [IDDD cap. 10].
* Una regla sobre el estado de un agregado (solo el comprador cancela) es un método del agregado `[Fuera de los libros: convención de @archi-code/ddd]`.
* No inyectar repositorios ni servicios en agregados [IDDD cap. 10].
* Eventos en pasado con lo necesario [Destilado cap. 6]; `<Agregado><AcciónEnPasado>DomainEvent`, `eventName` `'<agregado>.<acción_en_pasado>'`, campos primitivos `[Fuera de los libros: convención de @archi-code/ddd]`.
* Agregado y evento en la misma transacción; publicar después [Destilado cap. 6; IDDD cap. 8]: si no puede perderse, outbox en el `save` del repositorio `[Fuera de los libros: convención de @archi-code/ddd]`.
* Un repositorio por agregado, declarado en el dominio, no un DAO [IDDD cap. 12]. Clase abstracta `OrderRepository extends AggregateRepository<Order>` con solo los verbos que necesita (`findById`, `search`, `save`, `remove`); una consulta de negocio es un `Criteria` para `search` (para cambiar agregados) o un read model (para mostrar); un adaptador por agregado y tecnología, IndexedDB sobre la tabla que da `IndexedDbDatabase` con su `IndexedDbSchema` `[Fuera de los libros: convención de @archi-code/ddd]`.
* Servicio de dominio solo si la operación no encaja en una entidad o valor; sin estado [IDDD cap. 7]. Aquí, solo cuando dos casos de uso comparten lógica o la regla necesita varios agregados; lo instancia el caso de uso en `handle` con dependencias que recibió por constructor (nunca inyectado, nunca la implementación del repositorio); solo lo ejecutan los casos de uso, nunca un agregado ni otro servicio de dominio, y sí puede instanciar, modificar y persistir agregados con el repositorio abstracto que recibió del caso de uso (un solo guardado por caso de uso; nunca publica); es siempre una clase concreta con lógica de negocio, nunca abstracta ni interfaz, y la infraestructura nunca lo implementa: del dominio solo implementa los repositorios abstractos, y no existen puertos de dominio (toda interfaz que implementa la infraestructura, salvo el repositorio, es un puerto de aplicación) `[Fuera de los libros: convención de @archi-code/ddd]`.
* Interfaces que revelan intención; Specification para reglas con nombre que se combinan [IDDD cap. 5 y 6; PHP: Repositories].
* Un hecho de otro contexto no se rechaza: se registra y, si no encaja, se emite un evento para compensar [Destilado cap. 6]. El método de reacción vuelve sin cambios si no aplica y la reacción vuelve si falta el agregado; nunca lanzan errores de negocio `[Fuera de los libros: convención de @archi-code/ddd]`.
* Caso de uso: una acción de negocio, un agregado guardado una vez, nunca usa otro caso de uso, nunca decide según el estado del agregado (lo decide un método del agregado) y solo reintenta un conflicto si el comando es seguro de repetir (nunca un cambio relativo como un descuento). De usuario: `UseCase`. Por reacción: `EventListener` con `@ListensTo(Evento, { consumer: '<contexto>.<acción>-on-<evento>' })`, sin `UseCase` detrás `[Fuera de los libros: convención de @archi-code/ddd]`.
* Errores de negocio sin sufijo `Exception` y con código por contexto (`SAL001`) `[Fuera de los libros: convención de @archi-code/ddd]`.
* Efecto externo (cobro, email): el caso de uso guarda la intención y una reacción llama al puerto directamente con una clave de idempotencia por intento y por efecto (el `eventId` que lo pide); una unicidad entre agregados es un id derivado, nunca un `search` previo; los parámetros de una consulta los valida el puerto de consulta, no el controlador `[Fuera de los libros: convención de @archi-code/ddd]`.
