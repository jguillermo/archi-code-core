# Capa de aplicación en TypeScript

`[Fuera de los libros: convención de @archi-code/ddd]`

| Clase | Entrada | Base | Fichero |
|---|---|---|---|
| De usuario | petición | `UseCase<Input, Command, Output>` | `application/<acción>/<acción>.ts` |
| Por reacción | evento | `EventListener<Evento>` + `@ListensTo` | `application/<acción>/<acción>-on-<evento>.ts` |

## Caso de uso de usuario

```ts
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
    private readonly orders: OrderRepository,
    private readonly events: EventBus,
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
    order.cancel(command.actorId, command.reason);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
```

Ninguna regla de negocio aquí: comprador y estado los comprueba `order.cancel` (`NotTheCustomerOfOrder`, `OrderNotCancellable`). Forma de IDDD: parámetros, repositorio, comando sobre el agregado [IDDD cap. 4; PHP: Application]. Al crear: autorización, `OrderId.generate()`, `Order.create(...)`, `save`, `publish`, devolver `order.id.value`.

## Caso de uso por reacción

```ts
@ListensTo(StockItemReservedDomainEvent, {
  consumer: 'sales.register-stock-reservation-on-stock-item-reserved',
})
export class RegisterStockReservationOnStockItemReserved extends EventListener<StockItemReservedDomainEvent> {
  constructor(
    private readonly orders: OrderRepository,
    private readonly events: EventBus,
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
    order.registerStockReservation(reservationId);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
```

* Un evento por clase; `consumer` = `'<contexto>.<fichero sin .ts>'`, estable y único (la cola de la reacción en un broker), nunca derivado del nombre de clase.
* El evento es la copia local (mismo nombre y `eventName`, solo los campos que lee) o un evento propio para un read model.
* Para crear: `if ((await repo.findById(id)) !== null) return;` con un id derivado del evento.
* Nunca autorización, `AggregateNotFoundException`, errores de negocio, otro caso de uso, HTTP ni `try/catch`: `DomainEventBus` registra el fallo (`warn` para excepciones de dominio y aplicación, `error` para lo demás) y lo devuelve al canal, que reentrega.

## Entrada

* `Input` plano de primitivos (serializable [PHP: Application]) y `Command` de value objects, ambos en el fichero del caso de uso. Tipos de datos (`MoneyData`): interfaces en ficheros kebab-case en la carpeta del primer caso de uso que los usa (`place-order/money-data.ts`), de donde los importa el resto del contexto; nunca en `domain/` ni compartidos entre contextos. El `Command` lleva value objects, composites y formas `New<Child>[]`.
* `toCommand`: enums `new OrderStatusType(input.status as OrderStatus)`, composites y dinero `X.fromPrimitives(...)`, listas `ValueObjectBuilder.buildList(...)`. Un fallo lanza una `ValidationException` con todos los campos (`lines.1.quantity`) y `handle` no corre.
* El adaptador solo comprueba la forma; nunca pasa un agregado.

## Salida

Id o nada (comandos, lo normal), DTO si el cliente necesita el resultado ya, transformador si hay varios formatos de cliente, o método sin retorno y puerto de salida en hexagonal estricto [IDDD cap. 14]; es el tercer tipo de `UseCase`, nunca el agregado. Para pantallas, read model leído por el controlador sin caso de uso (`ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`).

## Sin bus de comandos

*DDD in PHP* usa un command bus [PHP: Application]; el paquete no `[Fuera de los libros: convención de @archi-code/ddd]`: el composition root construye cada caso de uso y el controlador llama a `execute`. Las reacciones se conectan con `bus.subscribe(listener)` [IDDD cap. 4]. Outbox, si un evento no puede perderse, en el repositorio (`ddd-skills/ddd-eventos-dominio/GUIA.md`).

## Concurrencia

Reintento con límite recargando en `handle`, solo si el comando es seguro de repetir [IDDD cap. 10; IDDD apéndice A]; nunca con el agregado ya cargado ni llamando a otro caso de uso. Ejemplo en `ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`.

## Errores

* Dominio: `class OrderNotCancellable extends DomainException`, `super(message, ['SAL002'])`. Value objects: `ValidationException`.
* Caso de uso de usuario: `AggregateNotFoundException('Order', id)`, `NotAllowedException`, `ApplicationException`; al traducir, `{ cause }`. No capturar para relanzar.
* Punto de entrada: `ExceptionClassifier.classify(error)` → `NotFound` 404, `NotAllowed` 403, `Conflict` 409, `Malformed` 400, `Invalid` 422 (`ValidationException` y cualquier otro error de negocio), `Rejected` 400, `Internal` 500 (mensaje oculto, se registra una vez); respuesta `{ code, message, errors }`, `errors` solo de una `ValidationException` `[Fuera de los libros: convención de @archi-code/ddd]`. Ayudante en `ddd-skills/ddd-arquitectura/references/estructura-hexagonal-ts.md`. El controlador comprueba actor (del token) y forma, y llama a `execute`.

## Tests

`InMemoryOrderRepository` del proyecto (`ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`) y `DomainEventBus` sobre `InMemoryEventChannel`; los puertos propios, objetos simples; se comprueba `channel.sent`:

```ts
it('another customer may not cancel it', async () => {
  const { orders, channel, cancelOrder } = sales();
  await orders.save(aPendingOrderOf(laura));

  await expect(cancelOrder.execute({ actorId: marta, orderId, reason: 'Wrong size' })).rejects.toThrow(
    NotTheCustomerOfOrder,
  );
  expect(channel.sent).toEqual([]);
});
```

Prueba orquestación; las reglas de `cancel` se prueban en `Order`.
