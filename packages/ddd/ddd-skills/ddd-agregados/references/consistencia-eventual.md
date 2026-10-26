# Consistencia eventual entre agregados

## Mecanismo básico

Un método de comando del agregado publica (o registra) un evento de dominio. Uno o varios suscriptores asíncronos lo reciben; cada uno carga **otro** agregado y ejecuta su comportamiento en **su propia transacción** [IDDD cap. 10; Destilado cap. 5]. Con el paquete, esa transacción es el `save` atómico del repositorio de ese otro agregado `[Fuera de los libros: convención de @archi-code/ddd]`.

El suscriptor puede estar en el mismo contexto (en el ejemplo del libro, `Sprint` reacciona a `BacklogItemCommitted` creando un `CommittedBacklogItem`) o en otro. Para el mismo contexto no hace falta un middleware de mensajería, aunque es fácil usarlo si ya existe [Destilado cap. 5].

## Fallos y reintentos

* Si el suscriptor falla por concurrencia, no confirma el mensaje; el mecanismo lo reenvía y se reintenta en una nueva transacción (con el paquete, el caso de uso por reacción vuelve a cargar y a guardar en la nueva entrega; no reintenta por su cuenta), hasta lograrlo o hasta un límite de reintentos [IDDD cap. 10].
* Si falla del todo: compensar o, como mínimo, informar del fallo para intervención [IDDD cap. 10]. Con el paquete, los reintentos y el límite son del `EventChannel` que implementes (por ejemplo, una cola con reintentos y una dead-letter donde quedan los mensajes que agotan el límite); `InMemoryEventChannel` no reintenta: el error del caso de uso por reacción llega a quien llamó a `publish` `[Fuera de los libros: convención de @archi-code/ddd]`.
* El suscriptor debe ser idempotente: la mensajería entrega al menos una vez [Destilado cap. 4].

## No crear asociaciones bidireccionales

El evento no está para mantener un puntero inverso sin sentido. En IDDD, `BacklogItem` ya conoce su `SprintId`; el evento sirve para que `Sprint` registre el compromiso con su propio orden, que es un concepto suyo [IDDD cap. 10].

## Políticas: el nombre del lenguaje para "cuando pase X, haz Y"

`[Fuera de los libros como término]`

Con el paquete, la política es un **caso de uso por reacción**: una sola clase `<Acción>On<Evento>` que extiende `EventListener`, se marca con `@ListensTo` y en su `handle` construye los value objects, carga el agregado, llama a su método de reacción, guarda y publica; no hay un `UseCase` detrás `[Fuera de los libros: convención de @archi-code/ddd]` (IDDD pone en la capa de aplicación un suscriptor que delega en un servicio de aplicación [IDDD cap. 8]). Política de Ventas: cuando Almacén reserva stock, se registra en el pedido (`Order`, `OrderId` y `ReservationReference` son los de `references/implementacion-ts.md`).

El hecho de Almacén llega por el canal como JSON. Ventas no importa la clase de Almacén: declara su propia copia del evento junto al caso de uso que lo escucha, con el mismo nombre de clase y `eventName` que el productor y solo los campos que lee, para que `DomainEventBus` lo reconstruya y se lo entregue `[Fuera de los libros: convención de @archi-code/ddd]`. En `application/register-stock-reservation/stock-item-reserved-domain-event.ts`:

```ts
import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class StockItemReservedDomainEvent extends EventBase {
  static readonly eventName = 'stock_item.reserved';

  readonly orderId: string;
  readonly reservationId: string;

  constructor({
    orderId,
    reservationId,
    eventId,
    occurredOn,
    clock,
  }: { orderId: string; reservationId: string } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.orderId = orderId;
    this.reservationId = reservationId;
  }
}
```

El caso de uso por reacción registra el hecho: un agregado, un `save` atómico, y si el pedido no existe (es de otro canal) vuelve sin error. En `application/register-stock-reservation/register-stock-reservation-on-stock-item-reserved.ts`:

```ts
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';
import { StockItemReservedDomainEvent } from './stock-item-reserved-domain-event';

@ListensTo(StockItemReservedDomainEvent, {
  consumer: 'sales.register-stock-reservation-on-stock-item-reserved',
})
export class RegisterStockReservationOnStockItemReserved extends EventListener<StockItemReservedDomainEvent> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus,
    private readonly clock: Clock,
  ) {
    super();
  }

  async handle(event: StockItemReservedDomainEvent): Promise<void> {
    const { orderId, reservation } = ValueObjectBuilder.build({
      orderId: () => new OrderId(event.orderId),
      reservation: () => new ReservationReference(event.reservationId),
    });
    const order = await this.orders.findById(orderId);
    if (order === null) {
      return;
    }
    order.registerStockReservation(reservation, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
```

La raíz de composición del contexto (`composition.ts`) registra el evento con una fábrica que conserva `eventId` y `occurredOn` y suscribe el caso de uso por reacción; en los tests, con los adaptadores en memoria del paquete y el `InMemoryOrderRepository` en memoria del proyecto (`ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`). En `test/contexts/sales/application/register-stock-reservation-on-stock-item-reserved.spec.ts`:

```ts
import {
  DomainEventBus,
  EventRegistry,
  FixedClock,
  InMemoryEventChannel,
} from '@archi-code/ddd/infrastructure';
import { InMemoryOrderRepository } from '../../../../src/contexts/sales/infrastructure/persistence/in-memory-order-repository';

const orders = new InMemoryOrderRepository();
const registry = new EventRegistry().register(
  StockItemReservedDomainEvent,
  (json) =>
    new StockItemReservedDomainEvent({
      orderId: json.orderId as string,
      reservationId: json.reservationId as string,
      eventId: json.eventId,
      occurredOn: json.occurredOn,
    }),
);
const channel = new InMemoryEventChannel();
const bus = new DomainEventBus(channel, registry);
await bus.subscribe(
  new RegisterStockReservationOnStockItemReserved(
    orders,
    bus,
    new FixedClock('2026-03-01T09:30:00Z'),
  ),
);
```

En producción se cambia solo el canal (`InMemoryEventChannel` por el de tu broker o tu outbox); los casos de uso no cambian.

Reglas para políticas:
* Una política, un agregado modificado.
* Nombre con el lenguaje del negocio, no `StockReservedHandler`. Con el paquete, el caso de uso por reacción se llama `<Acción>On<Evento>` (`RegisterStockReservationOnStockItemReserved`, con `<Evento>` el nombre de la clase del evento sin `DomainEvent`) y su `consumer` es `'<contexto>.<fichero sin .ts>'`, estable y único, nunca el nombre de la clase `[Fuera de los libros: convención de @archi-code/ddd]`.
* La regla de negocio está en el agregado; la política solo lo invoca. Nunca comprueba autorización, ni lanza `AggregateNotFoundException` o errores de negocio, ni llama a otro caso de uso.
* El método invocado no lanza errores de negocio (ver "Comandos frente a hechos" en `references/implementacion-ts.md`). Los errores técnicos (base de datos caída, `ConcurrencyException`) sí se propagan para que la mensajería reintente.
* El caso de uso por reacción es idempotente: si el canal entrega dos veces el mismo `eventId`, el segundo no cambia nada (aquí lo garantiza el agregado, que ignora una reserva cuando ya no está pendiente).

## Plazos y lo que ve el usuario

Si el plazo aceptado es "en 30 segundos", el sistema debe comportarse bien durante esos 30 segundos:
* Estados intermedios explícitos en el modelo (`Pending`) [IDDD cap. 3 trata la indisponibilidad como estado válido].
* Mensajes al usuario que reflejen el estado ("Estamos confirmando tu pedido").
* Un temporizador o rastreador de plazo para el caso en que no llegue nunca (ver procesos en `ddd-skills/ddd-context-mapping/GUIA.md`).

## Procesos con varios pasos

Cuando hay varios agregados y plazos, un objeto de proceso con su propio estado (confirmación del pedido: esperando reserva y pago, confirmado, fallido, caducado) coordina los pasos [IDDD cap. 13]. Ese objeto es en sí un agregado pequeño: se modifica solo, en su transacción, al recibir cada evento.
