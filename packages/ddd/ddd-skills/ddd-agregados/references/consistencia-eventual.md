# Consistencia eventual entre agregados

## Mecanismo básico

Un método de comando del agregado publica (o registra) un evento de dominio. Uno o varios suscriptores asíncronos lo reciben; cada uno carga **otro** agregado y ejecuta su comportamiento en **su propia transacción** [IDDD cap. 10; Destilado cap. 5]. Con el paquete, esa transacción es el `save` atómico del repositorio de ese otro agregado `[Fuera de los libros: convención de @archi-code/ddd]`.

El suscriptor puede estar en el mismo contexto (en el ejemplo del libro, `Sprint` reacciona a `BacklogItemCommitted` creando un `CommittedBacklogItem`) o en otro. Para el mismo contexto no hace falta un middleware de mensajería, aunque es fácil usarlo si ya existe [Destilado cap. 5].

## Fallos y reintentos

* Si el suscriptor falla por concurrencia, no confirma el mensaje; el mecanismo lo reenvía y se reintenta en una nueva transacción (con el paquete, el caso de uso vuelve a cargar y a guardar en la nueva entrega; no reintenta por su cuenta), hasta lograrlo o hasta un límite de reintentos [IDDD cap. 10].
* Si falla del todo: compensar o, como mínimo, informar del fallo para intervención [IDDD cap. 10]. Con el paquete, los reintentos y el límite son del `EventChannel` que implementes (por ejemplo, una cola con reintentos y una dead-letter donde quedan los mensajes que agotan el límite); `InMemoryEventChannel` no reintenta: el error del listener llega a quien llamó a `publish` `[Fuera de los libros: convención de @archi-code/ddd]`.
* El suscriptor debe ser idempotente: la mensajería entrega al menos una vez [Destilado cap. 4].

## No crear asociaciones bidireccionales

El evento no está para mantener un puntero inverso sin sentido. En IDDD, `BacklogItem` ya conoce su `SprintId`; el evento sirve para que `Sprint` registre el compromiso con su propio orden, que es un concepto suyo [IDDD cap. 10].

## Políticas: el nombre del lenguaje para "cuando pase X, haz Y"

`[Fuera de los libros como término]`

Con el paquete, la política se parte en un listener `<Acción>On<Evento>` (con `@ListensTo`) que solo traduce el evento a la entrada de un caso de uso, y ese caso de uso carga, invoca y guarda `[Fuera de los libros: convención de @archi-code/ddd]`. Política de Ventas: cuando Almacén reserva stock, se registra en el pedido (`Order`, `OrderId`, `ReservationId` y `OrderEvent` son los de `references/implementacion-ts.md`).

El hecho de Almacén llega por el canal con su contrato publicado; Ventas declara una clase `EventBase` con ese contrato para que `DomainEventBus` lo reconstruya y se lo entregue al listener `[Fuera de los libros: convención de @archi-code/ddd]`:

```ts
import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class StockReserved extends EventBase {
  static readonly eventName = 'warehouse.stock.StockReserved';

  constructor(
    stockItemId: string,
    readonly orderId: string,
    readonly reservationId: string,
    metadata?: EventMetadata,
  ) {
    super(stockItemId, metadata);
  }
}
```

El caso de uso registra el hecho: un agregado, un `save` atómico, y si el pedido no existe (es de otro canal) vuelve sin error:

```ts
import { ValueObjects } from '@archi-code/ddd/domain';
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import { UseCase } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';

interface StockReservationInput {
  orderId: string;
  reservationId: string;
}

interface StockReservationCommand {
  orderId: OrderId;
  reservationId: ReservationId;
}

export class RegisterStockReservation extends UseCase<
  StockReservationInput,
  StockReservationCommand,
  void
> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: StockReservationInput): StockReservationCommand {
    return ValueObjects.build({
      orderId: () => new OrderId(input.orderId),
      reservationId: () => new ReservationId(input.reservationId),
    });
  }

  protected async handle(command: StockReservationCommand): Promise<void> {
    const order = await this.orders.findById(command.orderId);
    if (order === null) {
      return;
    }
    order.registerStockReservation(command.reservationId, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
```

El listener solo traduce el evento a la entrada del caso de uso:

```ts
import { EventListener, ListensTo } from '@archi-code/ddd/application';

@ListensTo(StockReserved, { consumer: 'register-stock-reservation-on-stock-reserved' })
export class RegisterStockReservationOnStockReserved extends EventListener<StockReserved> {
  constructor(private readonly registerStockReservation: RegisterStockReservation) {
    super();
  }

  async handle(event: StockReserved): Promise<void> {
    await this.registerStockReservation.execute({
      orderId: event.orderId,
      reservationId: event.reservationId,
    });
  }
}
```

La raíz de composición registra el evento y suscribe el listener; en los tests, con los adaptadores en memoria del paquete:

```ts
import {
  AggregateMapper,
  DomainEventBus,
  EventRegistry,
  FixedClock,
  InMemoryEventChannel,
  InMemoryRepository,
} from '@archi-code/ddd/infrastructure';

const orders = new InMemoryRepository(AggregateMapper.of(Order));
const registry = new EventRegistry<OrderEvent | StockReserved>().register(
  StockReserved,
  (json) =>
    new StockReserved(json.aggregateId, json.orderId as string, json.reservationId as string, json),
);
const channel = new InMemoryEventChannel();
const bus = new DomainEventBus<OrderEvent | StockReserved>(channel, registry);
await bus.subscribe(
  new RegisterStockReservationOnStockReserved(
    new RegisterStockReservation(orders, bus, new FixedClock('2026-03-01T09:30:00Z')),
  ),
);
```

En producción se cambia solo el canal (`InMemoryEventChannel` por el de tu broker o tu outbox); los casos de uso y los listeners no cambian.

Reglas para políticas:
* Una política, un agregado modificado.
* Nombre con el lenguaje del negocio, no `StockReservedHandler`. Con el paquete, el listener se llama `<Acción>On<Evento>`, donde `<Acción>` es el caso de uso que ejecuta (`RegisterStockReservationOnStockReserved`), y su `consumer` es un nombre estable y único, nunca el de la clase.
* La regla de negocio está en el agregado; la política solo lo invoca.
* El método invocado no lanza errores de negocio (ver "Comandos frente a hechos" en `references/implementacion-ts.md`). Los errores técnicos (base de datos caída, `ConcurrencyException`) sí se propagan para que la mensajería reintente.
* El listener es idempotente: si el canal entrega dos veces el mismo `eventId`, el segundo no cambia nada (aquí lo garantiza el agregado, que ignora una reserva cuando ya no está pendiente).

## Plazos y lo que ve el usuario

Si el plazo aceptado es "en 30 segundos", el sistema debe comportarse bien durante esos 30 segundos:
* Estados intermedios explícitos en el modelo (`Pending`) [IDDD cap. 3 trata la indisponibilidad como estado válido].
* Mensajes al usuario que reflejen el estado ("Estamos confirmando tu pedido").
* Un temporizador o rastreador de plazo para el caso en que no llegue nunca (ver procesos en `ddd-skills/ddd-context-mapping/GUIA.md`).

## Procesos con varios pasos

Cuando hay varios agregados y plazos, un objeto de proceso con su propio estado (confirmación del pedido: esperando reserva y pago, confirmado, fallido, caducado) coordina los pasos [IDDD cap. 13]. Ese objeto es en sí un agregado pequeño: se modifica solo, en su transacción, al recibir cada evento.
