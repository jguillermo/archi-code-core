# Chuleta de reglas DDD

## Integración entre contextos
* Un Bounded Context es una frontera lingüística; un lenguaje ubicuo por contexto [IDDD cap. 2; Destilado cap. 2].
* El lenguaje ubicuo se implementa en el código: clases y métodos con sus nombres [IDDD cap. 1].
* No partir contextos por tecnología ni por reparto de tareas; usar módulos [IDDD cap. 2 y cap. 9].
* ACL frente a sistemas heredados y externos; no hablar su lenguaje [Destilado cap. 4].
* Consumidores dependen del esquema publicado, no de clases del productor [Destilado cap. 4; IDDD cap. 13]. Con el paquete, un contexto nunca importa otro: cada consumidor declara su propia copia del evento ajeno (mismo nombre de clase y `eventName`, solo los campos que lee) junto al caso de uso por reacción que lo escucha `[Fuera de los libros: convención de @archi-code/ddd]`.
* Mensajería: al menos una vez + receptor idempotente [Destilado cap. 4].
* Nada de cadenas de peticiones síncronas bloqueantes entre contextos [Destilado cap. 4].

## Arquitectura
* Dominio libre de tecnología; los libros ponen las transacciones en la capa de aplicación [Destilado cap. 2; IDDD cap. 12]. Con el paquete, la transacción y todo lo de persistencia son del adaptador del repositorio; la aplicación no abre, une ni cierra transacciones `[Fuera de los libros: convención de @archi-code/ddd]`.
* Hexagonal con inversión de dependencias [IDDD cap. 4].
* Servicios de aplicación finos [IDDD cap. 4 y cap. 14].
* No exponer el modelo directamente por REST [IDDD cap. 4].
* Módulos con nombres del lenguaje, no de patrones [IDDD cap. 9; PHP: Modules]. Con el paquete, el dominio de cada contexto se divide por tipo de clase (`aggregate/`, `entity/`, `value-object/`, `event/`, `exception/`, `repository/`, `service/`, `specification/`) y la aplicación por acción de negocio (`place-order/`) `[Fuera de los libros: convención de @archi-code/ddd]`.
* Un composition root por contexto (`<Context>Context.start/stop`), el único que construye y suscribe; los controladores solo comprueban actor y forma, llaman al caso de uso y dejan que un ayudante del protocolo traduzca los errores con `ExceptionClassifier` `[Fuera de los libros: convención de @archi-code/ddd]`.
* CQRS y Event Sourcing solo para mitigar riesgos concretos [IDDD cap. 4].

## Táctico
* Preferir value objects; inmutables, igualdad por valor, sin efectos secundarios [IDDD cap. 6].
* Entidades: identidad estable, comportamiento con nombres del negocio, sin setters públicos [IDDD cap. 5]. Con el paquete, constructor público que solo asigna, `static create(id, …, clock)` con el estado inicial, las invariantes de creación y `<Agregado>CreatedDomainEvent`, y el id lo pasa el caso de uso `[Fuera de los libros: convención de @archi-code/ddd]`.
* Identidad temprana si hay eventos de creación [IDDD cap. 5].
* El modelo de datos se subordina al de dominio [IDDD cap. 6].
* Agregados: invariantes reales dentro, pequeños, referencias por identidad, consistencia eventual fuera [Destilado cap. 5; IDDD cap. 10].
* Una transacción, un agregado [Destilado cap. 5; IDDD cap. 10]. Con el paquete: una escritura atómica por agregado, garantizada por el repositorio en cada `save`/`remove` `[Fuera de los libros: convención de @archi-code/ddd]`.
* "¿De quién es el trabajo?" para desempatar [IDDD cap. 10].
* No inyectar repositorios en agregados [IDDD cap. 10].
* Eventos en pasado, con lo necesario, sin estado completo [Destilado cap. 6]. Con el paquete, `<Agregado><AcciónEnPasado>DomainEvent`, `eventName` `'<agregado>.<acción_en_pasado>'`, campos primitivos y un constructor `{ …campos } & EventMetadata` `[Fuera de los libros: convención de @archi-code/ddd]`.
* Agregado y evento en la misma transacción; publicar después [Destilado cap. 6; IDDD cap. 8]. Con el paquete, si el evento no puede perderse, el repositorio escribe el agregado y sus eventos pendientes en la misma escritura atómica (outbox) y un relay los entrega por un `EventChannel` `[Fuera de los libros: convención de @archi-code/ddd]`.
* Un repositorio por agregado, declarado en el dominio; no es un DAO [IDDD cap. 12]. Con el paquete, una clase abstracta `domain/repository/OrderRepository.ts` que extiende `AggregateRepository<Order>` con solo los verbos que el negocio necesita (`findById`, `save`, `remove`), cada uno implementando su rol (`AggregateFinder`, `AggregateSaver`, `AggregateRemover`); todo caso de uso del agregado la recibe, nunca los roles `[Fuera de los libros: convención de @archi-code/ddd]`.
* Servicio de dominio solo si la operación no encaja en una entidad o valor; sin estado [IDDD cap. 7].
* Métodos que revelan intención; funciones sin efectos secundarios [IDDD cap. 5 y cap. 6].
* Reglas con nombre del negocio que se combinan: Specification [IDDD cap. 5; PHP: Repositories].
* Un hecho de otro contexto no se rechaza: el agregado lo registra y, si no encaja, emite un evento para compensar [Destilado cap. 6]. Con el paquete, el método de reacción retorna sin cambios cuando el hecho ya no aplica y el caso de uso por reacción retorna si falta el agregado; nunca lanzan errores de negocio `[Fuera de los libros: convención de @archi-code/ddd]`.
* Casos de uso: uno por acción de negocio, guarda un agregado una vez. De usuario: `UseCase` con `Input` y `Command` en su fichero. Por reacción: un `EventListener` con `@ListensTo(Evento, { consumer: '<contexto>.<acción>-on-<evento>' })` que es el propio caso de uso, sin `UseCase` detrás `[Fuera de los libros: convención de @archi-code/ddd]`.
* Errores de negocio con el nombre de lo que salió mal, sin sufijo `Exception`, y un código por contexto (`SAL001`) `[Fuera de los libros: convención de @archi-code/ddd]`.
