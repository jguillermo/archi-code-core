# Ejemplo: dónde va cada lógica en Ventas

| Lógica | Dónde | Por qué |
|---|---|---|
| El total es la suma de las líneas | `OrderLines` (composite `Composite({ items: [OrderLine] })`, método `total()`) | Cálculo sobre valores |
| Un pedido confirmado no admite líneas nuevas | `Order` (agregado), error `OrderNotModifiable` | Regla sobre su estado |
| Gastos de envío según zona y promociones | `ShippingCostCalculator` (servicio de dominio) | Necesita el pedido, la zona, las tarifas y la promoción; forzado en cualquiera de ellos |
| Envío gratis a partir de un importe | `TotalAtLeast` (`Specification<Order>`) | Regla con nombre que decide si un pedido cumple un criterio |
| Solo el cliente que hizo el pedido puede cancelarlo | `OrderCancellation` (servicio de dominio), con el concepto `CustomerId`, sobre `Order.cancel`; error `NotTheCustomerOfOrder` | Regla de negocio [IDDD cap. 2] |
| Solo la persona que inicia sesión puede pedir en su nombre | `PlaceOrder`, que lanza `NotAllowedException` | Autorización del caso de uso: la decide solo el actor [IDDD cap. 14] |
| Cargar pedido, cancelar, guardar, publicar | `CancelOrder` (caso de uso de usuario) | Coordinación |
| Cuando Almacén reserva, registrarlo en el pedido | `RegisterStockReservationOnStockItemReserved` (caso de uso por reacción) `[Fuera de los libros: convención de @archi-code/ddd]` | Reacción a un evento; invoca al agregado |
| Precio vigente de una referencia | `ProductPricing` (puerto de dominio en `domain/service/`, ACL en infraestructura) | Viene de otro contexto |

## El modelo

`Order` y sus value objects (`OrderId`, `CustomerId`, `Sku`, `Quantity`, `Money`, `OrderLine`, `OrderLines`, `ShippingAddress`, `OrderStatusType`, `ReservationReference`, `CancellationReason`), sus eventos (`OrderCreatedDomainEvent`, `OrderLineAddedDomainEvent`, `OrderCancelledDomainEvent`…, unidos en `OrderEvent`) y sus errores son los de `ddd-skills/ddd-agregados/references/implementacion-ts.md`; no se redefinen aquí. Lo que usan los ejemplos de esta guía (`ddd-skills/ddd-servicios-capa-aplicacion/references/servicios-dominio-ts.md` y `ddd-skills/ddd-servicios-capa-aplicacion/references/capa-aplicacion-ts.md`):

```ts
static create(
  id: OrderId,
  customerId: CustomerId,
  lines: OrderLines,
  shippingAddress: ShippingAddress,
  clock: Clock,
): Order;
addLine(line: OrderLine, clock: Clock): void;
registerStockReservation(reservation: ReservationReference, clock: Clock): void;
cancel(reason: CancellationReason, clock: Clock): void;
total(): Money;
```

Lo que añade Ventas en esta guía, cada clase en su fichero de `domain/`:

```ts
// domain/specification/TotalAtLeast.ts
export class TotalAtLeast extends Specification<Order> {
  constructor(private readonly minimum: Money) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.total().covers(this.minimum);
  }
}

// domain/exception/BlockedCustomerCannotOrder.ts
export class BlockedCustomerCannotOrder extends DomainException {
  constructor(customerId: string) {
    super(`Customer ${customerId} is blocked and cannot place orders`, ['SAL020']);
  }
}

// domain/value-object/CustomerName.ts, domain/value-object/Blocked.ts
export class CustomerName extends Required(StringType) {}
export class Blocked extends Required(BooleanType) {}

// domain/aggregate/Customer.ts
interface Clock {
  now(): Date;
}

export class Customer extends AggregateRoot<CustomerId, CustomerEvent> {
  readonly name: CustomerName;
  private _blocked: Blocked;
  readonly createdAt: CreatedAt;
  private _updatedAt: UpdatedAt;

  constructor(
    id: CustomerId,
    name: CustomerName,
    blocked: Blocked,
    createdAt: CreatedAt,
    updatedAt: UpdatedAt,
  ) {
    super(id);
    this.name = name;
    this._blocked = blocked;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static fromPrimitives(primitives: PrimitiveTypes<Customer>): Customer {
    return new Customer(
      new CustomerId(primitives.id),
      new CustomerName(primitives.name),
      new Blocked(primitives.blocked),
      new CreatedAt(primitives.createdAt),
      new UpdatedAt(primitives.updatedAt),
    );
  }

  get blocked(): Blocked {
    return this._blocked;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  placeOrder(
    id: OrderId,
    lines: OrderLines,
    address: ShippingAddress,
    clock: Clock,
  ): Order {
    if (this._blocked.value) {
      throw new BlockedCustomerCannotOrder(this.id.value);
    }
    return Order.create(id, this.id, lines, address, clock);
  }

  toPrimitives(): PrimitiveTypes<Customer> {
    return {
      id: this.id.value,
      name: this.name.value,
      blocked: this._blocked.value,
      createdAt: this.createdAt.value,
      updatedAt: this._updatedAt.value,
    };
  }
}

// domain/exception/NotTheCustomerOfOrder.ts
export class NotTheCustomerOfOrder extends DomainException {
  constructor(orderId: string) {
    super(`Only the customer who placed order ${orderId} can cancel it`, ['SAL021']);
  }
}

// domain/service/OrderCancellation.ts
interface Clock {
  now(): Date;
}

export class OrderCancellation {
  cancel(
    order: Order,
    requester: CustomerId,
    reason: CancellationReason,
    clock: Clock,
  ): void {
    if (!order.customerId.equals(requester)) {
      throw new NotTheCustomerOfOrder(order.id.value);
    }
    order.cancel(reason, clock);
  }
}
```

* `TotalAtLeast` usa `Money.covers` (misma moneda e importe mayor o igual).
* `Customer` se muestra solo con lo que usa este ejemplo (su `create` y sus eventos siguen la plantilla de `ddd-skills/ddd-agregados/references/implementacion-ts.md`). `placeOrder` es un método fábrica [IDDD cap. 11]: comprueba una regla del cliente y delega en `Order.create`, que recibe el id ya calculado.
* `OrderCancellation` es un servicio de dominio: la regla relaciona a quien pide con el pedido (`CustomerId`), y el estado lo sigue protegiendo `Order.cancel`, que lanza `OrderNotCancellable` si el pedido ya está cancelado.

## `PlaceOrder`

```ts
// src/contexts/sales/application/place-order/place-order.ts
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import {
  AggregateNotFoundException,
  NotAllowedException,
  UseCase,
  ValueObjectBuilder,
} from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';
import type { AddressData } from './address-data';
import type { MoneyData } from './money-data';

export interface PlaceOrderInput {
  actorId: string;
  customerId: string;
  lines: { sku: string; quantity: number; unitPrice: MoneyData }[];
  shippingAddress: AddressData;
}

export interface PlaceOrderCommand {
  actorId: CustomerId;
  customerId: CustomerId;
  lines: OrderLines;
  shippingAddress: ShippingAddress;
}

export class PlaceOrder extends UseCase<PlaceOrderInput, PlaceOrderCommand, string> {
  constructor(
    private readonly customers: AggregateFinder<Customer>,
    private readonly orders: AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: PlaceOrderInput): PlaceOrderCommand {
    return ValueObjectBuilder.build({
      actorId: () => new CustomerId(input.actorId),
      customerId: () => new CustomerId(input.customerId),
      lines: () => OrderLines.fromPrimitives({ items: input.lines }),
      shippingAddress: () => ShippingAddress.fromPrimitives(input.shippingAddress),
    });
  }

  protected async handle(command: PlaceOrderCommand): Promise<string> {
    if (!command.actorId.equals(command.customerId)) {
      throw new NotAllowedException(
        `Customer ${command.actorId.value} may not place orders for ${command.customerId.value}`,
      );
    }
    const customer = await this.customers.findById(command.customerId);
    if (customer === null) {
      throw new AggregateNotFoundException('Customer', command.customerId.value);
    }
    const order = customer.placeOrder(
      OrderId.generate(),
      command.lines,
      command.shippingAddress,
      this.clock,
    );
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
    return order.id.value;
  }
}
```

* La autorización va primero y depende solo del actor; las lecturas de otros agregados (`Customer`) van antes de invocar al dominio [IDDD cap. 10].
* `Customer` actúa como fábrica pero no se modifica ni se guarda: el caso de uso pide `AggregateFinder<Customer>` y `AggregateSaver<Order>`, y solo se guarda `Order`: una escritura atómica, un agregado; que esa escritura sea atómica lo garantiza el repositorio, no el caso de uso `[Fuera de los libros: convención de @archi-code/ddd]`.
* El id nuevo lo genera el caso de uso con el value object (`OrderId.generate()`), no el repositorio ni `Order.create`.
* `toCommand` informa de todos los campos a la vez, también los de cada línea (`OrderLines.fromPrimitives` los nombra por su ruta, `lines.items.0.quantity`).
* `MoneyData` y `AddressData` son tipos de datos de la entrada, en la carpeta de este caso de uso.

Los gastos de envío se han dejado fuera de este caso de uso para mantenerlo alineado con el `Order` de `ddd-skills/ddd-agregados/GUIA.md`; si el negocio los incorpora al pedido, el caso de uso carga lo que `ShippingCostCalculator` necesita, lo invoca y pasa el `Money` resultante a `placeOrder`.

## Registrar la reserva de stock

Una reacción a un evento es un caso de uso por reacción: una sola clase `<Acción>On<Evento>` que extiende `EventListener`, decorada con `@ListensTo` y con un consumidor estable `'<contexto>.<acción>-on-<evento>'`. Registra un hecho que ya ocurrió: si el pedido no existe, retorna en vez de lanzar (el canal lo reentregaría sin fin), y `registerStockReservation` retorna sin cambios si ya lo registró, porque la entrega es al menos una vez.

Ventas no importa la clase de Almacén: declara su propia copia del evento junto a la reacción, con el mismo nombre de clase y `eventName` y solo los campos que lee:

```ts
// src/contexts/sales/application/register-stock-reservation/stock-item-reserved-domain-event.ts
import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class StockItemReservedDomainEvent extends EventBase {
  static readonly eventName = 'stock_item.reserved';

  readonly reservationId: string;
  readonly orderId: string;

  constructor({
    reservationId,
    orderId,
    eventId,
    occurredOn,
    clock,
  }: { reservationId: string; orderId: string } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.reservationId = reservationId;
    this.orderId = orderId;
  }
}
```

```ts
// src/contexts/sales/application/register-stock-reservation/register-stock-reservation-on-stock-item-reserved.ts
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

## Test del flujo

El test comprueba lo que provoca la reacción, no que se le llame, y entrega el mismo evento dos veces. `aPendingOrderOf`, `laura` y `orderId` son fábricas y datos de `test/support/` del proyecto, e `InMemoryOrderRepository` es el repositorio en memoria del proyecto (`ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`), como en `ddd-skills/ddd-servicios-capa-aplicacion/references/capa-aplicacion-ts.md`:

```ts
import { describe, expect, it } from 'vitest';
import {
  DomainEventBus,
  EventRegistry,
  FixedClock,
  InMemoryEventChannel,
} from '@archi-code/ddd/infrastructure';

const clock = new FixedClock('2026-03-01T09:30:00Z');
const reservationId = '0f1e2d3c-4b5a-4968-8776-655443322110';

describe('Registering the stock reservation of an order', () => {
  it('the order keeps the reservation the warehouse made, also when it is delivered twice', async () => {
    const orders = new InMemoryOrderRepository();
    const registry = new EventRegistry<StockItemReservedDomainEvent>().register(
      StockItemReservedDomainEvent,
      (json) =>
        new StockItemReservedDomainEvent({
          reservationId: json.reservationId as string,
          orderId: json.orderId as string,
          eventId: json.eventId,
          occurredOn: json.occurredOn,
        }),
    );
    const channel = new InMemoryEventChannel();
    const bus = new DomainEventBus(channel, registry);
    await bus.subscribe(new RegisterStockReservationOnStockItemReserved(orders, bus, clock));
    await orders.save(aPendingOrderOf(laura));
    const reserved = new StockItemReservedDomainEvent({ reservationId, orderId, clock });

    await bus.publish([reserved]);
    await bus.publish([reserved]);

    const order = await orders.findById(new OrderId(orderId));
    expect(order?.stockReservation.value).toBe(reservationId);
  });
});
```
