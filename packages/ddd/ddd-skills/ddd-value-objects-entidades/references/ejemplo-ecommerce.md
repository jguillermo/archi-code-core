# Ejemplo: Ventas en la tienda online

Objetos del contexto de Ventas, con la decisión razonada. Los límites de agregado se deciden en `ddd-skills/ddd-agregados/GUIA.md`; aquí solo se decide valor o entidad y su comportamiento.

| Concepto | Decisión | Razón | Con el paquete |
|---|---|---|---|
| `Money` | Value object | Cuantifica; se reemplaza; igualdad por valor | `Composite({ amount: Cents, currency: Currency })` |
| `Quantity` | Value object | Regla: entero positivo | `Required(NumberType)` + `@Validations` |
| `Sku` | Value object | Identifica un producto de otro contexto: integración minimalista | `Required(StringType)` |
| `OrderLine` | Value object | Dentro del pedido se identifica por su `Sku`; nadie la busca por id propio | `Composite` |
| `OrderLines` | Value object | Reglas de la colección: al menos una línea y un SKU por línea; `total()` no suma monedas distintas | `Composite({ items: [OrderLine] })` |
| `ShippingAddress` | Value object | Describe a dónde va este pedido; si el cliente cambia de casa, el pedido no cambia | `Composite` |
| `OrderStatus` | Tipo estándar con comportamiento | Reglas de transición en un solo sitio | `Required(StatusType)`, `StatusType extends EnumType<Status>` |
| `Order` | Entidad | Ciclo de vida largo, identidad propia, cambia de estado | `AggregateRoot<OrderId, OrderEvent>` |

`Money`, `Quantity`, `Sku`, `OrderLine`, `OrderLines`, `OrderStatus`, `OrderId` y `CustomerId` están en `ddd-skills/ddd-value-objects-entidades/references/value-objects-ts.md`. Aquí, la dirección:

```ts
import { Validations } from '@archi-code/validation';
import { Composite, Required, StringType } from '@archi-code/ddd/domain';

export class Street extends Required(StringType) {}
export class City extends Required(StringType) {}

@Validations([{ validator: 'isISO31661Alpha2' }])
export class Country extends Required(StringType) {
  protected filter(value: unknown): string {
    return super.filter(value).trim().toUpperCase();
  }
}

export class ShippingAddress extends Composite({ street: Street, city: City, country: Country }) {}
```

La entidad es el `Order` de `ddd-skills/ddd-agregados/references/implementacion-ts.md`, donde está la clase completa con sus eventos y su reloj; no se redefine aquí. Lo que importa para decidir valor o entidad:

```ts
export class Order extends AggregateRoot<OrderId, OrderEvent> {
  private constructor(
    id: OrderId,
    readonly customerId: CustomerId,
    private _lines: OrderLines,
    readonly shippingAddress: ShippingAddress,
    private _status: OrderStatus,
    private _stockReservation: ReservationId | null,
    private _paymentAuthorization: PaymentAuthorization | null,
  ) {
    super(id);
  }

  addLine(line: OrderLine, clock: { now(): Date }): void {
    if (!this._status.isPending()) {
      throw new OrderNoLongerEditable(this.id.value);
    }
    this._lines = this._lines.withLine(line);
    this.record(
      new OrderLineAdded(
        this.id.value,
        line.sku.value,
        line.quantity.value,
        Order.moneyData(line.unitPrice),
        Order.moneyData(this.total()),
        { clock },
      ),
    );
  }

  total(): Money {
    return this._lines.total();
  }
}
```

La entidad apenas tiene lógica propia: delega en sus valores (`OrderLines.total`, `OrderLines.withLine`, `OrderStatus.isPending`). Es lo que IDDD llama orientar la entidad a contenedor de valores [IDDD cap. 6]. `addLine` reemplaza el `OrderLines` entero por el que devuelve `withLine`; nunca cambia una línea por dentro.

El pedido referencia al cliente por su id (`customerId: CustomerId`), nunca por el objeto. Los eventos que registra (`OrderPlaced`, `OrderLineAdded`…) y el reloj que recibe cada método se explican en `ddd-skills/ddd-eventos-dominio/GUIA.md`.

Un test de ida y vuelta por agregado comprueba que se puede guardar y rehacer `[Fuera de los libros: convención de @archi-code/ddd]`:

```ts
import { expect, it } from 'vitest';

it('rebuilds the order it stored', () => {
  const order = Order.place(OrderId.generate(), CustomerId.generate(), lines, address, clock);
  expect(Order.fromPrimitives(order.toPrimitives()).toPrimitives()).toEqual(order.toPrimitives());
});
```
