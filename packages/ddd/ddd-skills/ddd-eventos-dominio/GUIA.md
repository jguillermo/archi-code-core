# Eventos de dominio

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Los ejemplos usan la API de `@archi-code/ddd`; la forma del código la fija `ddd-skills/archi-code-ddd/`, que manda si un ejemplo difiere. El paquete se aparta de los libros donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]`.
>
> **Cuándo consultarla.** Al diseñar un evento, un mensaje entre servicios, un "cuando pase X", una cola o un bus, o cuando se pierden o duplican mensajes.

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* Clase `<Agregado><AcciónEnPasado>DomainEvent` que extiende `EventBase`, con `static readonly eventName = '<agregado>.<acción_en_pasado>'` (snake_case, único en el sistema). Constructor con un único objeto `{ …campos } & EventMetadata` tipado en línea, que llama a `super({ eventId, occurredOn })`. Los libros nombran solo el hecho (`OrderPlaced`) [IDDD cap. 8].
* Un evento es un DTO de primitivos `readonly` sin métodos (regla no comprobada en ejecución: texto, números finitos, booleanos, `null`, listas y objetos planos; `.value` de los value objects, dinero `{ amount, currency }`, fechas ISO); nunca value objects, `Date` ni `toPrimitives()`. La identidad del agregado es un campo (`orderId`).
* El agregado registra con `this.record(new XDomainEvent({ … }))` sin metadatos; `occurredOn` lo pone `DomainEventBus.publish` al enviar (ISO en UTC; conserva el de un evento reconstruido). Sin número de versión: un cambio incompatible es otro `eventName` o una fábrica del `EventRegistry` que lee las dos formas.
* Sin unión de eventos: todo trabaja con `EventBase`. El caso de uso hace `await this.orders.save(order)` y después `await this.events.publish(order.pullDomainEvents())`; nunca abre transacciones.
* Si un evento no puede perderse, el adaptador del repositorio guarda agregado y eventos pendientes en la misma escritura atómica (outbox) y un reenviador los entrega por un `EventChannel`; el caso de uso no cambia. Fuera de ese caso, el repositorio no toca los eventos.
* La aplicación solo ve `EventBus`, `EventListener` y `@ListensTo`; `DomainEventBus`, `EventRegistry` y `EventChannel` son infraestructura del composition root. Cada tecnología implementa solo `EventChannel`. La fábrica del registro pasa `eventId: json.eventId` y `occurredOn: json.occurredOn`.
* La reacción es un caso de uso por reacción `<Acción>On<Evento>` (`extends EventListener`, `@ListensTo(Evento, { consumer: '<contexto>.<acción>-on-<evento>' })`): construye value objects con `ValueObjectBuilder`, carga o crea, llama al método de reacción, guarda y publica. Sin `UseCase` detrás, sin errores de negocio ni `AggregateNotFoundException` (vuelve sin hacer nada).
* Un contexto declara su propia copia del evento de otro (mismo nombre de clase y `eventName`, solo los campos que lee), nunca importa la clase del productor.
* `InMemoryEventChannel` entrega en el acto, antes de que termine el `execute` que publica: solo tests y aplicaciones en memoria (`channel.sent`; `{ delivery: 'parallel' }` ejecuta juntas las reacciones a un evento). En producción, un canal durable entrega tras confirmar la escritura. Outbox, broker, deduplicación y lenguaje publicado se escriben en el proyecto: `ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`.

## Diseño

Detalle y ejemplos en `ddd-skills/ddd-eventos-dominio/references/diseno-eventos.md`.

* Nombre en pasado con el lenguaje del contexto, derivado del comando [Destilado cap. 6; IDDD cap. 8].
* Datos: identidad del agregado y de los implicados, parámetros del comando y valores útiles del estado resultante [Destilado cap. 6; IDDD cap. 8]. Nunca el estado completo ni `XxxUpdated` [Destilado cap. 6].
* Inmutables, con constructor completo [IDDD cap. 8].
* El paso del tiempo también causa eventos con nombre de negocio [Destilado cap. 6].
* Un comando se puede rechazar; un evento es un hecho [Destilado cap. 6].

## Guardar y publicar

Agregado y evento en la misma transacción; publicar después [Destilado cap. 6]. De las tres opciones de IDDD (almacén compartido, XA, event store propio + reenviador) se recomienda la tercera, hoy llamada outbox transaccional [IDDD cap. 8] `[Fuera de los libros como nombre]`; obliga a construir el reenviador y a deduplicar. Con el paquete "la misma transacción" es la escritura atómica del `save` del repositorio.

## Consumir

* Una reacción no modifica otro agregado en la misma transacción: cada reacción, su propia escritura [IDDD cap. 8].
* Entrega al menos una vez → consumidor idempotente por `eventId` [IDDD cap. 8; Destilado cap. 4]. Con el paquete: id derivado del evento al crear (`ShipmentId.forOrder(order)`), o método de reacción que vuelve sin cambios si ya se aplicó.
* Guardar en orden no garantiza recibir en orden: el consumidor respeta la causalidad con el tipo de evento o metadatos (secuencia, id de causa) y puede ignorar eventos superados [Destilado cap. 6].
* Otros contextos ejecutan comportamiento de su modelo, no copian objetos [IDDD cap. 8]. Si falta un dato, cambia el contrato [IDDD cap. 8].

## Internos y publicados

`[Fuera de los libros como terminología; la idea está en IDDD cap. 13 y cap. 8]` Dentro del sistema el JSON del evento es el contrato entre contextos y nunca cambia de forma incompatible bajo el mismo `eventName`. Fuera del sistema no se publica `{ ...event }`: el adaptador del broker traduce el `SerializedEvent` a un contrato versionado (Published Language) con `messageId` = `eventId` [IDDD cap. 13], sin datos personales innecesarios. El interno cambia con el modelo; el publicado solo con versión nueva y compatibilidad.

## Señales de alarma

* Eventos en presente o `OrderUpdated` con todo el pedido [Destilado cap. 6].
* Publicar dentro del agregado o antes de `save`; una transacción en el caso de uso; `InMemoryEventChannel` como entrega durable.
* Escribir `DomainEvent`, `EventPublisher` o un segundo bus: solo `EventBase` y `EventChannel`.
* Fábrica de `EventRegistry` que no conserva `eventId` y `occurredOn`.
* Eventos con datos personales que el consumidor no necesita.
* Consumidores sin deduplicación; handler que modifica otro agregado en la misma escritura [IDDD cap. 8].
* Importar la clase del evento de otro contexto; un listener que llama a un `UseCase`; una reacción que lanza errores de negocio o `AggregateNotFoundException`.
* Sin sufijo `DomainEvent`, `eventName` con otra forma, interfaces propias o parámetros posicionales.

## Ejemplo y siguientes guías

* Catálogo de la tienda: `ddd-skills/ddd-eventos-dominio/references/ejemplo-ecommerce.md`.
* Event sourcing → `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`; casos de uso → `ddd-skills/ddd-servicios-capa-aplicacion/GUIA.md`.
