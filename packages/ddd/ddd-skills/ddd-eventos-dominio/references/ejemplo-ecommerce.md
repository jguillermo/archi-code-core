# Ejemplo: catálogo de eventos de la tienda online

Continúa `ddd-skills/ddd-context-mapping/GUIA.md` y `ddd-skills/ddd-agregados/GUIA.md`. El diseño de `Order` y de sus eventos está en `ddd-skills/ddd-agregados/references/implementacion-ts.md`; su código, en `ddd-skills/archi-code-ddd/aggregates.md` y `ddd-skills/archi-code-ddd/events-and-errors.md`. "Interno": los contextos del sistema que comparten el canal, cada uno con su copia; "publicado": además un contrato versionado con nombre propio para sistemas de fuera.

| Evento (`eventName`) | Contexto | Causa | Datos | Ámbito | Consumidores |
|---|---|---|---|---|---|
| `OrderCreatedDomainEvent` (`order.created`) | Ventas | `PlaceOrder` | orderId, customerId, líneas, total | Interno + publicado v1 (`sales.order.OrderPlaced`) | Almacén, Pagos |
| `OrderLineAddedDomainEvent` (`order.line_added`) | Ventas | `AddOrderLine` | orderId, sku, cantidad, total | Interno | Proyección; Almacén |
| `OrderConfirmedDomainEvent` (`order.confirmed`) | Ventas | Reacción (reserva + autorización) | orderId, total | Interno + publicado v1 | Almacén, ERP |
| `OrderPaymentAuthorizationRejectedDomainEvent` (`order.payment_authorization_rejected`) | Ventas | Reacción: autorización que no cubre el total | orderId, paymentId, importe autorizado, total | Interno | Reacción de compensación (anular autorización, avisar) |
| `OrderCancelledDomainEvent` (`order.cancelled`) | Ventas | `CancelOrder` o caducidad | orderId, motivo, reservationId, paymentId | Interno | Almacén, Pagos |
| `PaymentAuthorizationExpiredDomainEvent` (`payment_authorization.expired`) | Pagos | Paso del tiempo | paymentId, orderId | Interno | Ventas |
| `StockItemReservedDomainEvent` (`stock_item.reserved`) | Almacén | `ReserveStock` | orderId, reservationId | Interno | Ventas |
| `ShipmentDispatchedDomainEvent` (`shipment.dispatched`) | Almacén | Registrado por el transportista | shipmentId, orderId, fecha | Interno | Ventas, Pagos |

Decisiones:

* `OrderCreatedDomainEvent` lleva las líneas para que Almacén reserve sin consultar; no lleva datos personales: Almacén los pide por REST solo para pedidos confirmados.
* `OrderLineAddedDomainEvent` y no `OrderUpdated`: dice qué cambió y lleva el total para que la proyección no lo recalcule [Destilado cap. 6]. No sale del sistema: el adaptador del broker no produce mensaje para él.
* `PaymentAuthorizationExpiredDomainEvent`: evento de tiempo con nombre de negocio [Destilado cap. 6].
* `OrderCancelledDomainEvent` lleva los ids para compensar sin consultar.
* Ventas declara su copia de `StockItemReservedDomainEvent` junto a `RegisterStockReservationOnStockItemReserved`, que registra el hecho sin rechazarlo (`ddd-skills/ddd-agregados/references/consistencia-eventual.md`).
* El contrato publicado lleva importes enteros en céntimos con moneda ISO, como `Money` en el modelo, para no perder precisión; el contrato conserva su nombre publicado y lleva `messageId` = `eventId` `[Fuera de los libros: convención de @archi-code/ddd]`.

Registro: cada contexto registra una vez cada evento que escucha (un contexto que solo escucha registra sus copias), con una fábrica que conserva `eventId` y `occurredOn` para deduplicar. Código: `ddd-skills/archi-code-ddd/composition-and-entry-points.md`, apartado "Composition root"; la copia del evento ajeno y su reacción, `ddd-skills/archi-code-ddd/reactions.md`, apartado Code.
