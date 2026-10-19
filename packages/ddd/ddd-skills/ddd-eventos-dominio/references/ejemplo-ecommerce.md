# Ejemplo: catálogo de eventos de la tienda online

Continúa los ejemplos de `ddd-skills/ddd-context-mapping/GUIA.md` y `ddd-skills/ddd-agregados/GUIA.md`.

| Evento | Contexto | Causa | Datos | Ámbito | Consumidores | Plazo |
|---|---|---|---|---|---|---|
| OrderPlaced | Ventas | Comando RealizarPedido | orderId, customerId, líneas (sku, cantidad, precio unitario), total, occurredOn | Publicado v1 | Almacén, Pagos | 1 min |
| OrderLinesChanged | Ventas | Comando CambiarCantidad | orderId, líneas, total | Interno | Proyección de resumen | segundos |
| OrderConfirmed | Ventas | Política (reserva + autorización) | orderId, total | Publicado v1 | Almacén, ERP | 30 s |
| PaymentAuthorizationInsufficient | Ventas | Política al registrar una autorización que no cubre el total | orderId, paymentId, importe autorizado, total | Interno | Política de compensación (anular autorización, avisar al cliente) | 1 min |
| OrderCancelled | Ventas | Comando CancelarPedido o política de caducidad | orderId, motivo, reservationId, paymentId | Publicado v1 | Almacén, Pagos | 10 min |
| PaymentAuthorizationExpired | Pagos | Paso del tiempo | paymentId, orderId | Publicado v1 | Ventas | 1 min |
| StockReserved | Almacén | Comando ReservarStock | orderId, reservationId | Publicado v1 | Ventas | 1 min |
| ShipmentDispatched | Almacén | Comando registrado por el transportista | shipmentId, orderId, fecha | Publicado v1 | Ventas, Pagos | 1 día |

Decisiones razonadas:

* `OrderPlaced` va enriquecido con las líneas porque Almacén necesita reservar sin consultar a Ventas; no lleva dirección ni correo del cliente: Almacén los pide por REST solo para pedidos confirmados.
* `OrderLinesChanged` y no `OrderUpdated`: dice qué cambió [Destilado cap. 6]. Es interno porque fuera nadie lo necesita mientras el pedido está pendiente.
* `PaymentAuthorizationExpired` es un evento de tiempo con nombre de negocio, no un `TimerElapsed` [Destilado cap. 6].
* `OrderCancelled` lleva `reservationId` y `paymentId` para que cada consumidor compense sin consultar.

Esquema publicado de `OrderPlaced` v1 (Published Language):

```json
{
  "$id": "https://contratos.ejemplo/ventas/OrderPlaced/1.json",
  "type": "object",
  "required": ["orderId", "customerId", "lines", "total", "occurredOn"],
  "properties": {
    "orderId": { "type": "string" },
    "customerId": { "type": "string" },
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
      "properties": { "amount": { "type": "string" }, "currency": { "type": "string" } } }
  }
}
```
