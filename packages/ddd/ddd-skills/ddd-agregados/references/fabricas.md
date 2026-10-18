# Fábricas

## Para qué

Encapsular la creación de agregados complejos y expresarla con el lenguaje ubicuo. Si crear es sencillo, un método estático con nombre en la propia clase basta [IDDD cap. 11; PHP: Factories].

## Método fábrica en la raíz de otro agregado

Cuando un agregado nace en el contexto de otro, el método de creación vive en el que lo origina. En IDDD, `Product.planBacklogItem(...)` crea un `BacklogItem` y `Calendar.scheduleCalendarEntry(...)` crea un `CalendarEntry` [IDDD cap. 11]. *DDD in PHP* muestra el mismo patrón ("factory method on aggregate root") [PHP: Factories].

Ventajas: el lenguaje queda explícito (se planifica un elemento en un producto), el creador puede aplicar sus reglas y pasar identidades (`productId`, `tenantId`) sin que el cliente las conozca.

No contradice la regla de una transacción por agregado: el creador no se modifica; solo fabrica el nuevo, que se guarda en su propio repositorio.

```ts
export class Customer extends AggregateRoot<CustomerId> {
  /** Un cliente bloqueado no puede realizar pedidos. */
  placeOrder(id: OrderId, lines: OrderLine[], address: ShippingAddress): Order {
    if (this.isBlocked()) throw new BlockedCustomerCannotOrder(this.id);
    return Order.place(id, this.id, lines, address);
  }
}
```

## Fábrica como servicio

Cuando la creación necesita información de otro contexto y traducirla, un servicio (a menudo parte de la capa anticorrupción) actúa de fábrica: consulta, traduce y crea el objeto local [IDDD cap. 11; PHP: Factories]. En IDDD, un servicio de Colaboración crea `Author` o `Moderator` a partir de la identidad y rol consultados en Identidad y Acceso [IDDD cap. 11].

## Tests

Prueba que la fábrica produce objetos válidos y que aplica las reglas de creación [PHP: Factories]. Con datos realistas.

## Cuándo no

* Para reconstituir desde base de datos: eso es del repositorio y su mapper (`reconstitute`), sin reglas de creación ni eventos.
* "Fábricas" genéricas que reciben un DTO y rellenan campos: un constructor con setters disfrazado.
