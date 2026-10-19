# Eventos de dominio

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Para escribir el código, traduce los ejemplos con `ddd-skills/archi-code-ddd/suite-to-package.md`; si esta guía y las reglas del paquete discrepan, ganan las del paquete.
>
> **Cuándo consultar esta guía.** Eventos de dominio en DDD con TypeScript. Cubre cómo descubrirlos en la conversación con expertos, nombrarlos en pasado con el lenguaje ubicuo, decidir qué datos llevan (ni el objeto entero ni eventos "XxxUpdated"), eventos causados por el paso del tiempo, diferencia entre comando y evento, registrarlos en el agregado, guardarlos en la misma transacción (event store u outbox) y publicarlos después, consumidores idempotentes, orden causal, versionado, eventos internos frente a eventos publicados a otros contextos y tolerancia a la latencia. Consúltala siempre que se diseñe un evento, un mensaje entre servicios, una notificación de "cuando pase X", un webhook propio, una cola o un bus, que se pierdan o dupliquen mensajes, o que un cambio deba disparar acciones en otra parte del sistema, aunque no se diga "domain event".

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* Los eventos extienden `EventBase`, declaran `static readonly eventName = '<agregado>.<hecho_en_pasado>'` y `eventVersion` si cambian de forma incompatible; `eventId` y `occurredOn` los pone la base. El payload son primitivos, nunca value objects.
* El outbox es el puerto `EventBus`, publicado dentro de `transactions.run` en el caso de uso; lo entrega `OutboxRelay` tras el commit. La idempotencia se consigue con `EventDispatcher(listeners, { inbox, transactions })`.
* Los consumidores reconstruyen eventos con `DomainEventRegistry` pasando el JSON como metadatos; el relay usa `dispatchSerialized(json, registry)`.

Un evento de dominio es el registro de algo que ha ocurrido y que importa al negocio en un Bounded Context [Destilado cap. 6]. Es parte de pleno derecho del modelo [IDDD cap. 8, citando a Evans] y la pieza que hace posible la consistencia eventual entre agregados y la integración entre contextos.


## Paso 1. Descubrirlos

* En Event Storming son las notas naranjas (`ddd-skills/ddd-descubrimiento-dominio/GUIA.md`).
* En conversación, escucha expresiones como "cuando...", "si eso pasa...", "avísame si...", "cada vez que ocurre...". En "avísame si" el evento no es el aviso, sino lo que ocurre y alguien quiere saber [IDDD cap. 8].
* Algunos eventos no salen de los expertos sino de necesidades de integración entre equipos; deben acabar entendiéndolos igualmente [IDDD cap. 8].

## Paso 2. Diseñarlos

Guía completa y ejemplos en `ddd-skills/ddd-eventos-dominio/references/diseno-eventos.md`. Lo esencial:

* **Nombre:** verbo en pasado, con el lenguaje del contexto que lo origina, normalmente derivado del comando (`commitTo` → `BacklogItemCommitted`) [Destilado cap. 6; IDDD cap. 8].
* **Datos:** cuándo ocurrió, la identidad del agregado afectado y de los implicados, y lo necesario para entender qué pasó: a menudo los parámetros del comando y algún valor del estado resultante [Destilado cap. 6; IDDD cap. 8].
* **Sin el estado completo:** un evento lleno de datos pierde su significado, y un `XxxUpdated` con todo el estado obliga al consumidor a comparar versiones para adivinar qué cambió [Destilado cap. 6].
* **Inmutables**, con constructor completo y solo lectura [IDDD cap. 8].
* **El tiempo también causa eventos:** el fin de un periodo es un hecho, no un comando, y suele tener nombre en el lenguaje ("cierre de mercado", "fin de ejercicio fiscal") [Destilado cap. 6].
* **Comando ≠ evento:** un comando se puede rechazar; un evento es un hecho y no se puede negar [Destilado cap. 6].

## Paso 3. Guardar y publicar sin perder ni inventar

Regla de oro: el agregado modificado y su evento se guardan **en la misma transacción**; después se publica [Destilado cap. 6]. IDDD da tres formas de mantener modelo y mensajería consistentes [IDDD cap. 8]:

| Opción | Ventaja | Inconveniente |
|---|---|---|
| Modelo y mensajería comparten almacén | Una transacción local | Tablas del bus en tu base; no siempre posible |
| Transacción global (XA, dos fases) | Almacenes separados | Cara, lenta, no siempre soportada |
| **Event store propio en la base del modelo + reenviador** | Consistencia garantizada en una transacción local; permite feeds REST | Hay que construir el reenviador y los consumidores deben deduplicar |

Recomendación de estas fuentes: la tercera, conocida hoy como **outbox transaccional** `[Fuera de los libros como nombre]`. Implementación en `ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`.

## Paso 4. Consumirlos bien

* El suscriptor que reacciona dentro de la misma transacción **no debe modificar otro agregado**; eso rompe la regla de un agregado por transacción. Las reacciones que modifican agregados van fuera de banda, cada una en su transacción [IDDD cap. 8].
* Entrega al menos una vez → consumidor idempotente. Identidad única del mensaje o del evento para deduplicar [IDDD cap. 8; Destilado cap. 4].
* Guardar en orden causal no garantiza recibir en ese orden en otros nodos. El consumidor es responsable de respetar la causalidad, usando el tipo de evento o metadatos (secuencia, identificador de causa); a veces puede ignorar eventos ya superados por otros posteriores [Destilado cap. 6].
* Los consumidores de otros contextos no copian objetos: ejecutan comportamiento de **su** modelo según el significado del evento en su contexto [IDDD cap. 8].
* Si un evento no lleva lo que un suscriptor necesita, el contrato debe cambiar, probablemente con una nueva versión o un evento distinto [IDDD cap. 8].

## Paso 5. Acordar la latencia

¿Cuánto retraso es aceptable? Lo saben los expertos, y a menudo segundos, minutos u horas son tolerables. Pregunta cómo funcionaba el negocio sin ordenadores [IDDD cap. 8]. Lo que no sea tolerable hay que diseñarlo con disponibilidad y escalabilidad suficientes [IDDD cap. 8].

## Eventos internos y eventos publicados

`[Fuera de los libros como terminología; la idea está en IDDD cap. 13 (Published Language) y cap. 8]`

| | Evento de dominio interno | Evento publicado (integración) |
|---|---|---|
| Consumidores | El propio contexto | Otros contextos |
| Forma | Clase TypeScript del dominio | Esquema JSON versionado (Published Language) |
| Puede cambiar | Con el modelo | Solo con versión nueva y compatibilidad |
| Contenido | Lo que el modelo necesita | Lo que el contrato promete; sin datos personales innecesarios |

No publiques las clases de dominio tal cual hacia fuera. Traduce en el reenviador o en un mapeador de publicación.

## Entregable: catálogo de eventos

Usa `ddd-skills/ddd-eventos-dominio/assets/plantilla-catalogo-eventos.md`: nombre, contexto origen, causa (comando o tiempo), datos, consumidores, versión, interno o publicado, plazo aceptable.

## Señales de alarma

* Eventos en presente o imperativo (`CreateOrder`, `OrderUpdate`).
* `OrderUpdated` con el pedido entero [Destilado cap. 6].
* Publicar al bus dentro del método del agregado o antes de confirmar la transacción.
* Un handler síncrono que modifica otro agregado en la misma transacción [IDDD cap. 8].
* Consumidores sin deduplicación.
* Eventos con datos personales que el consumidor no necesita.
* Otros contextos que importan la clase del evento del productor.

## Ejemplo

`ddd-skills/ddd-eventos-dominio/references/ejemplo-ecommerce.md` contiene el catálogo de eventos de la tienda online con sus decisiones.

## Siguiente guía

* Persistir el agregado como secuencia de eventos → `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`.
* Cómo encaja la publicación en el caso de uso → `ddd-skills/ddd-servicios-capa-aplicacion/GUIA.md`.
