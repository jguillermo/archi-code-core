# Fábricas

Encapsulan la creación compleja con el lenguaje ubicuo; si es sencilla, un método estático basta [IDDD cap. 11; PHP: Factories]. Aquí siempre `static create(id, …valueObjects)` con constructor público que solo asigna `[Fuera de los libros: convención de @archi-code/ddd]`.

## Método fábrica en otra raíz

Si un agregado nace de otro, el método vive en el que lo origina (`Product.planBacklogItem`) [IDDD cap. 11; PHP: Factories]: lenguaje explícito, el creador aplica sus reglas y pasa identidades. No rompe "un agregado por transacción": el creador no cambia y solo se guarda el nuevo.

```ts
export class Customer extends AggregateRoot<CustomerId> {
  // campos, constructor, create, fromPrimitives y toPrimitives como en Order

  placeOrder(id: OrderId, lines: OrderLines, address: ShippingAddress): Order {
    if (this._blocked.value) {
      throw new BlockedCustomerCannotOrder(this.id.value);
    }
    return Order.create(id, this.id, lines, address);
  }
}
```

`placeOrder` no cambia al cliente: aplica su regla (`BlockedCustomerCannotOrder`, `SAL003`) y llama a `Order.create`, que sigue siendo la única forma de iniciar un pedido. El caso de uso carga el cliente (`CustomerRepository.findById`; si falta, `AggregateNotFoundException`), genera `OrderId.generate()`, llama a `placeOrder`, guarda solo el pedido y publica. El id no sale de un `nextIdentity()` del repositorio como en IDDD `[Fuera de los libros: convención de @archi-code/ddd]`.

```ts
protected async handle(command: PlaceOrderCommand): Promise<string> {
  const customer = await this.customers.findById(command.customerId);
  if (customer === null) {
    throw new AggregateNotFoundException('Customer', command.customerId.value);
  }
  const order = customer.placeOrder(OrderId.generate(), command.lines, command.shippingAddress);
  await this.orders.save(order);
  await this.events.publish(order.pullDomainEvents());
  return order.id.value;
}
```

## Fábrica como servicio

Si crear exige consultar y traducir otro contexto, un servicio (a menudo de la ACL) hace de fábrica [IDDD cap. 11; PHP: Factories]: puerto en `domain/` con value objects, adaptador y traductor en `infrastructure/` (`ddd-skills/ddd-context-mapping/GUIA.md`).

## Tests

Que produce objetos válidos y aplica sus reglas [PHP: Factories]: un cliente crea un pedido pendiente con `order.created`; uno bloqueado (cargado con `fromPrimitives`) lanza `BlockedCustomerCannotOrder`.

## Cuándo no

* Reconstituir desde la base: eso es `fromPrimitives`, sin reglas ni eventos.
* "Fábricas" que rellenan campos desde un DTO: setters disfrazados.
