# Ejemplo: Ventas en la tienda online

Objetos del contexto de Ventas, con la decisión razonada. Los límites de agregado se deciden en `ddd-skills/ddd-agregados/GUIA.md`; aquí solo se decide valor o entidad y su comportamiento.

| Concepto | Decisión | Razón |
|---|---|---|
| `Money` | Value object | Cuantifica; se reemplaza; igualdad por valor |
| `Quantity` | Value object | Regla: entero positivo y máximo por línea |
| `Sku` | Value object | Identifica un producto de otro contexto: integración minimalista |
| `OrderLine` | Value object | Dentro del pedido se identifica por su `Sku`; nadie la busca por id propio |
| `ShippingAddress` | Value object | Describe a dónde va este pedido; si el cliente cambia de casa, el pedido no cambia |
| `OrderStatus` | Tipo estándar con comportamiento | Reglas de transición en un solo sitio |
| `Order` | Entidad | Ciclo de vida largo, identidad propia, cambia de estado |

```ts
export class Quantity extends ValueObject<{ value: number }> {
  static readonly MAX_PER_LINE = 20;
  static of(value: number): Quantity {
    if (!Number.isInteger(value) || value < 1) throw new InvalidQuantity(value);
    if (value > Quantity.MAX_PER_LINE) throw new QuantityAboveLineLimit(value, Quantity.MAX_PER_LINE);
    return new Quantity({ value });
  }
  get value() { return this.props.value; }
}

export class OrderLine extends ValueObject<{ sku: Sku; name: string; quantity: Quantity; unitPrice: Money }> {
  static of(sku: Sku, name: string, quantity: Quantity, unitPrice: Money): OrderLine {
    if (name.trim() === '') throw new OrderLineNeedsName(sku);
    return new OrderLine({ sku, name, quantity, unitPrice });
  }
  subtotal(): Money { return this.props.unitPrice.multiply(this.props.quantity.value); }
  withQuantity(q: Quantity): OrderLine { return OrderLine.of(this.props.sku, this.props.name, q, this.props.unitPrice); }
  get sku() { return this.props.sku; }
  get unitPrice() { return this.props.unitPrice; }
}

export class Order extends Entity<OrderId> {
  private constructor(
    id: OrderId,
    private readonly customerId: CustomerId,
    private lines: OrderLines,
    private shippingAddress: ShippingAddress,
    private status: OrderStatus,
  ) { super(id); }

  static place(id: OrderId, customerId: CustomerId, lines: OrderLine[], address: ShippingAddress): Order {
    return new Order(id, customerId, OrderLines.of(lines), address, OrderStatus.Pending);
  }

  changeQuantity(sku: Sku, quantity: Quantity): void {
    if (!this.status.allowsLineChanges()) throw new OrderNoLongerEditable(this.id);
    this.lines = this.lines.withQuantity(sku, quantity);
  }

  redirectTo(address: ShippingAddress): void {
    if (!this.status.allowsLineChanges()) throw new OrderNoLongerEditable(this.id);
    this.shippingAddress = address;    // reemplazo completo del valor
  }

  total(): Money { return this.lines.total(); }
}
```

La entidad apenas tiene lógica propia: delega en sus valores (`OrderLines.total`, `OrderStatus.allowsLineChanges`). Es lo que IDDD llama orientar la entidad a contenedor de valores [IDDD cap. 6].
