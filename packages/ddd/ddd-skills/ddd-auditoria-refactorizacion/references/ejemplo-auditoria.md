# Ejemplo: auditoría de un backend de pedidos hecho con @archi-code/ddd

Caso inventado para mostrar el nivel esperado del informe. El equipo usa el paquete, pero lo usa mal: tiene las clases base, no el modelo.

## Contexto

API en TypeScript con Express y MongoDB, contexto `sales`, unos 120 ficheros. `Order` extiende `AggregateRoot` y los casos de uso extienden `UseCase`. Síntomas: pedidos enviados sin líneas, puntos de fidelidad duplicados cuando dos pedidos del mismo cliente llegan a la vez (`ConcurrencyException` sobre `Customer` que tumba el alta del pedido) y estados escritos con erratas (`"shiped"`).

## Escaneo

```
[alta ] dominio-importa-capa-exterior-del-paquete: 2
[alta ] varios-agregados-en-una-transaccion: 3
[media] dinero-como-number: 4
[media] new-date-en-dominio-o-aplicacion: 7
[media] setter-en-dominio: 11
[media] transaccion-en-aplicacion: 2
[baja ] estado-como-string: 2
```

La prueba de anemia da dos "sí" [IDDD cap. 1]: `Order` tiene `setStatus`, `setTotal` y `setLines`, y las reglas (no enviar un pedido vacío, no tocar uno enviado) están en `UpdateOrder`.

## Código auditado (antes)

```ts
import { AggregateRoot, CreatedAt, UpdatedAt } from '@archi-code/ddd/domain';
import { OrderMapper } from '../../infrastructure/order-mapper';

class Order extends AggregateRoot<OrderId, OrderEvent> {
  private _status: string;
  private _total: number;
  // …
  setStatus(status: string): void {
    this._status = status;
    this._updatedAt = new UpdatedAt(new Date());
  }

  setTotal(total: number): void {
    this._total = total;
  }

  static mapper = new OrderMapper();
}

class UpdateOrder extends UseCase<UpdateOrderInput, UpdateOrderInput, void> {
  protected toCommand(input: UpdateOrderInput): UpdateOrderInput {
    return input;
  }

  protected handle(input: UpdateOrderInput): Promise<void> {
    return this.unitOfWork.run(async () => {
      const order = await this.orders.findById(new OrderId(input.orderId));
      if (input.status === 'shipped' && order!.lines.length === 0) {
        throw new Error('Empty order');
      }
      if (input.status) order!.setStatus(input.status);
      if (input.total) order!.setTotal(input.total);
      await this.orders.save(order!);
    });
  }
}

class PlaceOrder extends UseCase<PlaceOrderInput, PlaceOrderCommand, void> {
  protected handle(command: PlaceOrderCommand): Promise<void> {
    return this.unitOfWork.run(async () => {
      const order = Order.place(command.orderId, command.customerId, this.clock);
      const customer = await this.customers.findById(command.customerId);
      customer!.awardPointsFor(command.orderId);
      await this.orders.save(order);
      await this.customers.save(customer!);
      await this.events.publish(order.pullDomainEvents());
    });
  }
}
```

## Hallazgos principales

| # | Hallazgo | Evidencia | Severidad |
|---|---|---|---|
| 1 | `PlaceOrder` guarda `Order` y `Customer` en la misma `unitOfWork.run`: un conflicto de versión en el cliente anula el pedido | `application/place-order/place-order.ts:31` | Crítica |
| 2 | Reglas de envío en el caso de uso; `Order` solo tiene setters (modelo anémico) | `domain/order/order.ts:48`, `application/update-order/update-order.ts:22` | Alta |
| 3 | `UpdateOrder` hace varias cosas según el input (enviar, cambiar total, cambiar líneas): nombre CRUD, no una acción de negocio | `application/update-order/update-order.ts` | Alta |
| 4 | El dominio importa `OrderMapper`, un mapper escrito a mano en `infrastructure/`, y le delega la conversión a primitivos | `domain/order/order.ts:2` | Alta |
| 5 | Estado y total como primitivos (`_status: string`, `_total: number`) en vez de value objects | `domain/order/order.ts:5-6` | Media |
| 6 | `toCommand` devuelve el input tal cual: ningún value object se construye ni valida antes de `handle` | `application/update-order/update-order.ts:14` | Media |
| 7 | `new Date()` en el agregado: fechas no deterministas en tests | `domain/order/order.ts:10` | Media |
| 8 | `throw new Error(...)` en vez de una `DomainException` con código: `ExceptionClassifier` lo clasifica como `ExceptionKind.Internal` y el cliente recibe 500 | `application/update-order/update-order.ts:18` | Media |
| 9 | Los casos de uso reciben un `UnitOfWork` del proyecto y abren la transacción con `unitOfWork.run`: la transacción y todo lo de persistencia son del adaptador del repositorio, que hace atómico cada `save` | `application/update-order/update-order.ts:17`, `application/place-order/place-order.ts:27` | Media |

Los hallazgos 2, 3 y 6 se cruzan además con `ddd-skills/archi-code-ddd/what-not-to-do.md` (casos de uso CRUD, value objects fuera de `toCommand`, reglas de negocio fuera del agregado).

## Código propuesto (después)

El pedido pasa a ser el `Order` de `ddd-skills/ddd-agregados/references/implementacion-ts.md`, con sus value objects y eventos; no se redefine aquí. El estado es un value object con comportamiento (`OrderStatus`), el total deja de guardarse porque sale de las líneas, y las líneas son `OrderLines`, un `Composite` de `OrderLine` (con `Money`) cuya regla `hasLines` impide crear un pedido sin líneas. Lo que usan los casos de uso de este ejemplo:

```ts
static place(
  id: OrderId,
  customerId: CustomerId,
  lines: OrderLines,
  address: ShippingAddress,
  clock: { now(): Date },
): Order;
addLine(line: OrderLine, clock: { now(): Date }): void;
```

Enviar no es trabajo del pedido de Ventas: lo hace `Shipment` en Almacén, que publica `ShipmentDispatched` (`ddd-skills/ddd-agregados/references/ejemplo-ecommerce.md`), así que `status: 'shipped'` y su errata desaparecen de Ventas. `UpdateOrder` se parte en un caso de uso por acción de negocio (`AddOrderLine` aquí; el envío, en Almacén); cada uno construye sus value objects en `toCommand` y guarda un solo agregado:

```ts
import { ValueObjects } from '@archi-code/ddd/domain';
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import { AggregateNotFoundException } from '@archi-code/ddd/exceptions';
import { UseCase } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';

interface AddOrderLineInput {
  orderId: string;
  sku: string;
  quantity: number;
  unitPrice: { amount: number; currency: string };
}

interface AddOrderLineCommand {
  orderId: OrderId;
  line: OrderLine;
}

class AddOrderLine extends UseCase<AddOrderLineInput, AddOrderLineCommand, void> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: AddOrderLineInput): AddOrderLineCommand {
    return ValueObjects.build({
      orderId: () => new OrderId(input.orderId),
      line: () =>
        OrderLine.fromPrimitives({
          sku: input.sku,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
        }),
    });
  }

  protected async handle(command: AddOrderLineCommand): Promise<void> {
    const order = await this.orders.findById(command.orderId);
    if (order === null) {
      throw new AggregateNotFoundException('Order', command.orderId.value);
    }
    order.addLine(command.line, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
```

`PlaceOrder` guarda solo el pedido; los puntos del cliente se conceden después, en su propia escritura atómica, cuando llega `OrderPlaced` (consistencia eventual fuera del límite del agregado [IDDD cap. 10]). El caso de uso que corre el listener no rechaza el hecho: si el cliente no existe, vuelve; y `Customer.awardPointsFor(orderId)` (un método de negocio del agregado `Customer`) ignora un pedido ya premiado, porque el canal entrega al menos una vez:

```ts
import { EventListener, ListensTo } from '@archi-code/ddd/application';

interface PlaceOrderInput {
  orderId: string;
  customerId: string;
  lines: { sku: string; quantity: number; unitPrice: { amount: number; currency: string } }[];
  shippingAddress: { street: string; city: string; country: string };
}

interface PlaceOrderCommand {
  orderId: OrderId;
  customerId: CustomerId;
  lines: OrderLines;
  shippingAddress: ShippingAddress;
}

interface AwardLoyaltyPointsInput {
  customerId: string;
  orderId: string;
}

interface AwardLoyaltyPointsCommand {
  customerId: CustomerId;
  orderId: OrderId;
}

class PlaceOrder extends UseCase<PlaceOrderInput, PlaceOrderCommand, void> {
  constructor(
    private readonly orders: AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: PlaceOrderInput): PlaceOrderCommand {
    return ValueObjects.build({
      orderId: () => new OrderId(input.orderId),
      customerId: () => new CustomerId(input.customerId),
      lines: () => OrderLines.fromPrimitives({ items: input.lines }),
      shippingAddress: () => ShippingAddress.fromPrimitives(input.shippingAddress),
    });
  }

  protected async handle(command: PlaceOrderCommand): Promise<void> {
    const order = Order.place(
      command.orderId,
      command.customerId,
      command.lines,
      command.shippingAddress,
      this.clock,
    );
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}

class AwardLoyaltyPoints extends UseCase<AwardLoyaltyPointsInput, AwardLoyaltyPointsCommand, void> {
  constructor(private readonly customers: AggregateFinder<Customer> & AggregateSaver<Customer>) {
    super();
  }

  protected toCommand(input: AwardLoyaltyPointsInput): AwardLoyaltyPointsCommand {
    return ValueObjects.build({
      customerId: () => new CustomerId(input.customerId),
      orderId: () => new OrderId(input.orderId),
    });
  }

  protected async handle(command: AwardLoyaltyPointsCommand): Promise<void> {
    const customer = await this.customers.findById(command.customerId);
    if (customer === null) {
      return;
    }
    customer.awardPointsFor(command.orderId);
    await this.customers.save(customer);
  }
}

@ListensTo(OrderPlaced, { consumer: 'award-loyalty-points-on-order-placed' })
class AwardLoyaltyPointsOnOrderPlaced extends EventListener<OrderPlaced> {
  constructor(private readonly awardLoyaltyPoints: AwardLoyaltyPoints) {
    super();
  }

  async handle(event: OrderPlaced): Promise<void> {
    await this.awardLoyaltyPoints.execute({
      customerId: event.customerId,
      orderId: event.orderId,
    });
  }
}
```

Test de la corrección, con los repositorios en memoria del proyecto (`InMemoryOrderRepository` e `InMemoryCustomerRepository`, dobles de test en `test/support/` escritos como en `ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`) y los adaptadores en memoria del paquete (`OrderLineData` y `MoneyData` son los tipos del payload de los eventos, en el mismo fichero que `Order`):

```ts
import { expect } from 'vitest';
import {
  DomainEventBus,
  EventRegistry,
  FixedClock,
  InMemoryEventChannel,
} from '@archi-code/ddd/infrastructure';
import { ValidationException } from '@archi-code/ddd/exceptions';
import { InMemoryCustomerRepository } from '../support/in-memory-customer-repository';
import { InMemoryOrderRepository } from '../support/in-memory-order-repository';

const orders = new InMemoryOrderRepository();
const customers = new InMemoryCustomerRepository();
const registry = new EventRegistry<OrderEvent>().register(
  OrderPlaced,
  (json) =>
    new OrderPlaced(
      json.orderId as string,
      json.customerId as string,
      json.lines as OrderLineData[],
      json.total as MoneyData,
      json,
    ),
);
const channel = new InMemoryEventChannel();
const bus = new DomainEventBus<OrderEvent>(channel, registry);
await bus.subscribe(new AwardLoyaltyPointsOnOrderPlaced(new AwardLoyaltyPoints(customers)));
const clock = new FixedClock('2026-03-01T09:30:00Z');
const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';
const customerId = '3c1d2e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const shippingAddress = { street: 'Calle Mayor 1', city: 'Huelva', country: 'ES' };
const placeOrder = new PlaceOrder(orders, bus, clock);

await placeOrder.execute({
  orderId,
  customerId,
  lines: [{ sku: 'TORCH-01', quantity: 2, unitPrice: { amount: 850, currency: 'EUR' } }],
  shippingAddress,
});
await expect(
  placeOrder.execute({
    orderId: '5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a',
    customerId,
    lines: [],
    shippingAddress,
  }),
).rejects.toThrow(ValidationException);
```

## Plan

* **Fase 0:** tests de caracterización de alta, envío y puntos de fidelidad sobre `InMemoryOrderRepository` e `InMemoryCustomerRepository` (dobles de test del proyecto en `test/support/`), `InMemoryEventChannel` y `FixedClock`.
* **Fase 1:** borrar `OrderMapper`: la conversión pasa al agregado (`toPrimitives()` y `static fromPrimitives()`, con un test de ida y vuelta) y `MongoOrderRepository` la llama directamente (su constructor recibe solo la `collection`), sustituir `new Date()` por el `Clock` inyectado y `Error` por `DomainException` con código; `ExceptionClassifier` clasifica las reglas de negocio como `ExceptionKind.Invalid` (422 en HTTP). Quitar el `UnitOfWork` de los casos de uso: `MongoOrderRepository` hace atómico cada `save` (una escritura de un documento con condición de versión) y los casos de uso solo reciben roles de repositorio, `EventBus` y `Clock`.
* **Fase 2:** `OrderStatus`, `OrderLines` (con `OrderLine` y `Money`) como value objects; `addLine` sustituye a los setters; `UpdateOrder` se parte en `AddOrderLine` y el envío pasa a `Shipment` en Almacén.
* **Fase 3:** `PlaceOrder` guarda solo el pedido; `AwardLoyaltyPointsOnOrderPlaced` ejecuta `AwardLoyaltyPoints` por evento. Para que `OrderPlaced` no se pierda si el proceso cae entre `save` y `publish`, `MongoOrderRepository` escribe el pedido y sus eventos pendientes en el mismo documento (outbox) y un relay los entrega después por el `EventChannel`; los casos de uso no cambian.
