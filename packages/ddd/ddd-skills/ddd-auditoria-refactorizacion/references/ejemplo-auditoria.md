# Ejemplo: auditoría de un backend de pedidos hecho con @archi-code/ddd

Caso inventado. API Express + MongoDB, contexto `sales`; `Order extends AggregateRoot` y los casos de uso extienden `UseCase`, pero el modelo es anémico. Síntomas: pedidos sin líneas, puntos de fidelidad duplicados (un `ConcurrencyException` sobre `Customer` tumba el alta del pedido) y erratas en estados (`"shiped"`).

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

## Antes

```ts
class PlaceOrder extends UseCase<PlaceOrderInput, PlaceOrderCommand, void> {
  protected handle(command: PlaceOrderCommand): Promise<void> {
    return this.unitOfWork.run(async () => {
      const order = Order.create(command.orderId, command.customerId);
      const customer = await this.customers.findById(command.customerId);
      customer!.awardPointsFor(command.orderId);
      await this.orders.save(order);
      await this.customers.save(customer!);
      await this.events.publish(order.pullDomainEvents());
    });
  }
}
```

`Order` tiene `setStatus(status: string)` y `setTotal(total: number)` con `new Date()`, importa un `OrderMapper` de `infrastructure/`, y `UpdateOrder` (con `toCommand` que devuelve el input) decide las reglas y lanza `new Error('Empty order')`. La prueba de anemia da dos "sí" [IDDD cap. 1].

## Hallazgos

| # | Hallazgo | Evidencia | Sev. |
|---|---|---|---|
| 1 | `PlaceOrder` guarda `Order` y `Customer` en la misma unidad de trabajo (T6) | `application/place-order/place-order.ts:31` | Crítica |
| 2 | Modelo anémico: reglas en `UpdateOrder` (T1, T2) | `domain/order/order.ts:48` | Alta |
| 3 | `UpdateOrder` CRUD multifunción (T9) | `application/update-order/update-order.ts` | Alta |
| 4 | El dominio importa `OrderMapper` (A8, T18) | `domain/order/order.ts:2` | Alta |
| 5 | `_status: string`, `_total: number` (T3) | `domain/order/order.ts:5-6` | Media |
| 6 | `toCommand` no construye value objects (T16) | `update-order.ts:14` | Media |
| 7 | `new Date()` en vez de `UpdatedAt.now()` (A9) | `order.ts:10` | Media |
| 8 | `Error` genérico: `ExceptionClassifier` da `Internal` y 500 (A10) | `update-order.ts:18` | Media |
| 9 | Casos de uso con `UnitOfWork` (A4) | `place-order.ts:27` | Media |

## Después

* `Order` es el de `ddd-skills/ddd-agregados/references/implementacion-ts.md`: `OrderStatusType`, `OrderLines` (con regla `hasLines`), total calculado, `addLine` en vez de setters. El envío pasa a `Shipment` en Almacén (`ddd-skills/ddd-agregados/references/ejemplo-ecommerce.md`).
* `UpdateOrder` se parte en `AddOrderLine` (`toCommand` con `ValueObjectBuilder.build`, `findById`, `addLine`, `save`, `publish`).
* `PlaceOrder` genera el id, crea y guarda solo el pedido y devuelve su id; los puntos se conceden por evento, en su propia escritura [IDDD cap. 10]:

```ts
@ListensTo(OrderCreatedDomainEvent, { consumer: 'sales.award-loyalty-points-on-order-created' })
export class AwardLoyaltyPointsOnOrderCreated extends EventListener<OrderCreatedDomainEvent> {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  async handle(event: OrderCreatedDomainEvent): Promise<void> {
    const { customerId, orderId } = ValueObjectBuilder.build({
      customerId: () => new CustomerId(event.customerId),
      orderId: () => new OrderId(event.orderId),
    });
    const customer = await this.customers.findById(customerId);
    if (customer === null) {
      return;
    }
    customer.awardPointsFor(orderId);
    await this.customers.save(customer);
    await this.events.publish(customer.pullDomainEvents());
  }
}
```

`awardPointsFor` vuelve sin cambios si ya premió ese pedido (entrega al menos una vez). El test usa los repositorios en memoria del proyecto (`ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`) y comprueba que un pedido sin líneas lanza `ValidationException`; la fábrica del registro copia cada campo y conserva `eventId` y `occurredOn`.

## Plan

* **Fase 0:** caracterización con repositorios en memoria e `InMemoryEventChannel`.
* **Fase 1:** conversión en el agregado (fuera `OrderMapper`), `UpdatedAt.now()`, errores con nombre (`OrderNotModifiable`, `SAL001` → `Invalid`, 422), fuera `UnitOfWork`: `MongoOrderRepository` (constructor con solo la `collection`) hace atómico cada `save` con condición de versión, y los casos de uso reciben solo `OrderRepository`/`CustomerRepository` y `EventBus`.
* **Fase 2:** value objects, `Order.create`, `addLine`; `UpdateOrder` → `AddOrderLine`.
* **Fase 3:** `AwardLoyaltyPointsOnOrderCreated`; outbox en el documento del pedido para no perder `OrderCreatedDomainEvent`, entregado por un reenviador por el `EventChannel`; los casos de uso no cambian.
