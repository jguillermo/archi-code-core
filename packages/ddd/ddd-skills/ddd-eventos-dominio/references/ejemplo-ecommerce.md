# Ejemplo: catálogo de eventos de la tienda online

Continúa los ejemplos de `ddd-skills/ddd-context-mapping/GUIA.md` y `ddd-skills/ddd-agregados/GUIA.md`.

Cada fila es una clase `<Agregado><AcciónEnPasado>DomainEvent` con su `eventName` `'<agregado>.<acción_en_pasado>'` `[Fuera de los libros: convención de @archi-code/ddd]`. "Interno" es el ámbito del sistema (los contextos que comparten el canal, cada uno con su copia del evento); "Publicado" añade un contrato versionado para sistemas de fuera, con su propio nombre.

| Evento (`eventName`) | Contexto | Causa | Datos | Ámbito | Consumidores | Plazo |
|---|---|---|---|---|---|---|
| `OrderCreatedDomainEvent` (`order.created`) | Ventas | Caso de uso `PlaceOrder` (`Order.create`) | orderId, customerId, líneas (sku, cantidad, precio unitario), total, occurredOn | Interno + publicado v1 (`sales.order.OrderPlaced`) | Almacén, Pagos | 1 min |
| `OrderLineAddedDomainEvent` (`order.line_added`) | Ventas | Caso de uso `AddOrderLine` | orderId, sku, cantidad, total | Interno | Proyección de resumen; Almacén (`PrepareShipmentOnOrderLineAdded`) | segundos |
| `OrderConfirmedDomainEvent` (`order.confirmed`) | Ventas | Reacción (reserva + autorización) | orderId, total | Interno + publicado v1 (`sales.order.OrderConfirmed`) | Almacén (`PrepareShipmentOnOrderConfirmed`), ERP | 30 s |
| `OrderPaymentAuthorizationRejectedDomainEvent` (`order.payment_authorization_rejected`) | Ventas | Reacción al registrar una autorización que no cubre el total | orderId, paymentId, importe autorizado, total | Interno | Caso de uso por reacción de compensación (anular autorización, avisar al cliente) | 1 min |
| `OrderCancelledDomainEvent` (`order.cancelled`) | Ventas | Caso de uso `CancelOrder` o reacción a la caducidad | orderId, motivo, reservationId, paymentId | Interno | Almacén, Pagos | 10 min |
| `PaymentAuthorizationExpiredDomainEvent` (`payment_authorization.expired`) | Pagos | Paso del tiempo | paymentId, orderId | Interno | Ventas | 1 min |
| `StockItemReservedDomainEvent` (`stock_item.reserved`) | Almacén | Caso de uso `ReserveStock` | orderId, reservationId | Interno | Ventas (`RegisterStockReservationOnStockItemReserved`) | 1 min |
| `ShipmentDispatchedDomainEvent` (`shipment.dispatched`) | Almacén | Caso de uso registrado por el transportista | shipmentId, orderId, fecha | Interno | Ventas, Pagos | 1 día |

Decisiones razonadas:

* `OrderCreatedDomainEvent` va enriquecido con las líneas porque Almacén necesita reservar sin consultar a Ventas; no lleva dirección ni correo del cliente: Almacén los pide por REST solo para pedidos confirmados.
* `OrderLineAddedDomainEvent` y no `OrderUpdated`: dice qué cambió [Destilado cap. 6], y lleva el total resultante para que la proyección no tenga que recalcularlo. Fuera del sistema nadie lo necesita mientras el pedido está pendiente: `SalesContracts` no produce ningún mensaje para él.
* `PaymentAuthorizationExpiredDomainEvent` es un evento de tiempo con nombre de negocio, no un `TimerElapsed` [Destilado cap. 6].
* `OrderCancelledDomainEvent` lleva `reservationId` y `paymentId` para que cada consumidor compense sin consultar.
* `StockItemReservedDomainEvent` llega a Ventas por el canal compartido, nunca como la clase de Almacén: Ventas declara su copia junto a `RegisterStockReservationOnStockItemReserved`, el caso de uso por reacción que registra el hecho sin rechazarlo (`ddd-skills/ddd-agregados/references/consistencia-eventual.md`).

## Los eventos de Ventas con @archi-code/ddd

Cada evento del catálogo es una clase `EventBase` con sus datos como primitivos tipados en línea; el dinero viaja en céntimos con su moneda. Las clases de `Order` (`OrderCreatedDomainEvent`, `OrderLineAddedDomainEvent`, `OrderConfirmedDomainEvent`, `OrderCancelledDomainEvent`, `OrderPaymentAuthorizationRejectedDomainEvent`) están escritas en `ddd-skills/ddd-agregados/references/implementacion-ts.md`, junto al agregado que las registra en `create`, `addLine`, `cancel` y al confirmarse, siempre con el reloj que recibe:

```ts
addLine(line: OrderLine, clock: Clock): void {
  if (!this.isIn(OrderStatus.PENDING)) {
    throw new OrderNotModifiable(this.id.value, this._status.value);
  }
  this._lines = this._lines.withLine(line);
  this.touch(clock);
  this.record(
    new OrderLineAddedDomainEvent({
      orderId: this.id.value,
      sku: line.sku.value,
      quantity: line.quantity.value,
      total: this.total().toPrimitives(),
      clock,
    }),
  );
}
```

El registro de cada contexto (en su `composition.ts`) reconstruye cada evento que escucha desde su JSON; cada fábrica copia los campos y pasa `eventId` y `occurredOn` para conservarlos, porque los consumidores los usan para deduplicar. Un contexto que solo escucha registra sus copias; el de una proyección de Ventas registra los eventos propios que oye:

```ts
import { EventRegistry } from '@archi-code/ddd/infrastructure';

export const salesEvents = new EventRegistry()
  .register(
    OrderLineAddedDomainEvent,
    (json) =>
      new OrderLineAddedDomainEvent({
        orderId: json.orderId as string,
        sku: json.sku as string,
        quantity: json.quantity as number,
        total: json.total as { amount: number; currency: string },
        eventId: json.eventId,
        occurredOn: json.occurredOn,
      }),
  )
  .register(
    StockItemReservedDomainEvent,
    (json) =>
      new StockItemReservedDomainEvent({
        orderId: json.orderId as string,
        reservationId: json.reservationId as string,
        eventId: json.eventId,
        occurredOn: json.occurredOn,
      }),
  );
```

Cada evento se registra una sola vez por contexto.

## Contrato publicado de `OrderPlaced` v1

Es lo que `SalesContracts` (en `ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`) produce a partir del `SerializedEvent` de `OrderCreatedDomainEvent` (`'order.created'`) para los sistemas de fuera (el contrato conserva su nombre publicado); el mensaje lleva `messageId` = `eventId`. Esquema (Published Language):

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

El importe es un entero en céntimos, como `Money` (`Cents` + `MoneyCurrency`) en el modelo, para que ningún consumidor pierda precisión con decimales `[Fuera de los libros: convención de @archi-code/ddd]`.
