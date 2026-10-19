# Ejemplo: catálogo de eventos de la tienda online

Continúa los ejemplos de `ddd-skills/ddd-context-mapping/GUIA.md` y `ddd-skills/ddd-agregados/GUIA.md`.

| Evento | Contexto | Causa | Datos | Ámbito | Consumidores | Plazo |
|---|---|---|---|---|---|---|
| OrderPlaced | Ventas | Caso de uso `PlaceOrder` | orderId, customerId, líneas (sku, cantidad, precio unitario), total, occurredOn | Publicado v1 (`sales.order.OrderPlaced`) | Almacén, Pagos | 1 min |
| OrderLineAdded | Ventas | Caso de uso `AddOrderLine` | orderId, sku, cantidad, precio unitario, total | Interno | `PrepareShipmentOnOrderLineAdded`, proyección de resumen | segundos |
| OrderConfirmed | Ventas | Política (reserva + autorización) | orderId, total | Publicado v1 (`sales.order.OrderConfirmed`) | Almacén, ERP | 30 s |
| PaymentAuthorizationInsufficient | Ventas | Política al registrar una autorización que no cubre el total | orderId, paymentId, importe autorizado, total | Interno | Política de compensación (anular autorización, avisar al cliente) | 1 min |
| OrderCancelled | Ventas | Caso de uso `CancelOrder` o política de caducidad | orderId, motivo, reservationId, paymentId | Publicado v1 | Almacén, Pagos | 10 min |
| PaymentAuthorizationExpired | Pagos | Paso del tiempo | paymentId, orderId | Publicado v1 | Ventas | 1 min |
| StockReserved | Almacén | Caso de uso `ReserveStock` | orderId, reservationId | Publicado v1 | Ventas (`RegisterReservation`) | 1 min |
| ShipmentDispatched | Almacén | Caso de uso registrado por el transportista | shipmentId, orderId, fecha | Publicado v1 | Ventas, Pagos | 1 día |

Decisiones razonadas:

* `OrderPlaced` va enriquecido con las líneas porque Almacén necesita reservar sin consultar a Ventas; no lleva dirección ni correo del cliente: Almacén los pide por REST solo para pedidos confirmados.
* `OrderLineAdded` y no `OrderUpdated`: dice qué cambió [Destilado cap. 6], y lleva el total resultante para que la proyección no tenga que recalcularlo. Es interno porque fuera nadie lo necesita mientras el pedido está pendiente: `SalesContracts` no produce ningún mensaje para él.
* `PaymentAuthorizationExpired` es un evento de tiempo con nombre de negocio, no un `TimerElapsed` [Destilado cap. 6].
* `OrderCancelled` lleva `reservationId` y `paymentId` para que cada consumidor compense sin consultar.
* `StockReserved` llega a Ventas como contrato publicado de Almacén, nunca como su clase: Ventas lo traduce en su adaptador y llama a `RegisterReservation`, que registra el hecho sin rechazarlo.

## Los eventos de Ventas con @archi-code/ddd

Cada evento del catálogo es una clase `EventBase` con sus datos como primitivos; el dinero viaja en céntimos con su moneda:

```ts
import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export interface MoneyData {
  readonly amount: number;
  readonly currency: string;
}

export interface OrderLineData {
  readonly sku: string;
  readonly quantity: number;
  readonly unitPrice: MoneyData;
}

export class OrderPlaced extends EventBase {
  static readonly eventName = 'OrderPlaced';

  constructor(
    orderId: string,
    readonly customerId: string,
    readonly lines: readonly OrderLineData[],
    readonly total: MoneyData,
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }
}

export class OrderLineAdded extends EventBase {
  static readonly eventName = 'OrderLineAdded';

  constructor(
    orderId: string,
    readonly sku: string,
    readonly quantity: number,
    readonly unitPrice: MoneyData,
    readonly total: MoneyData,
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }
}

export class OrderConfirmed extends EventBase {
  static readonly eventName = 'OrderConfirmed';

  constructor(
    orderId: string,
    readonly total: MoneyData,
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }
}

export type OrderEvent =
  | OrderPlaced
  | OrderLineAdded
  | OrderConfirmed
  | OrderCancelled
  | PaymentAuthorizationInsufficient;
```

Son las mismas clases de `ddd-skills/ddd-agregados/references/implementacion-ts.md`, donde también están `OrderCancelled` y `PaymentAuthorizationInsufficient`.

`Order` es el de `ddd-skills/ddd-agregados/references/implementacion-ts.md` (allí están la clase completa, sus value objects y el resto de sus eventos). Los registra en `place`, `addLine` y al confirmarse, siempre con el reloj que recibe:

```ts
static place(
  id: OrderId,
  customerId: CustomerId,
  lines: OrderLines,
  address: ShippingAddress,
  clock: { now(): Date },
): Order {
  const order = new Order(
    id,
    customerId,
    lines,
    address,
    new OrderStatus(Status.Pending),
    null,
    null,
  );
  order.record(
    new OrderPlaced(
      id.value,
      customerId.value,
      lines.items.map((line) => ({
        sku: line.sku.value,
        quantity: line.quantity.value,
        unitPrice: Order.moneyData(line.unitPrice),
      })),
      Order.moneyData(order.total()),
      { clock },
    ),
  );
  return order;
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
```

El registro del contexto reconstruye cada evento desde su JSON; cada fábrica pasa el JSON como último argumento para conservar `eventId` y `occurredOn`, que los consumidores usan para deduplicar:

```ts
import { EventRegistry } from '@archi-code/ddd/infrastructure';

export const orderEvents = new EventRegistry<OrderEvent>()
  .register(
    OrderPlaced,
    (json) =>
      new OrderPlaced(
        json.aggregateId,
        json.customerId as string,
        json.lines as OrderLineData[],
        json.total as MoneyData,
        json,
      ),
  )
  .register(
    OrderLineAdded,
    (json) =>
      new OrderLineAdded(
        json.aggregateId,
        json.sku as string,
        json.quantity as number,
        json.unitPrice as MoneyData,
        json.total as MoneyData,
        json,
      ),
  )
  .register(
    OrderConfirmed,
    (json) => new OrderConfirmed(json.aggregateId, json.total as MoneyData, json),
  )
  .register(
    OrderCancelled,
    (json) =>
      new OrderCancelled(
        json.aggregateId,
        json.reason as string,
        json.reservationId as string | null,
        json.paymentId as string | null,
        json,
      ),
  )
  .register(
    PaymentAuthorizationInsufficient,
    (json) =>
      new PaymentAuthorizationInsufficient(
        json.aggregateId,
        json.paymentId as string,
        json.authorized as MoneyData,
        json.required as MoneyData,
        json,
      ),
  );
```

## Contrato publicado de `OrderPlaced` v1

Es lo que `SalesContracts` (en `ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`) produce a partir del `SerializedEvent` de `OrderPlaced`; el mensaje lleva `messageId` = `eventId`. Esquema (Published Language):

```json
{
  "$id": "https://contratos.ejemplo/sales/order/OrderPlaced/1.json",
  "title": "sales.order.OrderPlaced",
  "type": "object",
  "required": ["orderId", "customerId", "lines", "total", "occurredOn"],
  "properties": {
    "orderId": { "type": "string", "format": "uuid" },
    "customerId": { "type": "string", "format": "uuid" },
    "lines": {
      "type": "array", "minItems": 1,
      "items": {
        "type": "object", "required": ["sku", "quantity", "unitPrice"],
        "properties": {
          "sku": { "type": "string" },
          "quantity": { "type": "integer", "minimum": 1 },
          "unitPrice": { "$ref": "#/$defs/money" }
        }
      }
    },
    "total": { "$ref": "#/$defs/money" },
    "occurredOn": { "type": "string", "format": "date-time" }
  },
  "$defs": {
    "money": { "type": "object", "required": ["amount", "currency"],
      "properties": {
        "amount": { "type": "integer", "description": "Importe en la unidad menor de la moneda (céntimos)" },
        "currency": { "type": "string", "pattern": "^[A-Z]{3}$" } } }
  }
}
```

El importe es un entero en céntimos, como `Money` (`Cents` + `Currency`) en el modelo, para que ningún consumidor pierda precisión con decimales `[Fuera de los libros: convención de @archi-code/ddd]`.
