# Ejemplo: dónde va cada lógica en Ventas

| Lógica | Dónde | Por qué |
|---|---|---|
| El total es la suma de las líneas | `OrderLines` (value object) | Cálculo sobre valores |
| Un pedido confirmado no admite cambios | `Order` (agregado) | Regla sobre su estado |
| Gastos de envío según zona, peso y promociones | `ShippingCostCalculator` (servicio de dominio) | Necesita líneas, dirección y promociones; forzado en cualquiera de ellos |
| Solo el cliente dueño puede cancelar | `SalesAccessPolicy` en aplicación, con concepto `Customer` | Autorización del caso de uso |
| Cargar pedido, cancelar, guardar | `CancelOrder` (servicio de aplicación) | Coordinación |
| Cuando Almacén reserva, registrar en el pedido | `RegisterReservationOnOrder` (política en aplicación) | Reacción a evento; invoca al agregado |
| Precio vigente de una referencia | `ProductPricing` (puerto de dominio, ACL en infraestructura) | Viene de otro contexto |

`PlaceOrder` completo:

```ts
export type PlaceOrderCommand = Readonly<{ customerId: string; items: { sku: string; quantity: number }[]; address: AddressInput }>;

export class PlaceOrder {
  constructor(
    private readonly orders: OrderRepository,
    private readonly customers: CustomerRepository,
    private readonly pricing: ProductPricing,
    private readonly tx: TransactionRunner,
  ) {}

  async execute(cmd: PlaceOrderCommand): Promise<string> {
    // Lecturas de otros agregados y contextos antes de invocar (IDDD cap. 10)
    const customer = await this.customers.byId(CustomerId.of(cmd.customerId));
    if (!customer) throw new CustomerNotFound(cmd.customerId);
    const lines = await Promise.all(cmd.items.map(async (i) => {
      const p = await this.pricing.priceForSale(Sku.of(i.sku));
      if (!p) throw new ProductNotSellable(i.sku);
      return OrderLine.of(p.sku, p.name, Quantity.of(i.quantity), p.unitPrice);
    }));
    const address = ShippingAddress.from(cmd.address);

    return this.tx.run(async () => {
      const order = customer.placeOrder(this.orders.nextId(), lines, address); // fábrica en la raíz
      await this.orders.save(order);                 // solo se guarda Order: una transacción, un agregado
      return order.id.value;
    });
  }
}
```

Los gastos de envío se han dejado fuera de este caso de uso para mantenerlo alineado con el `Order` de `ddd-agregados`; si el negocio los incorpora al pedido, `ShippingCostCalculator` se invoca aquí y su resultado se pasa como value object a `placeOrder`.

Observa que `Customer` actúa como fábrica (comprueba que no está bloqueado) pero no se modifica ni se guarda.
