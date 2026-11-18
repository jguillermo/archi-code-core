# Ejemplo: dónde va cada lógica en Ventas

| Lógica | Dónde |
|---|---|
| Total = suma de las líneas | `OrderLines.total()` (composite) |
| Un pedido confirmado no admite líneas | `Order.addLine`, `OrderNotModifiable` |
| Gastos de envío según zona y promoción | `ShippingRates` (value object: precio de una zona) y un método de `Order`; no es un servicio de dominio |
| Envío gratis desde un importe | `TotalAtLeast` (`Specification<Order>`) |
| Solo el cliente que hizo el pedido lo cancela | `Order.cancel(requester, reason)` → `NotTheCustomerOfOrder` [IDDD cap. 2] |
| Solo quien inicia sesión pide en su nombre | `PlaceOrder` → `NotAllowedException` [IDDD cap. 14] |
| Cargar, cancelar, guardar, publicar | `CancelOrder` |
| Registrar la reserva de Almacén | `RegisterStockReservationOnStockItemReserved` `[Fuera de los libros: convención de @archi-code/ddd]` |
| Precio vigente de otro contexto | `ProductPricing` (puerto de aplicación + ACL; no existen puertos de dominio) |

El modelo es el de `ddd-skills/ddd-agregados/references/implementacion-ts.md`. Lo que Ventas añade:

* `TotalAtLeast(minimum: Money)` es una `Specification<Order>` que se cumple cuando el total del pedido cubre el mínimo (`Money.covers`: misma moneda e importe mayor o igual) [IDDD cap. 5 y cap. 6]. Código de una especificación: `ddd-skills/archi-code-ddd/domain-services.md`, apartado Code ("Specifications and domain services").
* "Solo el comprador cancela" depende del estado del agregado: método de `Order` (`cancel(requester, reason)`, que comprueba primero el comprador y luego el estado, lanza `NotTheCustomerOfOrder` u `OrderNotCancellable` y registra `OrderCancelledDomainEvent`), no servicio de dominio `[Fuera de los libros: convención de @archi-code/ddd]`. Una regla que depende solo del rol del actor es autorización (`NotAllowedException`). Código: `ddd-skills/archi-code-ddd/aggregates.md`, apartado Code.
* `Customer` (agregado con `Blocked`) tiene un método fábrica `placeOrder(id, lines, address)` que lanza `BlockedCustomerCannotOrder` y delega en `Order.create` [IDDD cap. 11]; código en `ddd-skills/ddd-agregados/references/fabricas.md`.

## `PlaceOrder`

* Autorización primero (el actor solo pide en su nombre); lecturas de otros agregados antes de invocar el dominio [IDDD cap. 10].
* Recibe `CustomerRepository` y `OrderRepository`; de `customers` solo `findById`. `Customer` actúa como fábrica pero no se modifica ni se guarda: solo se guarda `Order`, una escritura atómica que garantiza el repositorio.
* El id lo genera el caso de uso con el value object (`OrderId.generate()`), no el repositorio ni `Order.create`.
* La conversión de la entrada informa de todos los campos a la vez, también los de cada línea.
* Si el negocio incorpora los gastos de envío, el caso de uso carga las tarifas (`ShippingRates`) y se las pasa al pedido, que calcula su envío; no hay servicio de dominio para ello.
* Código de un caso de uso que crea: `ddd-skills/archi-code-ddd/use-cases.md`, apartado Code; con `Customer` como fábrica: `ddd-skills/ddd-agregados/references/fabricas.md`.

## Reacción a la reserva de stock

Ventas declara su copia del evento de Almacén (`eventName = 'stock_item.reserved'`, campos `reservationId` y `orderId`) junto a la primera reacción que lo oye. Si el pedido no existe, la reacción retorna, y `registerStockReservation` no cambia nada si ya lo registró (entrega al menos una vez). Su test publica el mismo evento dos veces y comprueba el estado final del pedido, no que se llamó a la reacción. Diseño en `ddd-skills/ddd-agregados/references/consistencia-eventual.md`; código en `ddd-skills/archi-code-ddd/reactions.md` y `ddd-skills/archi-code-ddd/tests.md`.
