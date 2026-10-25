# Capa de aplicación en TypeScript

Con el paquete hay dos clases de caso de uso; solo cambia de dónde llega la entrada `[Fuera de los libros: convención de @archi-code/ddd]`:

| Clase | Entrada | Clase base | Fichero | Lo ejecuta |
|---|---|---|---|---|
| Caso de uso de usuario | datos de una petición | `<Acción> extends UseCase<<Acción>Input, <Acción>Command, Output>` | `application/<acción>/<acción>.ts` | un punto de entrada (`execute(input)`) |
| Caso de uso por reacción | un evento | `<Acción>On<Evento> extends EventListener<<Evento>DomainEvent>` + `@ListensTo` | `application/<acción>/<acción>-on-<evento>.ts` | el bus de eventos (`handle(event)`) |

## Plantilla de caso de uso de usuario

Un caso de uso de usuario extiende `UseCase<Input, Command, Output>` de `@archi-code/ddd/application`. `execute(input)` llama a `toCommand(input)` y después a `handle(command)`; no hay que escribir `execute`. El mismo fichero exporta el `Input` y el `Command`.

```ts
// src/contexts/sales/application/cancel-order/cancel-order.ts
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import { AggregateNotFoundException, UseCase, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';
import type { Order } from '../../domain/aggregate/Order';
import type { OrderEvent } from '../../domain/event/OrderEvent';
import { OrderCancellation } from '../../domain/service/OrderCancellation';
import { CancellationReason } from '../../domain/value-object/CancellationReason';
import { CustomerId } from '../../domain/value-object/CustomerId';
import { OrderId } from '../../domain/value-object/OrderId';

export interface CancelOrderInput {
  actorId: string;
  orderId: string;
  reason: string;
}

export interface CancelOrderCommand {
  actorId: CustomerId;
  orderId: OrderId;
  reason: CancellationReason;
}

export class CancelOrder extends UseCase<CancelOrderInput, CancelOrderCommand, void> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly cancellation: OrderCancellation,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: CancelOrderInput): CancelOrderCommand {
    return ValueObjectBuilder.build({
      actorId: () => new CustomerId(input.actorId),
      orderId: () => new OrderId(input.orderId),
      reason: () => new CancellationReason(input.reason),
    });
  }

  protected async handle(command: CancelOrderCommand): Promise<void> {
    const order = await this.orders.findById(command.orderId);
    if (order === null) {
      throw new AggregateNotFoundException('Order', command.orderId.value);
    }
    this.cancellation.cancel(order, command.actorId, command.reason, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
```

Cargar, invocar el dominio, guardar y publicar, y ninguna regla de negocio: que solo el comprador pueda cancelar lo comprueba el servicio de dominio `OrderCancellation` (`NotTheCustomerOfOrder`), y que el pedido no esté ya cancelado, `order.cancel` (`OrderNotCancellable`). Coincide con la forma de IDDD: parámetros, repositorio, comando sobre el agregado [IDDD cap. 4] y con la anatomía de *DDD in PHP* [PHP: Application].

Orden de `handle` `[Fuera de los libros: convención de @archi-code/ddd]`: (1) autorización → `NotAllowedException`; (2) id nuevo (`OrderId.generate()`); (3) `Order.create(...)`, o `findById` y `AggregateNotFoundException` si es `null`; (4) método o métodos de negocio con `this.clock`; (5) `save` una vez (o `remove`) y después `publish(x.pullDomainEvents())`; (6) log si el negocio quiere traza; (7) devolver la salida.

* El constructor recibe, `private readonly` y en este orden, solo lo que usa `handle`: el repositorio con los roles que usa (`AggregateFinder<Order> & AggregateSaver<Order>`; `AggregateSaver<Order>` solo para crear; `AggregateFinder<Order> & AggregateRemover<Order>` para borrar), servicios de dominio, `EventBus<OrderEvent>`, `Clock` y `Logger`. Nunca una dependencia de transacciones (un runner de transacciones o una unidad de trabajo): no existe puerto de transacciones `[Fuera de los libros: convención de @archi-code/ddd]`.
* `UseCase` no trae ayudas (`findOrFail`, `saveAndPublish`): todos los pasos se escriben en `handle` `[Fuera de los libros: convención de @archi-code/ddd]`.
* Se guarda antes de publicar, y se publica lo que devuelve `pullDomainEvents()`.
* La aplicación nunca abre, une ni cierra transacciones. IDDD pone el control de la transacción en el servicio de aplicación [IDDD cap. 14]; con el paquete esa responsabilidad pasa al adaptador del repositorio, que hace atómico cada `save` y `remove`, comprueba la versión y envuelve los errores del driver en `InternalErrorException` con `{ cause }` `[Fuera de los libros: convención de @archi-code/ddd]`. Ver `ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`.

Crear: el caso de uso genera el id, crea el agregado y devuelve el id nuevo (la versión completa, con `Customer` como fábrica, en `ddd-skills/ddd-servicios-capa-aplicacion/references/ejemplo-ecommerce.md`):

```ts
  protected async handle(command: PlaceOrderCommand): Promise<string> {
    if (!command.actorId.equals(command.customerId)) {
      throw new NotAllowedException(
        `Customer ${command.actorId.value} may not place orders for ${command.customerId.value}`,
      );
    }
    const order = Order.create(
      OrderId.generate(),
      command.customerId,
      command.lines,
      command.shippingAddress,
      this.clock,
    );
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
    return order.id.value;
  }
```

## Plantilla de caso de uso por reacción

El listener es el caso de uso: una clase, un fichero, sin un `UseCase` detrás. IDDD pone en la capa de aplicación un suscriptor que delega en un servicio de aplicación [IDDD cap. 8]; el paquete los funde en una sola clase cuya entrada es el evento `[Fuera de los libros: convención de @archi-code/ddd]`.

```ts
// src/contexts/sales/application/register-stock-reservation/register-stock-reservation-on-stock-item-reserved.ts
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';
import type { Order } from '../../domain/aggregate/Order';
import type { OrderEvent } from '../../domain/event/OrderEvent';
import { OrderId } from '../../domain/value-object/OrderId';
import { ReservationReference } from '../../domain/value-object/ReservationReference';
import { StockItemReservedDomainEvent } from './stock-item-reserved-domain-event';

@ListensTo(StockItemReservedDomainEvent, {
  consumer: 'sales.register-stock-reservation-on-stock-item-reserved',
})
export class RegisterStockReservationOnStockItemReserved extends EventListener<StockItemReservedDomainEvent> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  async handle(event: StockItemReservedDomainEvent): Promise<void> {
    const { orderId, reservationId } = ValueObjectBuilder.build({
      orderId: () => new OrderId(event.orderId),
      reservationId: () => new ReservationReference(event.reservationId),
    });
    const order = await this.orders.findById(orderId);
    if (order === null) {
      return;
    }
    order.registerStockReservation(reservationId, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
```

* `@ListensTo(Evento, { consumer })`: un evento por clase; el `consumer` es `'<contexto>.<nombre del fichero sin .ts>'`, estable y único (la cola de la reacción en un broker), nunca derivado del nombre de la clase.
* El evento es la copia local del evento de otro contexto (`./stock-item-reserved-domain-event`, escrita en `ddd-skills/ddd-servicios-capa-aplicacion/references/ejemplo-ecommerce.md`, con el mismo nombre de clase y `eventName` que el productor y solo los campos que lee `handle`), o el evento propio del contexto cuando la reacción alimenta un read model.
* `handle`: (1) construye los value objects con `ValueObjectBuilder.build` leyendo `event.*`; (2) calcula el id derivado si lo hay (`PaymentId.forOrder(orderReference)`); (3a) para crear, `if ((await repo.findById(id)) !== null) { return; }` y `<Agregado>.create(...)`; (3b) para cambiar, `findById` y retorna si es `null`; (4) el método de reacción del agregado, que retorna sin cambios cuando el hecho ya no aplica (`registerStockReservation` sobre un pedido que ya no está pendiente); (5) `save` una vez y `publish`; (6) log si hace falta.
* Nunca: autorización, `AggregateNotFoundException`, errores de negocio, llamar a otro caso de uso o reacción, HTTP ni `try/catch`. No hay envoltorio `UseCase`: `DomainEventBus` registra el fallo (`warn` para excepciones de dominio y aplicación, `error` para lo demás) y lo devuelve al canal, cuya reentrega es el reintento.

## Entrada

* Primitivos o DTO o comando [PHP: Application, citando a Vernon]. Con el paquete, dos tipos por caso de uso de usuario, exportados en su fichero `[Fuera de los libros: convención de @archi-code/ddd]`: el `Input`, plano y de primitivos y tipos de datos (se puede serializar y encolar si un día hace falta [PHP: Application]), y el `Command`, de value objects, composites y formas `New<Child>[]`, que construye `toCommand`.
* Los tipos de datos de la entrada (`MoneyData`, `AddressData`) son interfaces en ficheros kebab-case en la carpeta del caso de uso que los necesita primero (`place-order/money-data.ts`); el resto del contexto los importa de ahí. Nunca en `domain/` ni compartidos entre contextos.
* La conversión a value objects ocurre en `toCommand` con exactamente `return ValueObjectBuilder.build({ … })`: enums con `new OrderStatusType(input.status as OrderStatus)`, composites con `X.fromPrimitives(input.x)`, dinero con `Money.fromPrimitives(input.x as { amount: number; currency: Currency })`, y listas de formas con `ValueObjectBuilder.buildList(input.lines, (line) => ValueObjectBuilder.build({ … }))`. Si algún campo no es válido lanza una sola `ValidationException` con el `field` y el `code` de cada problema (`lines.1.quantity`), y `handle` no llega a ejecutarse.
* El adaptador de entrada solo comprueba la forma de la petición (el body es un objeto, una lista es un array); las reglas de cada valor son de los value objects.
* Nunca recibas el agregado desde el controlador.

## Salida

IDDD presenta varias opciones [IDDD cap. 14]:

| Opción | Cuándo |
|---|---|
| Devolver un identificador o nada | Comandos (lo normal) |
| DTO construido desde el agregado | El cliente necesita el resultado inmediato |
| Transformador de datos que elige el cliente | Varios clientes con formatos distintos |
| Método sin retorno y puerto de salida | Estilo hexagonal estricto |

Con el paquete, la salida es el tercer parámetro de tipo: `UseCase<PlaceOrderInput, PlaceOrderCommand, string>` devuelve el id (`order.id.value`), `void` nada. Nunca el agregado.

Para pantallas, un read model aparte: una fila de primitivos, un puerto de store que escribe la proyección, un puerto de consulta que el controlador lee directamente (sin caso de uso) y un caso de uso por reacción por cada evento que cambia la fila (ver `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`).

## Command bus

*DDD in PHP* presenta el bus de comandos (Tactician) para enlazar cada comando con su manejador; los objetos request se parecen ya a comandos [PHP: Application]. El paquete no trae bus de comandos `[Fuera de los libros: convención de @archi-code/ddd]`: el composition root construye cada caso de uso de usuario y se lo pasa al controlador, que llama a `execute(input)`. Lo común a todos ya está en `UseCase.execute` (dejar pasar las excepciones del paquete y envolver cualquier otro error en `UnexpectedErrorException` con `cause`), y la atomicidad de cada escritura es del repositorio.

## Eventos en la capa de aplicación

* La aplicación puede registrar suscriptores para guardar y reenviar eventos, dejando el dominio libre de mensajería [IDDD cap. 4]. Con el paquete, los suscriptores son casos de uso por reacción que el composition root construye con sus dependencias y conecta con `bus.subscribe(listener)`.
* Con outbox, los eventos se guardan en la transacción y la publicación ocurre fuera (`ddd-skills/ddd-eventos-dominio/GUIA.md`). Con el paquete, el caso de uso siempre llama a `events.publish(order.pullDomainEvents())` después de `save`; si `publish` falla después de `save`, el evento puede perderse. Cuando un evento no puede perderse, el repositorio escribe el agregado y sus eventos pendientes en la misma escritura atómica (un outbox) y un relay los entrega después por un `EventChannel`; los casos de uso no cambian `[Fuera de los libros: convención de @archi-code/ddd]`.

## Conflictos de concurrencia

Cada repositorio comprueba la versión del agregado y lanza `ConcurrencyException` (409) si otro lo cambió después de cargarlo. Por defecto se deja llegar al punto de entrada. Si el comando es seguro de repetir sobre el nuevo estado, el caso de uso puede reintentarlo [IDDD cap. 10; IDDD apéndice A]: un bucle en `handle` en el que cada intento vuelve a cargar el agregado y vuelve a guardarlo; pocos intentos y después se relanza. Un caso de uso por reacción no reintenta por sí mismo: reintenta la reentrega del canal.

```ts
export interface AddOrderLineInput {
  orderId: string;
  line: { sku: string; quantity: number; unitPrice: MoneyData };
}

export interface AddOrderLineCommand {
  orderId: OrderId;
  line: OrderLine;
}

export class AddOrderLine extends UseCase<AddOrderLineInput, AddOrderLineCommand, void> {
  private static readonly ATTEMPTS = 3;

  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: AddOrderLineInput): AddOrderLineCommand {
    return ValueObjectBuilder.build({
      orderId: () => new OrderId(input.orderId),
      line: () => OrderLine.fromPrimitives(input.line),
    });
  }

  protected async handle(command: AddOrderLineCommand): Promise<void> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        const order = await this.orders.findById(command.orderId);
        if (order === null) {
          throw new AggregateNotFoundException('Order', command.orderId.value);
        }
        order.addLine(command.line, this.clock);
        await this.orders.save(order);
        return await this.events.publish(order.pullDomainEvents());
      } catch (error) {
        if (!(error instanceof ConcurrencyException) || attempt === AddOrderLine.ATTEMPTS) {
          throw error;
        }
      }
    }
  }
}
```

Nunca se reintenta con el agregado ya cargado, y un caso de uso nunca se llama a sí mismo ni a otro para reintentar.

## Errores

* El dominio lanza errores de negocio con nombre de lo que ha ido mal y sin sufijo `Exception` (`class OrderNotCancellable extends DomainException`, `super(message, ['SAL002'])`, un prefijo por contexto); los value objects y `ValueObjectBuilder.build` lanzan `ValidationException`.
* El caso de uso de usuario añade las suyas: `AggregateNotFoundException('Order', id)` cuando `findById` devuelve `null`, `NotAllowedException(message)` cuando el actor no puede ejecutar la acción, `ApplicationException` para otros errores de aplicación. Al traducir otro error, siempre con `{ cause: error }`. Un caso de uso por reacción no lanza ninguna: retorna.
* Los errores se dejan propagar: no se capturan en `handle` para relanzarlos; `execute` deja pasar las excepciones del paquete y envuelve el resto en `UnexpectedErrorException` (de `@archi-code/ddd/application`).
* El punto de entrada no los captura: un ayudante por protocolo (`platform/http/http.ts`) los clasifica con `ExceptionClassifier.classify(error)` de `@archi-code/ddd/infrastructure`, que no sabe de ningún protocolo: `NotFound` (`AggregateNotFoundException`), `NotAllowed` (`NotAllowedException`), `Conflict` (`ConcurrencyException`), `Malformed` (`TypePrimitiveException`, `RequiredValueException`), `Invalid` (`ValidationException` y cualquier otro error de negocio), `Rejected` (otros errores de aplicación) e `Internal` (`UnexpectedErrorException`, `InvalidEventDefinitionException` y lo demás). En HTTP: 404, 403, 409, 400, 422, 400 y 500; oculta el mensaje de `Internal`, devuelve `{ code, message, errors }` (los `errors` solo de una `ValidationException`) y registra una vez los fallos internos `[Fuera de los libros: convención de @archi-code/ddd]`. Ayudante completo en `ddd-skills/ddd-arquitectura/references/estructura-hexagonal-ts.md`. El controlador comprueba solo el actor y la forma:

```ts
// src/contexts/sales/interfaces/http/orders-controller.ts
export class OrdersController {
  private readonly http: Http;

  constructor(
    private readonly cancelOrder: CancelOrder,
    logger: Logger,
  ) {
    this.http = new Http(logger);
  }

  cancel(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const userId = request.auth?.userId;
      if (userId === undefined) {
        return this.http.unauthenticated();
      }
      const body = this.http.jsonBody(request);
      if (body === null) {
        return this.http.badRequest('Send the cancellation reason as a JSON object');
      }
      await this.cancelOrder.execute({
        actorId: userId,
        orderId: request.params?.orderId as string,
        reason: body.reason as string,
      });
      return { status: 204 };
    });
  }
}
```

La identidad del solicitante sale del token (`request.auth`), nunca del cuerpo.

## Tests

Con adaptadores en memoria: el repositorio en memoria del proyecto (uno por agregado; cada `save` y `remove` es atómico y comprueba la versión; cómo se escribe, en `ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`), y del paquete `DomainEventBus` sobre `InMemoryEventChannel` (`channel.sent` lista lo publicado) y `FixedClock`. Los puertos propios se sustituyen por objetos simples.

```ts
import { describe, expect, it } from 'vitest';
import {
  DomainEventBus,
  EventRegistry,
  FixedClock,
  InMemoryEventChannel,
} from '@archi-code/ddd/infrastructure';

const clock = new FixedClock('2026-03-01T09:30:00Z');

function sales() {
  const orders = new InMemoryOrderRepository();
  const channel = new InMemoryEventChannel();
  const events = new DomainEventBus<OrderEvent>(channel, new EventRegistry<OrderEvent>());
  return {
    orders,
    channel,
    cancelOrder: new CancelOrder(orders, new OrderCancellation(), events, clock),
  };
}

describe('Cancelling an order', () => {
  it('a customer cancels her own pending order', async () => {
    const { orders, channel, cancelOrder } = sales();
    await orders.save(aPendingOrderOf(laura));

    await cancelOrder.execute({ actorId: laura, orderId, reason: 'Wrong size' });

    expect(channel.sent).toMatchObject([
      { eventName: 'order.cancelled', orderId, reason: 'Wrong size' },
    ]);
  });

  it('another customer may not cancel it', async () => {
    const { orders, channel, cancelOrder } = sales();
    await orders.save(aPendingOrderOf(laura));

    await expect(
      cancelOrder.execute({ actorId: marta, orderId, reason: 'Wrong size' }),
    ).rejects.toThrow(NotTheCustomerOfOrder);
    expect(channel.sent).toEqual([]);
  });
});
```

`aPendingOrderOf`, `laura`, `marta` y `orderId` son fábricas y datos de `test/support/` del proyecto; el modelo (`Order`, `OrderCancelledDomainEvent`…) es el de `ddd-skills/ddd-agregados/references/implementacion-ts.md` y `OrderCancellation` el de `ddd-skills/ddd-servicios-capa-aplicacion/references/ejemplo-ecommerce.md`. Estos tests comprueban orquestación; que un pedido ya cancelado no se pueda cancelar otra vez se prueba en `Order`, y que otro cliente no pueda cancelarlo, en `OrderCancellation`; no aquí.
