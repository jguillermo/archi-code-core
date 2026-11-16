# Consistencia eventual entre agregados

## Mecanismo

Un comando registra un evento; un suscriptor carga **otro** agregado y lo cambia en **su propia transacción** [IDDD cap. 10; Destilado cap. 5], aquí el `save` atómico de su repositorio `[Fuera de los libros: convención de @archi-code/ddd]`. Dentro del mismo contexto no hace falta middleware [Destilado cap. 5].

* Fallo por concurrencia: no se confirma, se reentrega y se reintenta hasta un límite [IDDD cap. 10]; la reacción vuelve a cargar y guardar en cada entrega, nunca reintenta por su cuenta `[Fuera de los libros: convención de @archi-code/ddd]`. Si falla del todo, compensar o avisar [IDDD cap. 10]. Reintentos y cola de mensajes muertos son del `EventChannel`; `InMemoryEventChannel` no reintenta: el error llega a quien llamó a `publish` `[Fuera de los libros: convención de @archi-code/ddd]`.
* Suscriptor idempotente: entrega al menos una vez [Destilado cap. 4].
* El evento no está para mantener punteros inversos [IDDD cap. 10].

## Políticas

"Cuando pase X, haz Y" `[Fuera de los libros como término]`. Aquí, un caso de uso por reacción; IDDD pone un suscriptor que delega en un servicio de aplicación [IDDD cap. 8] `[Fuera de los libros: convención de @archi-code/ddd]`.

En el ejemplo, Almacén reserva stock y emite `'stock_item.reserved'`; Ventas no importa la clase de Almacén: declara su copia `StockItemReservedDomainEvent` con solo los campos que lee (`orderId`, `reservationId`), y la reacción `RegisterStockReservationOnStockItemReserved` (`consumer: 'sales.register-stock-reservation-on-stock-item-reserved'`) construye `OrderId` y `ReservationReference`, vuelve si falta el pedido, llama a `registerStockReservation` (`ddd-skills/ddd-agregados/references/implementacion-ts.md`), guarda y publica.

Código de la copia del evento, de la reacción y de su registro: `ddd-skills/archi-code-ddd/reactions.md` (apartados Rules y Code); tests sobre `InMemoryEventChannel` y el repositorio en memoria: `ddd-skills/archi-code-ddd/tests.md` y `ddd-skills/archi-code-ddd/repositories.md`.

Diseño de una política:
* Una política, un agregado modificado: una transacción, un agregado [IDDD cap. 10].
* La regla está en el agregado; la política registra el hecho y no lo rechaza [Destilado cap. 6].
* Idempotente: el mismo evento dos veces no cambia nada [Destilado cap. 4].
* Los errores técnicos (`ConcurrencyException`) se propagan para que el canal reintente `[Fuera de los libros: convención de @archi-code/ddd]`.

## Plazos

Durante el plazo aceptado: estados intermedios explícitos (`Pending`) [IDDD cap. 3], mensajes que lo reflejen y un rastreador para lo que no llega (`ddd-skills/ddd-context-mapping/GUIA.md`).

Con varios pasos y plazos, un objeto de proceso con su estado coordina; es un agregado pequeño que cambia solo en cada evento [IDDD cap. 13].
