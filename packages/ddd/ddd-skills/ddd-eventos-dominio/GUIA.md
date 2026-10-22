# Eventos de dominio

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Los ejemplos están escritos con la API de `@archi-code/ddd` (las clases de su `src`) y se copian tal cual; las guías son la fuente de verdad: el paquete solo se aparta de ellas donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]`, y cualquier otra discrepancia es un defecto del paquete.
>
> **Cuándo consultar esta guía.** Eventos de dominio en DDD con TypeScript. Cubre cómo nombrarlos en pasado con el lenguaje ubicuo, decidir qué datos llevan (ni el objeto entero ni eventos "XxxUpdated"), eventos causados por el paso del tiempo, diferencia entre comando y evento, registrarlos en el agregado, guardarlos en la misma escritura atómica que el agregado (event store u outbox) y publicarlos después, consumidores idempotentes, orden causal, versionado y eventos internos frente a eventos publicados a otros contextos. Consúltala siempre que se diseñe un evento, un mensaje entre servicios, una notificación de "cuando pase X", un webhook propio, una cola o un bus, que se pierdan o dupliquen mensajes, o que un cambio deba disparar acciones en otra parte del sistema, aunque no se diga "domain event".

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* Los eventos extienden `EventBase`, declaran `static readonly eventName` con el nombre de su clase en pasado (`'OrderPlaced'`); llaman a `super(metadata)` (con `{ clock }` dentro del agregado) y la base copia el nombre en el campo `eventName` y pone `eventId` (UUID v4) y `occurredOn` (texto ISO en UTC). Un evento es un objeto de datos primitivos sin métodos: `{ ...event }` y `JSON.stringify(event)` dan `{ eventName, eventId, occurredOn, ...campos }`. La identidad del agregado es un campo más que declara cada evento (`readonly orderId: string`). Regla, no comprobada en ejecución: cada evento declara como campos `readonly` del constructor solo los datos primitivos que necesita (texto, números finitos, booleanos, `null`, listas y objetos planos de ellos), sacados de los value objects (`.value`, el dinero como `{ amount, currency }`, las fechas en ISO), nunca value objects, `Date` ni `toPrimitives()` del agregado. Los eventos no llevan número de versión: un cambio incompatible de sus datos es un evento nuevo con otro `eventName`, o una fábrica del `EventRegistry` que lee las dos formas `[Fuera de los libros: convención de @archi-code/ddd]`.
* El agregado registra con `record()` (que congela el evento) y el caso de uso publica con `await this.events.publish(order.pullDomainEvents())` justo después de `await this.orders.save(order)`. La aplicación nunca abre, une ni cierra transacciones y no hay puerto para ello: cada `save` es una escritura atómica que garantiza el repositorio. Si `publish` falla después de `save`, el evento se puede perder; cuando un evento no puede perderse, el adaptador del repositorio escribe el agregado y sus eventos pendientes en la misma escritura atómica (un outbox en el mismo documento o en la misma transacción de base de datos de `save`) y un reenviador los entrega después por un `EventChannel`. Es persistencia, así que va en el repositorio, y el caso de uso no cambia. Fuera de ese caso, el repositorio no toca los eventos.
* La aplicación solo tiene el contrato de eventos, en `@archi-code/ddd/application`: para publicar, el puerto `EventBus` (lo único que ve el caso de uso); para escuchar, `EventListener` + `@ListensTo` (`ListensTo.subscriptionOf(listener)` da `{ eventName, consumer }`). Lo que mueve los eventos es infraestructura y lo usa solo el composition root, desde `@archi-code/ddd/infrastructure`: `DomainEventBus(channel, registry)` implementa `EventBus` sobre un `EventChannel` (con `ChannelHandler` y `ChannelSubscription`), que es lo único que implementa cada tecnología (`InMemoryEventChannel` en el paquete; un outbox o un broker en tu infraestructura). Los listeners reciben siempre el evento reconstruido desde su JSON por `EventRegistry`, cuya fábrica pasa el JSON como metadatos para conservar `eventId` y `occurredOn`.
* Un listener extiende `EventListener<Event>`, escucha un único evento con `@ListensTo(EventClass, { consumer })` (un nombre de consumidor estable y explícito, su identidad en el canal), se llama `<Acción>On<Evento>` y solo traduce el evento a la entrada de un caso de uso.
* El paquete no trae outbox, canal de broker, deduplicación ni traducción al lenguaje publicado: se escriben en el proyecto sobre el puerto `EventChannel` y los puertos propios, como en `ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`.
* `InMemoryEventChannel` entrega en cuanto se llama a `publish`, antes de que termine el `execute` del caso de uso que publica: sirve para tests (`channel.sent` lista lo publicado; `{ delivery: 'parallel' }` ejecuta juntos los listeners de un evento), nunca como entrega durable en producción.

Un evento de dominio es el registro de algo que ha ocurrido y que importa al negocio en un Bounded Context [Destilado cap. 6]. Es parte de pleno derecho del modelo [IDDD cap. 8, citando a Evans] y la pieza que hace posible la consistencia eventual entre agregados y la integración entre contextos.


## Paso 1. Diseñarlos

Guía completa y ejemplos en `ddd-skills/ddd-eventos-dominio/references/diseno-eventos.md`. Lo esencial:

* **Nombre:** verbo en pasado, con el lenguaje del contexto que lo origina, normalmente derivado del comando (`commitTo` → `BacklogItemCommitted`) [Destilado cap. 6; IDDD cap. 8].
* **Datos:** cuándo ocurrió, la identidad del agregado afectado y de los implicados, y lo necesario para entender qué pasó: a menudo los parámetros del comando y algún valor del estado resultante [Destilado cap. 6; IDDD cap. 8].
* **Sin el estado completo:** un evento lleno de datos pierde su significado, y un `XxxUpdated` con todo el estado obliga al consumidor a comparar versiones para adivinar qué cambió [Destilado cap. 6].
* **Inmutables**, con constructor completo y solo lectura [IDDD cap. 8].
* **El tiempo también causa eventos:** el fin de un periodo es un hecho, no un comando, y suele tener nombre en el lenguaje ("cierre de mercado", "fin de ejercicio fiscal") [Destilado cap. 6].
* **Comando ≠ evento:** un comando se puede rechazar; un evento es un hecho y no se puede negar [Destilado cap. 6].

## Paso 2. Guardar y publicar sin perder ni inventar

Regla de oro: el agregado modificado y su evento se guardan **en la misma transacción**; después se publica [Destilado cap. 6]. IDDD da tres formas de mantener modelo y mensajería consistentes [IDDD cap. 8]:

| Opción | Ventaja | Inconveniente |
|---|---|---|
| Modelo y mensajería comparten almacén | Una transacción local | Tablas del bus en tu base; no siempre posible |
| Transacción global (XA, dos fases) | Almacenes separados | Cara, lenta, no siempre soportada |
| **Event store propio en la base del modelo + reenviador** | Consistencia garantizada en una transacción local; permite feeds REST | Hay que construir el reenviador y los consumidores deben deduplicar |

Recomendación de estas fuentes: la tercera, conocida hoy como **outbox transaccional** `[Fuera de los libros como nombre]`. `[Fuera de los libros: convención de @archi-code/ddd]` Con el paquete, "la misma transacción" es la escritura atómica del repositorio: el adaptador guarda el agregado y sus eventos pendientes juntos dentro de su `save`, y la aplicación no ve ninguna transacción. Implementación en `ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`.

## Paso 3. Consumirlos bien

* El suscriptor que reacciona dentro de la misma transacción **no debe modificar otro agregado**; eso rompe la regla de un agregado por transacción. Las reacciones que modifican agregados van fuera de banda, cada una en su transacción [IDDD cap. 8].
* Entrega al menos una vez → consumidor idempotente. Identidad única del mensaje o del evento para deduplicar [IDDD cap. 8; Destilado cap. 4].
* Guardar en orden causal no garantiza recibir en ese orden en otros nodos. El consumidor es responsable de respetar la causalidad, usando el tipo de evento o metadatos (secuencia, identificador de causa); a veces puede ignorar eventos ya superados por otros posteriores [Destilado cap. 6].
* Los consumidores de otros contextos no copian objetos: ejecutan comportamiento de **su** modelo según el significado del evento en su contexto [IDDD cap. 8].
* Si un evento no lleva lo que un suscriptor necesita, el contrato debe cambiar, probablemente con una nueva versión o un evento distinto [IDDD cap. 8].

Con el paquete, la reacción es un listener que lanza un caso de uso, y ese caso de uso carga y guarda su propio agregado con su repositorio, en su propia escritura atómica. Con `InMemoryEventChannel` el listener corre antes de que termine el `execute` del caso de uso que publicó, lo que solo vale en tests; en producción un canal durable lo entrega después de que la escritura del primero se haya confirmado, y cada reacción hace su propia escritura [IDDD cap. 8] `[Fuera de los libros: convención de @archi-code/ddd]`. El listener le pasa el `eventId` para que el caso de uso pueda saltarse una entrega repetida (ver "Consumidor idempotente" en `ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`):

```ts
import { EventListener, ListensTo } from '@archi-code/ddd/application';

@ListensTo(OrderLineAdded, { consumer: 'prepare-shipment-on-order-line-added' })
export class PrepareShipmentOnOrderLineAdded extends EventListener<OrderLineAdded> {
  constructor(private readonly prepareShipment: PrepareShipment) {
    super();
  }

  async handle(event: OrderLineAdded): Promise<void> {
    await this.prepareShipment.execute({
      eventId: event.eventId,
      orderId: event.orderId,
      sku: event.sku,
      quantity: event.quantity,
    });
  }
}
```

## Eventos internos y eventos publicados

`[Fuera de los libros como terminología; la idea está en IDDD cap. 13 (Published Language) y cap. 8]`

| | Evento de dominio interno | Evento publicado (integración) |
|---|---|---|
| Consumidores | El propio contexto | Otros contextos |
| Forma | Clase `EventBase` del dominio | Esquema JSON versionado (Published Language), `sales.order.OrderPlaced` |
| Puede cambiar | Con el modelo | Solo con versión nueva y compatibilidad |
| Contenido | Lo que el modelo necesita | Lo que el contrato promete; sin datos personales innecesarios |

No publiques los eventos de dominio tal cual (`{ ...event }`) hacia fuera. Traduce el evento serializado (`SerializedEvent`) al contrato publicado en el adaptador que habla con el broker, con `messageId` = `eventId` [IDDD cap. 13]; el paquete no trae esa traducción (ver "Lenguaje publicado en el adaptador del broker" en `ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`).

## Señales de alarma

* Eventos en presente o imperativo (`CreateOrder`, `OrderUpdate`).
* `OrderUpdated` con el pedido entero [Destilado cap. 6].
* Publicar al bus dentro del método del agregado o antes de `save`; abrir o recibir una transacción en el caso de uso para "publicar dentro"; o confiar en que `InMemoryEventChannel` es una entrega durable. Un evento que no puede perderse va al outbox en la misma escritura atómica del repositorio.
* Escribir en el proyecto `DomainEvent`, `EventPublisher` o un segundo bus (`RabbitMqEventBus`): los eventos extienden `EventBase` y cada tecnología implementa solo `EventChannel`.
* Una fábrica de `EventRegistry` que no pasa el JSON como metadatos: el evento reconstruido tendría otro `eventId` y no se podría deduplicar (`fromJSON` lo rechaza).
* Un handler síncrono que modifica otro agregado en la misma transacción o escritura [IDDD cap. 8].
* Consumidores sin deduplicación.
* Eventos con datos personales que el consumidor no necesita.
* Otros contextos que importan la clase del evento del productor.

## Ejemplo

`ddd-skills/ddd-eventos-dominio/references/ejemplo-ecommerce.md` contiene el catálogo de eventos de la tienda online con sus decisiones.

## Siguiente guía

* Persistir el agregado como secuencia de eventos → `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`.
* Cómo encaja la publicación en el caso de uso → `ddd-skills/ddd-servicios-capa-aplicacion/GUIA.md`.
