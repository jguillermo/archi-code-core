# Eventos de dominio

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Los ejemplos están escritos con la API de `@archi-code/ddd` (las clases de su `src`) y se copian tal cual. Las guías deciden el diseño; la forma del código (carpetas y nombres, eventos, constructor y `create` del agregado, casos de uso de usuario y por reacción) la fija `ddd-skills/archi-code-ddd/`, que manda si un ejemplo difiere. El paquete se aparta de los libros donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]`; cualquier otra discrepancia sobre una regla de DDD es un defecto del paquete.
>
> **Cuándo consultar esta guía.** Eventos de dominio en DDD con TypeScript. Cubre cómo nombrarlos en pasado con el lenguaje ubicuo, decidir qué datos llevan (ni el objeto entero ni eventos "XxxUpdated"), eventos causados por el paso del tiempo, diferencia entre comando y evento, registrarlos en el agregado, guardarlos en la misma escritura atómica que el agregado (event store u outbox) y publicarlos después, consumidores idempotentes, orden causal, versionado y eventos internos frente a eventos publicados a otros contextos. Consúltala siempre que se diseñe un evento, un mensaje entre servicios, una notificación de "cuando pase X", un webhook propio, una cola o un bus, que se pierdan o dupliquen mensajes, o que un cambio deba disparar acciones en otra parte del sistema, aunque no se diga "domain event".

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* Los eventos se llaman `<Agregado><AcciónEnPasado>DomainEvent` (`OrderCreatedDomainEvent`), extienden `EventBase` y declaran `static readonly eventName = '<agregado>.<acción_en_pasado>'` en snake_case (`'order.line_added'`), único en todo el sistema; los libros nombran el evento solo con el hecho (`OrderPlaced`) [IDDD cap. 8]. El constructor recibe un único objeto tipado en línea como `{ …campos } & EventMetadata`, desestructura `eventId, occurredOn, clock` y llama a `super({ eventId, occurredOn, clock })` (con `clock` dentro del agregado), sin interfaces ni tipos propios en el fichero del evento; la base copia el nombre en el campo `eventName` y pone `eventId` (UUID v4) y `occurredOn` (texto ISO en UTC). Un evento es un objeto de datos primitivos sin métodos: `{ ...event }` y `JSON.stringify(event)` dan `{ eventName, eventId, occurredOn, ...campos }`. La identidad del agregado es un campo más que declara cada evento (`readonly orderId: string`). Regla, no comprobada en ejecución: cada evento declara como campos `readonly` solo los datos primitivos que necesita (texto, números finitos, booleanos, `null`, listas y objetos planos de ellos), sacados de los value objects (`.value`, el dinero como `{ amount, currency }`, las fechas en ISO), nunca value objects, `Date` ni `toPrimitives()` del agregado. Los eventos no llevan número de versión: un cambio incompatible de sus datos es un evento nuevo con otro `eventName`, o una fábrica del `EventRegistry` que lee las dos formas `[Fuera de los libros: convención de @archi-code/ddd]`.
* No hay unión de los eventos de un agregado: `AggregateRoot<Id>`, `EventBus`, `DomainEventBus` y `EventRegistry` trabajan con `EventBase`, la clase de la que heredan todos. El agregado registra con `record()` (que guarda el evento tal cual: sus campos son `readonly`) y el caso de uso publica con `await this.events.publish(order.pullDomainEvents())` justo después de `await this.orders.save(order)`. La aplicación nunca abre, une ni cierra transacciones y no hay puerto para ello: cada `save` es una escritura atómica que garantiza el repositorio. Si `publish` falla después de `save`, el evento se puede perder; cuando un evento no puede perderse, el adaptador del repositorio escribe el agregado y sus eventos pendientes en la misma escritura atómica (un outbox en el mismo documento o en la misma transacción de base de datos de `save`) y un reenviador los entrega después por un `EventChannel`. Es persistencia, así que va en el repositorio, y el caso de uso no cambia. Fuera de ese caso, el repositorio no toca los eventos.
* La aplicación solo tiene el contrato de eventos, en `@archi-code/ddd/application`: para publicar, el puerto `EventBus` (lo único que ve el caso de uso); para escuchar, `EventListener` + `@ListensTo` (`ListensTo.subscriptionOf(listener)` da `{ eventName, consumer }`). Lo que mueve los eventos es infraestructura y lo usa solo el composition root, desde `@archi-code/ddd/infrastructure`: `DomainEventBus(channel, registry)` implementa `EventBus` sobre un `EventChannel` (con `ChannelHandler` y `ChannelSubscription`), que es lo único que implementa cada tecnología (`InMemoryEventChannel` en el paquete; un outbox o un broker en tu infraestructura). Los casos de uso por reacción reciben siempre el evento reconstruido desde su JSON por `EventRegistry`, cuya fábrica copia cada campo y pasa `eventId: json.eventId` y `occurredOn: json.occurredOn` para conservarlos.
* La reacción a un evento es un **caso de uso por reacción**: una sola clase `<Acción>On<Evento>` que extiende `EventListener<Event>`, escucha un único evento con `@ListensTo(EventClass, { consumer: '<contexto>.<acción>-on-<evento>' })` (estable y explícito, su identidad en el canal), construye los value objects con `ValueObjectBuilder.build`, carga o crea el agregado, llama a su método de reacción, guarda y publica. No hay un `UseCase` detrás; nunca lanza errores de negocio ni `AggregateNotFoundException` (vuelve sin hacer nada).
* Un contexto no importa la clase del evento de otro: declara su propia copia junto al caso de uso por reacción (`application/<acción>/<evento>-domain-event.ts`), con el mismo nombre de clase y `eventName` y solo los campos que lee.
* El paquete no trae outbox, canal de broker, deduplicación ni traducción al lenguaje publicado: se escriben en el proyecto sobre el puerto `EventChannel` y los puertos propios, como en `ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`.
* `InMemoryEventChannel` entrega en cuanto se llama a `publish`, antes de que termine el `execute` del caso de uso que publica: sirve para tests (`channel.sent` lista lo publicado; `{ delivery: 'parallel' }` ejecuta juntas las reacciones a un evento), nunca como entrega durable en producción.

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

Con el paquete, la reacción es un caso de uso por reacción que carga y guarda su propio agregado con su repositorio, en su propia escritura atómica. Con `InMemoryEventChannel` corre antes de que termine el `execute` del caso de uso que publicó, lo que solo vale en tests o en una aplicación en memoria; en producción un canal durable lo entrega después de que la escritura del primero se haya confirmado, y cada reacción hace su propia escritura [IDDD cap. 8] `[Fuera de los libros: convención de @archi-code/ddd]`. Es idempotente: si crea, el id derivado del evento (`ShipmentId.forOrder(order)`) le dice si ya lo hizo; si cambia, el método de reacción del agregado vuelve sin cambios cuando el hecho ya está aplicado (ver "Consumidor idempotente" en `ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`):

```ts
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';
import { OrderConfirmedDomainEvent } from './order-confirmed-domain-event';

@ListensTo(OrderConfirmedDomainEvent, { consumer: 'shipping.prepare-shipment-on-order-confirmed' })
export class PrepareShipmentOnOrderConfirmed extends EventListener<OrderConfirmedDomainEvent> {
  constructor(
    private readonly shipments: ShipmentRepository,
    private readonly events: EventBus,
    private readonly clock: Clock,
  ) {
    super();
  }

  async handle(event: OrderConfirmedDomainEvent): Promise<void> {
    const { orderReference } = ValueObjectBuilder.build({
      orderReference: () => new OrderReference(event.orderId),
    });
    const shipmentId = ShipmentId.forOrder(orderReference);
    if ((await this.shipments.findById(shipmentId)) !== null) {
      return;
    }
    const shipment = Shipment.create(shipmentId, orderReference, this.clock);
    await this.shipments.save(shipment);
    await this.events.publish(shipment.pullDomainEvents());
  }
}
```

## Eventos internos y eventos publicados

`[Fuera de los libros como terminología; la idea está en IDDD cap. 13 (Published Language) y cap. 8]`

| | Evento de dominio interno | Evento publicado (integración) |
|---|---|---|
| Consumidores | El propio contexto y los demás contextos del sistema por el canal compartido | Sistemas fuera del sistema (otros equipos, un broker compartido) |
| Forma | Clase `EventBase` del dominio (`'order.created'`); cada contexto del sistema que lo escucha declara su copia | Esquema JSON versionado (Published Language), `sales.order.OrderPlaced` |
| Puede cambiar | Con el modelo | Solo con versión nueva y compatibilidad |
| Contenido | Lo que el modelo necesita | Lo que el contrato promete; sin datos personales innecesarios |

Dentro del sistema, el JSON del evento es el contrato entre contextos: cada consumidor declara su copia y nunca se cambian sus datos de forma incompatible bajo el mismo `eventName` `[Fuera de los libros: convención de @archi-code/ddd]`. No publiques los eventos de dominio tal cual (`{ ...event }`) fuera del sistema. Traduce el evento serializado (`SerializedEvent`) al contrato publicado en el adaptador que habla con el broker, con `messageId` = `eventId` [IDDD cap. 13]; el paquete no trae esa traducción (ver "Lenguaje publicado en el adaptador del broker" en `ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`).

## Señales de alarma

* Eventos en presente o imperativo (`CreateOrder`, `OrderUpdate`).
* `OrderUpdated` con el pedido entero [Destilado cap. 6].
* Publicar al bus dentro del método del agregado o antes de `save`; abrir o recibir una transacción en el caso de uso para "publicar dentro"; o confiar en que `InMemoryEventChannel` es una entrega durable. Un evento que no puede perderse va al outbox en la misma escritura atómica del repositorio.
* Escribir en el proyecto `DomainEvent`, `EventPublisher` o un segundo bus (`RabbitMqEventBus`): los eventos extienden `EventBase` y cada tecnología implementa solo `EventChannel`.
* Una fábrica de `EventRegistry` que no pasa `eventId: json.eventId` y `occurredOn: json.occurredOn`: el evento reconstruido tendría otro `eventId` y no se podría deduplicar (`fromJSON` lo rechaza).
* Un handler síncrono que modifica otro agregado en la misma transacción o escritura [IDDD cap. 8].
* Consumidores sin deduplicación.
* Eventos con datos personales que el consumidor no necesita.
* Otros contextos que importan la clase del evento del productor en vez de declarar su copia.
* Un listener que llama a un `UseCase`, o un caso de uso por reacción que lanza errores de negocio o `AggregateNotFoundException`.
* Eventos sin el sufijo `DomainEvent`, con un `eventName` que no es `'<agregado>.<acción_en_pasado>'`, con interfaces propias o con parámetros posicionales en el constructor.

## Ejemplo

`ddd-skills/ddd-eventos-dominio/references/ejemplo-ecommerce.md` contiene el catálogo de eventos de la tienda online con sus decisiones.

## Siguiente guía

* Persistir el agregado como secuencia de eventos → `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`.
* Cómo encaja la publicación en el caso de uso → `ddd-skills/ddd-servicios-capa-aplicacion/GUIA.md`.
