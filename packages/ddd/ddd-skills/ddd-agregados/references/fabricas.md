# Fábricas

## Para qué

Encapsular la creación de agregados complejos y expresarla con el lenguaje ubicuo. Si crear es sencillo, un método estático en la propia clase basta [IDDD cap. 11; PHP: Factories]; con el paquete se llama siempre `static create(id, …valueObjects, clock)` y el constructor es público y solo asigna `[Fuera de los libros: convención de @archi-code/ddd]`.

## Método fábrica en la raíz de otro agregado

Cuando un agregado nace en el contexto de otro, el método de creación vive en el que lo origina. En IDDD, `Product.planBacklogItem(...)` crea un `BacklogItem` y `Calendar.scheduleCalendarEntry(...)` crea un `CalendarEntry` [IDDD cap. 11]. *DDD in PHP* muestra el mismo patrón ("factory method on aggregate root") [PHP: Factories].

Ventajas: el lenguaje queda explícito (se planifica un elemento en un producto), el creador puede aplicar sus reglas y pasar identidades (`productId`, `tenantId`) sin que el cliente las conozca.

No contradice la regla de una transacción por agregado: el creador no se modifica; solo fabrica el nuevo, que se guarda en su propio repositorio con un único `save` atómico.

`Order`, `OrderId`, `OrderLines` y `ShippingAddress` son los de `references/implementacion-ts.md`:

```ts
import {
  AggregateRoot,
  BooleanType,
  CreatedAt,
  DomainException,
  Required,
  StringType,
  UpdatedAt,
} from '@archi-code/ddd/domain';
import type { PrimitiveTypes } from '@archi-code/ddd/domain';
import { Validations } from '@archi-code/validation';

export class CustomerName extends Required(StringType) {}

@Validations([{ validator: 'isEmail' }])
export class Email extends Required(StringType) {}

export class Blocked extends Required(BooleanType) {}

export class BlockedCustomerCannotOrder extends DomainException {
  constructor(customerId: string) {
    super(`Customer ${customerId} is blocked and cannot place orders`, ['SAL003']);
  }
}

interface Clock {
  now(): Date;
}

export class Customer extends AggregateRoot<CustomerId> {
  readonly name: CustomerName;
  readonly email: Email;
  private _blocked: Blocked;
  readonly createdAt: CreatedAt;
  private _updatedAt: UpdatedAt;

  constructor(
    id: CustomerId,
    name: CustomerName,
    email: Email,
    blocked: Blocked,
    createdAt: CreatedAt,
    updatedAt: UpdatedAt,
  ) {
    super(id);
    this.name = name;
    this.email = email;
    this._blocked = blocked;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static create(id: CustomerId, name: CustomerName, email: Email, clock: Clock): Customer {
    const customer = new Customer(
      id,
      name,
      email,
      new Blocked(false),
      CreatedAt.now(clock),
      UpdatedAt.now(clock),
    );
    customer.record(
      new CustomerCreatedDomainEvent({ customerId: customer.id.value, clock }),
    );
    return customer;
  }

  static fromPrimitives(primitives: PrimitiveTypes<Customer>): Customer {
    return new Customer(
      new CustomerId(primitives.id),
      new CustomerName(primitives.name),
      new Email(primitives.email),
      new Blocked(primitives.blocked),
      new CreatedAt(primitives.createdAt),
      new UpdatedAt(primitives.updatedAt),
    );
  }

  get blocked(): Blocked {
    return this._blocked;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  placeOrder(id: OrderId, lines: OrderLines, address: ShippingAddress, clock: Clock): Order {
    if (this._blocked.value) {
      throw new BlockedCustomerCannotOrder(this.id.value);
    }
    return Order.create(id, this.id, lines, address, clock);
  }

  toPrimitives(): PrimitiveTypes<Customer> {
    return {
      id: this.id.value,
      name: this.name.value,
      email: this.email.value,
      blocked: this._blocked.value,
      createdAt: this.createdAt.value,
      updatedAt: this._updatedAt.value,
    };
  }
}
```

`CustomerCreatedDomainEvent` (`'customer.created'`) se escribe como los eventos de `Order`. `placeOrder` no cambia al cliente: solo aplica su regla y llama a `Order.create`, que sigue siendo la única forma de iniciar un pedido.

La regla de creación ("un cliente bloqueado no puede realizar pedidos") vive en `Customer`. El caso de uso lee el cliente con `AggregateFinder<Customer>`, genera la identidad nueva con `OrderId.generate()` y guarda solo el pedido con `AggregateSaver<Order>`; `Customer` no se guarda porque no ha cambiado:

```ts
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import { AggregateNotFoundException, UseCase, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';

export interface PlaceOrderInput {
  customerId: string;
  lines: { sku: string; quantity: number; unitPrice: { amount: number; currency: string } }[];
  shippingAddress: { street: string; city: string; country: string };
}

export interface PlaceOrderCommand {
  customerId: CustomerId;
  lines: OrderLines;
  shippingAddress: ShippingAddress;
}

export class PlaceOrder extends UseCase<PlaceOrderInput, PlaceOrderCommand, string> {
  constructor(
    private readonly customers: AggregateFinder<Customer>,
    private readonly orders: AggregateSaver<Order>,
    private readonly events: EventBus,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: PlaceOrderInput): PlaceOrderCommand {
    return ValueObjectBuilder.build({
      customerId: () => new CustomerId(input.customerId),
      lines: () => OrderLines.fromPrimitives({ items: input.lines }),
      shippingAddress: () => ShippingAddress.fromPrimitives(input.shippingAddress),
    });
  }

  protected async handle(command: PlaceOrderCommand): Promise<string> {
    const customer = await this.customers.findById(command.customerId);
    if (customer === null) {
      throw new AggregateNotFoundException('Customer', command.customerId.value);
    }
    const order = customer.placeOrder(
      OrderId.generate(),
      command.lines,
      command.shippingAddress,
      this.clock,
    );
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
    return order.id.value;
  }
}
```

La identidad nueva sale del value object (`OrderId.generate()`), no de un `nextIdentity()` del repositorio como hacen los ejemplos de IDDD `[Fuera de los libros: convención de @archi-code/ddd]`.

## Fábrica como servicio

Cuando la creación necesita información de otro contexto y traducirla, un servicio (a menudo parte de la capa anticorrupción) actúa de fábrica: consulta, traduce y crea el objeto local [IDDD cap. 11; PHP: Factories]. En IDDD, un servicio de Colaboración crea `Author` o `Moderator` a partir de la identidad y rol consultados en Identidad y Acceso [IDDD cap. 11]. El paquete no trae nada para esto: el puerto va en `domain/` con value objects y el adaptador con su traductor en `infrastructure/` (ver `ddd-context-mapping`).

## Tests

Prueba que la fábrica produce objetos válidos y que aplica las reglas de creación [PHP: Factories]. Con datos realistas:

```ts
import { describe, expect, it } from 'vitest';
import { FixedClock } from '@archi-code/ddd/infrastructure';

const clock = new FixedClock('2026-03-01T09:30:00Z');
const lines = OrderLines.fromPrimitives({
  items: [{ sku: 'MUG-350', quantity: 2, unitPrice: { amount: 850, currency: 'EUR' } }],
});
const address = ShippingAddress.fromPrimitives({
  street: 'Calle Mayor 1',
  city: 'Huelva',
  country: 'ES',
});

describe('Customer.placeOrder', () => {
  it('places a pending order for the customer', () => {
    const customer = Customer.create(
      CustomerId.generate(),
      new CustomerName('Ana'),
      new Email('ana@example.com'),
      clock,
    );
    const order = customer.placeOrder(OrderId.generate(), lines, address, clock);
    expect(order.customerId.equals(customer.id)).toBe(true);
    expect(order.pullDomainEvents().map((event) => event.eventName)).toEqual(['order.created']);
  });

  it('refuses an order from a blocked customer', () => {
    const blocked = Customer.fromPrimitives({
      id: '5f1c2e3d-4b6a-4c8d-9e0f-1a2b3c4d5e6f',
      name: 'Ana',
      email: 'ana@example.com',
      blocked: true,
      createdAt: new Date('2026-01-10T08:00:00Z'),
      updatedAt: new Date('2026-02-01T08:00:00Z'),
    });
    expect(() => blocked.placeOrder(OrderId.generate(), lines, address, clock)).toThrow(
      BlockedCustomerCannotOrder,
    );
  });
});
```

## Cuándo no

* Para reconstituir desde base de datos: eso es `static fromPrimitives(primitives)`, que el repositorio llama directamente (`Order.fromPrimitives(row.primitives)`; la versión de la fila la recuerda el repositorio en su `WeakMap`, no el agregado), sin reglas de creación ni eventos.
* "Fábricas" genéricas que reciben un DTO y rellenan campos: un constructor con setters disfrazado.
