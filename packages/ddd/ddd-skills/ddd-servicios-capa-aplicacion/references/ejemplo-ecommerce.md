# Ejemplo: dónde va cada lógica en Ventas

| Lógica | Dónde | Por qué |
|---|---|---|
| El total es la suma de las líneas | `OrderLines` (composite `Composite({ items: [OrderLine] })`, método `total()`) | Cálculo sobre valores |
| Un pedido confirmado no admite líneas nuevas | `Order` (agregado) | Regla sobre su estado |
| Gastos de envío según zona y promociones | `ShippingCostCalculator` (servicio de dominio) | Necesita el pedido, la zona, las tarifas y la promoción; forzado en cualquiera de ellos |
| Envío gratis a partir de un importe | `OrderAbove` (`Specification<Order>`) | Regla con nombre que decide si un pedido cumple un criterio |
| Solo el cliente que hizo el pedido puede cancelarlo | `OrderCancellation` (servicio de dominio), con concepto `Customer`, sobre `Order.cancel` | Regla de negocio [IDDD cap. 2] |
| Quien pide cancelar tiene permiso para cancelar pedidos (rol, sesión activa) | `SalesPermissions` (puerto de aplicación) consultado por `CancelOrder`, que lanza `NotAllowedException` | Autorización del caso de uso [IDDD cap. 14] |
| Cargar pedido, cancelar, guardar, publicar | `CancelOrder` (caso de uso) | Coordinación |
| Cuando Almacén reserva, registrar en el pedido | listener `RegisterReservationOnStockReserved` y su caso de uso `RegisterReservation` `[Fuera de los libros: convención de @archi-code/ddd]` | Reacción a evento; invoca al agregado |
| Precio vigente de una referencia | `ProductPricing` (puerto de dominio, ACL en infraestructura) | Viene de otro contexto |

## El modelo

`Order` y sus value objects (`OrderId`, `CustomerId`, `Sku`, `Quantity`, `Money`, `OrderLine`, `OrderLines`, `ShippingAddress`, `OrderStatus`, `ReservationId`, `CancellationReason`), sus eventos (`OrderPlaced`, `OrderLineAdded`, `OrderCancelled`…, unidos en `OrderEvent`) y sus errores son los de `ddd-skills/ddd-agregados/references/implementacion-ts.md`; no se redefinen aquí. Lo que usan los ejemplos de esta guía (`ddd-skills/ddd-servicios-capa-aplicacion/references/servicios-dominio-ts.md` y `ddd-skills/ddd-servicios-capa-aplicacion/references/capa-aplicacion-ts.md`):

```ts
static place(
  id: OrderId,
  customerId: CustomerId,
  lines: OrderLines,
  address: ShippingAddress,
  clock: { now(): Date },
): Order;
addLine(line: OrderLine, clock: { now(): Date }): void;
registerStockReservation(reservation: ReservationId, clock: { now(): Date }): void;
cancel(reason: CancellationReason, clock: { now(): Date }): void;
total(): Money;
```

Lo que añade Ventas en esta guía:

```ts
import { AggregateRoot, BooleanType, DomainException, Required, Specification, StringType } from '@archi-code/ddd/domain';
import type { PrimitiveTypes } from '@archi-code/ddd/domain';

export class OrderAbove extends Specification<Order> {
  constructor(private readonly minimum: Money) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.total().covers(this.minimum);
  }
}

export class CustomerBlocked extends DomainException {
  constructor(customerId: string) {
    super(`Customer ${customerId} is blocked and cannot place orders`, ['CUS001']);
  }
}

export class CustomerName extends Required(StringType) {}
export class Blocked extends Required(BooleanType) {}

export class Customer extends AggregateRoot<CustomerId> {
  private constructor(
    id: CustomerId,
    readonly name: CustomerName,
    private _blocked: Blocked,
  ) {
    super(id);
  }

  static fromPrimitives(primitives: PrimitiveTypes<Customer>): Customer {
    return new Customer(
      new CustomerId(primitives.id),
      new CustomerName(primitives.name),
      new Blocked(primitives.blocked),
    );
  }

  get blocked(): Blocked {
    return this._blocked;
  }

  placeOrder(
    id: OrderId,
    lines: OrderLines,
    address: ShippingAddress,
    clock: { now(): Date },
  ): Order {
    if (this._blocked.value) {
      throw new CustomerBlocked(this.id.value);
    }
    return Order.place(id, this.id, lines, address, clock);
  }

  toPrimitives(): PrimitiveTypes<Customer> {
    return { id: this.id.value, name: this.name.value, blocked: this._blocked.value };
  }
}

export class NotTheCustomerOfOrder extends DomainException {
  constructor(orderId: string) {
    super(`Only the customer who placed order ${orderId} can cancel it`, ['ORD004']);
  }
}

export class OrderCancellation {
  cancel(
    order: Order,
    requester: CustomerId,
    reason: CancellationReason,
    clock: { now(): Date },
  ): void {
    if (!order.customerId.equals(requester)) {
      throw new NotTheCustomerOfOrder(order.id.value);
    }
    order.cancel(reason, clock);
  }
}
```

* `OrderAbove` usa `Money.covers` (misma moneda e importe mayor o igual).
* `OrderCancellation` es un servicio de dominio: la regla relaciona a quien pide con el pedido (`CustomerId`), y el estado lo sigue protegiendo `Order.cancel`, que lanza `OrderCannotBeCancelled` si el pedido ya está cancelado.

## `PlaceOrder`

`ProductPricing` y `ProductNotSellable` son los de `ddd-skills/ddd-servicios-capa-aplicacion/references/capa-aplicacion-ts.md`.

```ts
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import { AggregateNotFoundException, UseCase, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';

export interface PlaceOrderInput {
  customerId: string;
  lines: { sku: string; quantity: number }[];
  shippingAddress: { street: string; city: string; country: string };
}

interface PlaceOrderCommand {
  customerId: CustomerId;
  lines: { sku: Sku; quantity: Quantity }[];
  shippingAddress: ShippingAddress;
}

export class PlaceOrder extends UseCase<PlaceOrderInput, PlaceOrderCommand, string> {
  constructor(
    private readonly customers: AggregateFinder<Customer>,
    private readonly orders: AggregateSaver<Order>,
    private readonly pricing: ProductPricing,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: PlaceOrderInput): PlaceOrderCommand {
    return ValueObjectBuilder.build({
      customerId: () => new CustomerId(input.customerId),
      lines: () =>
        ValueObjectBuilder.buildList(input.lines, (line) =>
          ValueObjectBuilder.build({
            sku: () => new Sku(line.sku),
            quantity: () => new Quantity(line.quantity),
          }),
        ),
      shippingAddress: () => ShippingAddress.fromPrimitives(input.shippingAddress),
    });
  }

  protected async handle(command: PlaceOrderCommand): Promise<string> {
    const customer = await this.customers.findById(command.customerId);
    if (customer === null) {
      throw new AggregateNotFoundException('Customer', command.customerId.value);
    }
    const items = await Promise.all(
      command.lines.map(async ({ sku, quantity }) => {
        const unitPrice = await this.pricing.priceForSale(sku);
        if (unitPrice === null) {
          throw new ProductNotSellable(sku.value);
        }
        return new OrderLine({ sku, quantity, unitPrice });
      }),
    );
    const lines = new OrderLines({ items });
    const order = customer.placeOrder(
      OrderId.generate(),
      lines,
      command.shippingAddress,
      this.clock,
    );
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
    return order.id.value;
  }
}
```

* Las lecturas de otros agregados y contextos (`Customer`, precios) van antes de invocar al dominio [IDDD cap. 10].
* `Customer` actúa como fábrica (comprueba que no está bloqueado) pero no se modifica ni se guarda: el caso de uso pide `AggregateFinder<Customer>` y `AggregateSaver<Order>`, y solo se guarda `Order`: una escritura atómica, un agregado; que esa escritura sea atómica lo garantiza el repositorio, no el caso de uso `[Fuera de los libros: convención de @archi-code/ddd]`.
* El id nuevo sale del value object (`OrderId.generate()`), no del repositorio.
* `toCommand` informa de todos los campos a la vez, también los de cada línea (`lines.0.quantity`).

Los gastos de envío se han dejado fuera de este caso de uso para mantenerlo alineado con el `Order` de `ddd-skills/ddd-agregados/GUIA.md`; si el negocio los incorpora al pedido, el caso de uso carga lo que `ShippingCostCalculator` necesita, lo invoca y pasa el `Money` resultante a `placeOrder`.

## Registrar la reserva de stock

Una reacción a un evento es un listener `<Acción>On<Evento>`, decorado con `@ListensTo` y con un nombre de consumidor estable, que solo traduce el evento a la entrada de un caso de uso. Ese caso de uso registra un hecho que ya ocurrió: si el pedido no existe, retorna en vez de lanzar (el canal lo reentregaría sin fin), y `registerStockReservation` es idempotente, porque la entrega es al menos una vez.

```ts
import { EventBase } from '@archi-code/ddd/domain';
import type { AggregateFinder, AggregateSaver, EventMetadata } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, UseCase, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';

export class StockReserved extends EventBase {
  static readonly eventName = 'StockReserved';

  constructor(
    readonly reservationId: string,
    readonly orderId: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

export interface RegisterReservationInput {
  orderId: string;
  reservationId: string;
}

interface RegisterReservationCommand {
  orderId: OrderId;
  reservationId: ReservationId;
}

export class RegisterReservation extends UseCase<
  RegisterReservationInput,
  RegisterReservationCommand,
  void
> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: RegisterReservationInput): RegisterReservationCommand {
    return ValueObjectBuilder.build({
      orderId: () => new OrderId(input.orderId),
      reservationId: () => new ReservationId(input.reservationId),
    });
  }

  protected async handle(command: RegisterReservationCommand): Promise<void> {
    const order = await this.orders.findById(command.orderId);
    if (order === null) {
      return;
    }
    order.registerStockReservation(command.reservationId, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}

@ListensTo(StockReserved, { consumer: 'register-reservation-on-stock-reserved' })
export class RegisterReservationOnStockReserved extends EventListener<StockReserved> {
  constructor(private readonly registerReservation: RegisterReservation) {
    super();
  }

  async handle(event: StockReserved): Promise<void> {
    await this.registerReservation.execute({
      orderId: event.orderId,
      reservationId: event.reservationId,
    });
  }
}
```

## Test del flujo

El test comprueba lo que el listener provoca, no que se le llame, y entrega el mismo evento dos veces. `aPendingOrderOf`, `laura` y `orderId` son fábricas y datos de `test/support/` del proyecto, y `InMemoryOrderRepository` es el repositorio en memoria que el proyecto escribe allí (`ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`), como en `ddd-skills/ddd-servicios-capa-aplicacion/references/capa-aplicacion-ts.md`:

```ts
import { describe, expect, it } from 'vitest';
import {
  DomainEventBus,
  EventRegistry,
  FixedClock,
  InMemoryEventChannel,
} from '@archi-code/ddd/infrastructure';
import { InMemoryOrderRepository } from '../support/in-memory-order-repository';

const clock = new FixedClock('2026-03-01T09:30:00Z');
const reservationId = '0f1e2d3c-4b5a-4968-8776-655443322110';

describe('Registering the stock reservation of an order', () => {
  it('the order keeps the reservation the warehouse made, also when it is delivered twice', async () => {
    const orders = new InMemoryOrderRepository();
    const registry = new EventRegistry<StockReserved>().register(
      StockReserved,
      (json) => new StockReserved(json.reservationId as string, json.orderId as string, json),
    );
    const channel = new InMemoryEventChannel();
    const bus = new DomainEventBus<StockReserved>(channel, registry);
    const sales = new DomainEventBus<OrderEvent>(channel, new EventRegistry<OrderEvent>());
    await bus.subscribe(
      new RegisterReservationOnStockReserved(
        new RegisterReservation(orders, sales, clock),
      ),
    );
    await orders.save(aPendingOrderOf(laura));
    const reserved = new StockReserved(reservationId, orderId, { clock });

    await bus.publish([reserved]);
    await bus.publish([reserved]);

    const order = await orders.findById(new OrderId(orderId));
    expect(order?.stockReservation?.value).toBe(reservationId);
  });
});
```
