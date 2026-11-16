# Consistencia eventual entre agregados

## Mecanismo

Un comando registra un evento; un suscriptor carga **otro** agregado y lo cambia en **su propia transacción** [IDDD cap. 10; Destilado cap. 5], aquí el `save` atómico de su repositorio `[Fuera de los libros: convención de @archi-code/ddd]`. Dentro del mismo contexto no hace falta middleware [Destilado cap. 5].

* Fallo por concurrencia: no se confirma, se reentrega y se reintenta hasta un límite [IDDD cap. 10]; la reacción vuelve a cargar y guardar en cada entrega, nunca reintenta por su cuenta `[Fuera de los libros: convención de @archi-code/ddd]`. Si falla del todo, compensar o avisar [IDDD cap. 10]. Reintentos y cola de mensajes muertos son del `EventChannel`; `InMemoryEventChannel` no reintenta: el error llega a quien llamó a `publish` `[Fuera de los libros: convención de @archi-code/ddd]`.
* Suscriptor idempotente: entrega al menos una vez [Destilado cap. 4].
* El evento no está para mantener punteros inversos [IDDD cap. 10].

## Políticas

"Cuando pase X, haz Y" `[Fuera de los libros como término]`. Aquí, un caso de uso por reacción; IDDD pone un suscriptor que delega en un servicio de aplicación [IDDD cap. 8] `[Fuera de los libros: convención de @archi-code/ddd]`. Ventas no importa la clase de Almacén: declara su copia (mismo nombre de clase y `eventName`, solo los campos que lee):

```ts
// application/register-stock-reservation/stock-item-reserved-domain-event.ts
export class StockItemReservedDomainEvent extends EventBase {
  static readonly eventName = 'stock_item.reserved';
  readonly orderId: string;
  readonly reservationId: string;

  constructor({ orderId, reservationId, eventId, occurredOn }: { orderId: string; reservationId: string } & EventMetadata) {
    super({ eventId, occurredOn });
    this.orderId = orderId;
    this.reservationId = reservationId;
  }
}
```

`RegisterStockReservationOnStockItemReserved` (`consumer: 'sales.register-stock-reservation-on-stock-item-reserved'`) es como la reacción de `references/implementacion-ts.md`: construye `OrderId` y `ReservationReference`, vuelve si falta el pedido, llama a `registerStockReservation`, guarda y publica. `composition.ts` registra el evento con una factoría que conserva `eventId` y `occurredOn`; en tests, sobre `InMemoryEventChannel` y el repositorio en memoria (`ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`).

Reglas `[Fuera de los libros: convención de @archi-code/ddd]`:
* Una política, un agregado modificado.
* Nombre del negocio `<Acción>On<Evento>` (`<Evento>` = clase del evento sin `DomainEvent`), nunca `StockReservedHandler`; `consumer` `'<contexto>.<fichero sin .ts>'`, estable y único, nunca el nombre de la clase.
* La regla está en el agregado; la política no autoriza, no lanza `AggregateNotFoundException` ni errores de negocio y no llama a otro caso de uso.
* Los errores técnicos (`ConcurrencyException`) se propagan para que el canal reintente.
* Idempotente: el mismo `eventId` dos veces no cambia nada.

## Plazos

Durante el plazo aceptado: estados intermedios explícitos (`Pending`) [IDDD cap. 3], mensajes que lo reflejen y un rastreador para lo que no llega (`ddd-skills/ddd-context-mapping/GUIA.md`).

Con varios pasos y plazos, un objeto de proceso con su estado coordina; es un agregado pequeño que cambia solo en cada evento [IDDD cap. 13].
