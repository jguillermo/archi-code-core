# Ejemplo: dónde va cada lógica en Ventas

| Lógica | Dónde |
|---|---|
| Total = suma de las líneas | `OrderLines.total()` (composite) |
| Un pedido confirmado no admite líneas | `Order.addLine`, `OrderNotModifiable` |
| Gastos de envío según zona y promoción | `ShippingCostCalculator` (servicio de dominio) |
| Envío gratis desde un importe | `TotalAtLeast` (`Specification<Order>`) |
| Solo el cliente que hizo el pedido lo cancela | `Order.cancel(requester, reason)` → `NotTheCustomerOfOrder` [IDDD cap. 2] |
| Solo quien inicia sesión pide en su nombre | `PlaceOrder` → `NotAllowedException` [IDDD cap. 14] |
| Cargar, cancelar, guardar, publicar | `CancelOrder` |
| Registrar la reserva de Almacén | `RegisterStockReservationOnStockItemReserved` `[Fuera de los libros: convención de @archi-code/ddd]` |
| Precio vigente de otro contexto | `ProductPricing` (puerto de dominio + ACL) |

El modelo es el de `ddd-skills/ddd-agregados/references/implementacion-ts.md`. Lo que Ventas añade:

```ts
export class TotalAtLeast extends Specification<Order> {
  constructor(private readonly minimum: Money) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.total().covers(this.minimum);
  }
}

cancel(requester: CustomerId, reason: CancellationReason): void {
  if (!this.customerId.equals(requester)) {
    throw new NotTheCustomerOfOrder(this.id.value);
  }
  if (this.isIn(OrderStatus.CANCELLED)) {
    throw new OrderNotCancellable(this.id.value, this._status.value);
  }
  this.moveTo(OrderStatus.CANCELLED);
  this.record(new OrderCancelledDomainEvent({ orderId: this.id.value, reason: reason.value, … }));
}
```

* `TotalAtLeast` usa `Money.covers` (misma moneda e importe mayor o igual).
* "Solo el comprador cancela" depende del estado del agregado: método de `Order`, no servicio de dominio `[Fuera de los libros: convención de @archi-code/ddd]`. Una regla que depende solo del rol del actor es autorización (`NotAllowedException`).
* `Customer` (agregado con `Blocked`) tiene un método fábrica `placeOrder(id, lines, address)` que lanza `BlockedCustomerCannotOrder` y delega en `Order.create` [IDDD cap. 11].

## `PlaceOrder`

```ts
protected async handle(command: PlaceOrderCommand): Promise<string> {
  if (!command.actorId.equals(command.customerId)) {
    throw new NotAllowedException(`Customer ${command.actorId.value} may not place orders for ${command.customerId.value}`);
  }
  const customer = await this.customers.findById(command.customerId);
  if (customer === null) {
    throw new AggregateNotFoundException('Customer', command.customerId.value);
  }
  const order = customer.placeOrder(OrderId.generate(), command.lines, command.shippingAddress);
  await this.orders.save(order);
  await this.events.publish(order.pullDomainEvents());
  return order.id.value;
}
```

* Autorización primero; lecturas de otros agregados antes de invocar el dominio [IDDD cap. 10].
* Recibe `CustomerRepository` y `OrderRepository`; de `customers` solo `findById`. `Customer` actúa como fábrica pero no se modifica ni se guarda: solo se guarda `Order`, una escritura atómica que garantiza el repositorio.
* El id lo genera el caso de uso con el value object (`OrderId.generate()`), no el repositorio ni `Order.create`.
* `toCommand` informa de todos los campos a la vez, también los de cada línea (`lines.items.0.quantity`).
* Si el negocio incorpora los gastos de envío, el caso de uso carga lo que necesita `ShippingCostCalculator`, lo instancia en `handle`, lo invoca y pasa el `Money` a `placeOrder`.

## Reacción a la reserva de stock

Ventas declara su copia del evento de Almacén en `application/register-stock-reservation/stock-item-reserved-domain-event.ts` (`eventName = 'stock_item.reserved'`, campos `reservationId` y `orderId`). La reacción está en `ddd-skills/ddd-servicios-capa-aplicacion/references/capa-aplicacion-ts.md`: si el pedido no existe retorna, y `registerStockReservation` no cambia nada si ya lo registró (entrega al menos una vez). Su test publica el mismo evento dos veces con `bus.publish([reserved])` y comprueba el estado final del pedido, no que se llamó a la reacción.
