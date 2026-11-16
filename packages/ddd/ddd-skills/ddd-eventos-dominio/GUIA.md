# Eventos de dominio

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Los ejemplos usan la API de `@archi-code/ddd`; la forma del código la fija `ddd-skills/archi-code-ddd/`, que manda si un ejemplo difiere. El paquete se aparta de los libros donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]`.
>
> **Cuándo consultarla.** Al diseñar un evento, un mensaje entre servicios, un "cuando pase X", una cola o un bus, o cuando se pierden o duplican mensajes.

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

La forma del código (clase del evento, registro, reacciones, bus, canales, outbox en el repositorio) está en `ddd-skills/archi-code-ddd/events-and-errors.md`, `ddd-skills/archi-code-ddd/reactions.md`, `ddd-skills/archi-code-ddd/composition-and-entry-points.md` y `ddd-skills/archi-code-ddd/repositories.md`. Dónde se aparta de los libros:

* Nombre de clase con sufijo `DomainEvent` y `eventName` `'<agregado>.<acción_en_pasado>'`; los libros nombran solo el hecho (`OrderPlaced`) [IDDD cap. 8].
* `occurredOn` no lo pone el evento al crearse: lo pone el bus al enviarlo [IDDD cap. 8 lo fija en el constructor].
* Los eventos internos no llevan versión: un cambio incompatible es otro `eventName` o una fábrica del registro que lee las dos formas; la versión vive solo en el contrato publicado [IDDD cap. 13].
* La reacción es el caso de uso: no hay servicio de aplicación detrás del suscriptor [IDDD cap. 8].
* El repositorio, no el servicio de aplicación, posee la transacción; el outbox es persistencia del repositorio y el caso de uso no cambia [IDDD cap. 8 y cap. 14].
* Cada contexto declara su propia copia del evento de otro (solo los campos que lee), nunca importa la clase del productor.
* Cada tecnología de mensajería implementa solo `EventChannel`; `InMemoryEventChannel` entrega en el acto y no guarda nada: solo tests y aplicaciones en memoria.

## Diseño

Detalle y ejemplos en `ddd-skills/ddd-eventos-dominio/references/diseno-eventos.md`.

* Nombre en pasado con el lenguaje del contexto, derivado del comando [Destilado cap. 6; IDDD cap. 8].
* Datos: identidad del agregado y de los implicados, parámetros del comando y valores útiles del estado resultante [Destilado cap. 6; IDDD cap. 8]. Nunca el estado completo ni `XxxUpdated` [Destilado cap. 6].
* Inmutables, con constructor completo [IDDD cap. 8].
* El paso del tiempo también causa eventos con nombre de negocio [Destilado cap. 6].
* Un comando se puede rechazar; un evento es un hecho [Destilado cap. 6].

## Guardar y publicar

Agregado y evento en la misma transacción; publicar después [Destilado cap. 6]. De las tres opciones de IDDD (almacén compartido, XA, event store propio + reenviador) se recomienda la tercera, hoy llamada outbox transaccional [IDDD cap. 8] `[Fuera de los libros como nombre]`; obliga a construir el reenviador y a deduplicar. Con el paquete "la misma transacción" es la escritura atómica del `save` del repositorio `[Fuera de los libros: convención de @archi-code/ddd]`. Outbox, reenviador, consumidor idempotente, orden y contrato publicado: `ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`.

## Consumir

* Una reacción no modifica otro agregado en la misma transacción: cada reacción, su propia escritura [IDDD cap. 8].
* Entrega al menos una vez → consumidor idempotente por `eventId` [IDDD cap. 8; Destilado cap. 4]. Con el paquete: id derivado del evento al crear, o método de reacción que vuelve sin cambios si ya se aplicó (código en `ddd-skills/archi-code-ddd/reactions.md`).
* Guardar en orden no garantiza recibir en orden: el consumidor respeta la causalidad con el tipo de evento o metadatos (secuencia, id de causa) y puede ignorar eventos superados [Destilado cap. 6].
* Otros contextos ejecutan comportamiento de su modelo, no copian objetos [IDDD cap. 8]. Si falta un dato, cambia el contrato [IDDD cap. 8].

## Internos y publicados

`[Fuera de los libros como terminología; la idea está en IDDD cap. 13 y cap. 8]` Dentro del sistema el JSON del evento es el contrato entre contextos y nunca cambia de forma incompatible bajo el mismo `eventName`. Fuera del sistema no se publica `{ ...event }`: el adaptador del broker traduce el `SerializedEvent` a un contrato versionado (Published Language) con `messageId` = `eventId` [IDDD cap. 13], sin datos personales innecesarios. El interno cambia con el modelo; el publicado solo con versión nueva y compatibilidad.

## Señales de alarma

* Eventos en presente o `OrderUpdated` con todo el pedido [Destilado cap. 6].
* Publicar dentro del agregado o antes de `save`; una transacción en el caso de uso; `InMemoryEventChannel` como entrega durable.
* Eventos con datos personales que el consumidor no necesita.
* Consumidores sin deduplicación; handler que modifica otro agregado en la misma escritura [IDDD cap. 8].
* Importar la clase del evento de otro contexto: el consumidor depende del evento publicado, no de las clases del productor [Destilado cap. 4; IDDD cap. 13].
* Una reacción que rechaza el hecho (lanza un error de negocio): un hecho de otro contexto se registra o se compensa [Destilado cap. 6].
* Errores de forma del código (clase, registro, reacción, bus): el "What not to do" de `ddd-skills/archi-code-ddd/events-and-errors.md`, `ddd-skills/archi-code-ddd/reactions.md` y `ddd-skills/archi-code-ddd/composition-and-entry-points.md`.

## Ejemplo y siguientes guías

* Catálogo de la tienda: `ddd-skills/ddd-eventos-dominio/references/ejemplo-ecommerce.md`.
* Event sourcing → `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`; casos de uso → `ddd-skills/ddd-servicios-capa-aplicacion/GUIA.md`.
