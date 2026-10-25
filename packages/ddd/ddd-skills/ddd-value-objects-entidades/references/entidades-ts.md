# Entidades en TypeScript

## Qué es una entidad

Un concepto que se modela como entidad cuando importa su individualidad: hay que distinguirlo de todos los demás y puede cambiar mucho durante mucho tiempo sin dejar de ser el mismo. Identidad única y mutabilidad son lo que la separa de un value object [IDDD cap. 5].

Antes de crear una, comprueba si el concepto es en realidad un valor. Y si un sistema solo edita datos, un CRUD puede ser la herramienta adecuada; el problema es aplicar CRUD a sistemas complejos que merecen DDD [IDDD cap. 5].

## Descubrir la entidad

* Empieza solo por los atributos que dan identidad y los que sirven para encontrarla; ignora el resto hasta tener eso claro [IDDD cap. 5].
* Luego busca el comportamiento esencial en los requisitos y nómbralo con el lenguaje. En IDDD, "los tenants pueden estar activos o desactivados" lleva a `activate()` y `deactivate()`, no a `setActive(boolean)` [IDDD cap. 5].
* El lenguaje no son solo sustantivos: adjetivos describen y verbos indican lo que las cosas hacen [IDDD cap. 5].

## Identidad

### Estrategias [IDDD cap. 5; PHP: Entities]

| Estrategia | Cuándo | Cuidado |
|---|---|---|
| La aporta el usuario | El negocio exige un identificador legible (código de campaña) | Puede ser única pero incorrecta. Alternativa: guardar el valor del usuario como atributo para búsquedas y usar otra identidad |
| La genera la aplicación | Opción por defecto | Generador fiable también en despliegues con varios nodos |
| La genera la persistencia | Secuencias heredadas | Llega tarde (ver abajo); coste de ir a la base por cada id |
| La asigna otro contexto | El concepto nace fuera (un cliente del CRM) | Sincronización por eventos; úsala lo menos posible |

Con el paquete, la identidad generada por la aplicación es un `IdType` (`class OrderId extends IdType<'OrderId'> {}`); la que aporta el usuario o asigna otro contexto, un `Required(StringType)` con nombre y sus reglas (`CampaignCode`, en `ddd-skills/ddd-value-objects-entidades/references/value-objects-ts.md`, sección 3), usado como `AggregateRoot<CampaignCode>`.

### Momento: temprana o tardía

* **Tardía** (al persistir): el evento de creación se publicaría sin identidad y, si `equals` compara ids, varios objetos nuevos parecerían el mismo en un `Set` [IDDD cap. 5].
* **Temprana** (al construir): el id se genera antes de crear la entidad y se pasa a `create` [IDDD cap. 5]; con el paquete lo calcula el caso de uso. IDDD prefiere esta opción frente a hacer `equals` por atributos.
* Lo genera el propio value object de identidad, nunca el repositorio: el repositorio solo obtiene y persiste, sin `nextId()` `[Fuera de los libros: convención de @archi-code/ddd]`.

```ts
import { IdType } from '@archi-code/ddd/domain';

export class OrderId extends IdType<'OrderId'> {}

const order = Order.create(OrderId.generate(), customerId, lines, shippingAddress, clock);
```

`XId.generate()` crea un value object de la clase sobre la que se llama (`OrderId.generate()` es un `OrderId`) con un UUID v4. Si conviene orden temporal en índices, `new OrderId(uuidv7())` `[Fuera de los libros]`.

### Identidad sustituta

Si el ORM o la base exige su propia clave (un autoincremental), usa dos identidades: la del dominio y una sustituta para la persistencia, oculta al modelo y a sus clientes [IDDD cap. 5]. Con el paquete, la sustituta vive solo en el repositorio: se guarda junto a los primitivos (como la `version`, que también es solo del repositorio), nunca dentro de `toPrimitives()` ni como campo del agregado.

### Estabilidad

La identidad no cambia durante la vida de la entidad. IDDD la protege con un setter interno que solo permite asignarla una vez [IDDD cap. 5]. Con el paquete, el id se pasa a `super(id)` y queda como `readonly id`; no se redeclara (`_id` + getter). Además es siempre un value object obligatorio (`IdType` o `Required(...)`): un id sin valor lanza `RequiredValueException`, así que dos entidades nuevas nunca son iguales por un id vacío [IDDD cap. 5].

## Patrón de implementación

No se escribe una clase base `Entity`: viene de `@archi-code/ddd/domain`. `Entity<Id>` solo guarda `readonly id` y compara por clase e id; `AggregateRoot<Id, Event>` la extiende y añade solo los eventos (`record()`, `pullDomainEvents()`); la versión para concurrencia optimista no está en el agregado, la recuerda cada repositorio en un `WeakMap<Order, number>` `[Fuera de los libros: convención de @archi-code/ddd]`.

Una raíz de agregado extiende `AggregateRoot`. Una entidad hija (una parte con identidad propia dentro del agregado, que se busca por ese id) extiende `Entity`, guarda su id local y value objects, y sus métodos de negocio solo los llama su raíz [IDDD cap. 5 y cap. 10]:

```ts
import { BooleanType, DomainException, Entity, NumberType, Required, StringType } from '@archi-code/ddd/domain';

export class SeatNumber extends Required(NumberType) {}
export class SeatLabel extends Required(StringType) {}
export class Sold extends Required(BooleanType) {}

export class SeatAlreadySold extends DomainException {
  constructor(seatNumber: number) {
    super(`Seat ${seatNumber} is already sold`, ['VEN001']);
  }
}

export class Seat extends Entity<SeatNumber> {
  private _label: SeatLabel;
  readonly sold: Sold;

  constructor(id: SeatNumber, label: SeatLabel, sold: Sold) {
    super(id);
    this._label = label;
    this.sold = sold;
  }

  get label(): SeatLabel {
    return this._label;
  }

  relabel(label: SeatLabel): void {
    if (this.sold.value) {
      throw new SeatAlreadySold(this.id.value);
    }
    this._label = label;
  }
}

new Seat(new SeatNumber(7), new SeatLabel('A1'), new Sold(false)).equals(
  new Seat(new SeatNumber(7), new SeatLabel('B7'), new Sold(true)),
); // true: misma clase y mismo id
```

Una entidad hija no tiene reloj, eventos, `create` ni `toPrimitives`/`fromPrimitives`: la raíz la construye (asignándole su id local) y la convierte. Si nadie busca la parte por su id (las líneas de un pedido), no es una entidad hija sino un `Composite` (`ddd-skills/ddd-value-objects-entidades/references/value-objects-ts.md`, sección 7).

### Creación frente a reconstitución

Separar dos caminos evita que la carga desde base de datos vuelva a disparar reglas de creación o eventos `[Fuera de los libros como patrón explícito; IDDD lo resuelve con acceso por campo del ORM]`. Con el paquete, los dos caminos son `static create(id, …valueObjects, clock)` y `static fromPrimitives(primitives: PrimitiveTypes<X>)`, que llaman al mismo constructor público, con su `toPrimitives()` para guardar `[Fuera de los libros: convención de @archi-code/ddd]`. En `domain/value-object/CustomerStatusType.ts`, el estado:

```ts
import { EnumType, Required } from '@archi-code/ddd/domain';

export enum CustomerStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
}

export class CustomerStatusOption extends EnumType<CustomerStatus> {
  protected getEnum(): typeof CustomerStatus {
    return CustomerStatus;
  }
}

export class CustomerStatusType extends Required(CustomerStatusOption) {}
```

El resto de piezas, cada una en su fichero de `domain/`:

```ts
import { Validations } from '@archi-code/validation';
import { DomainException, EventBase, Required, StringType } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class CustomerName extends Required(StringType) {}

@Validations([{ validator: 'isLength', properties: { min: 3, max: 200 } }])
export class BlockReason extends Required(StringType) {}

export class CustomerBlockedDomainEvent extends EventBase {
  static readonly eventName = 'customer.blocked';

  readonly customerId: string;
  readonly reason: string;

  constructor({
    customerId,
    reason,
    eventId,
    occurredOn,
    clock,
  }: { customerId: string; reason: string } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.customerId = customerId;
    this.reason = reason;
  }
}

export type CustomerEvent = CustomerCreatedDomainEvent | CustomerBlockedDomainEvent;

export class BlockedCustomerCannotChangeEmail extends DomainException {
  constructor(customerId: string) {
    super(`Customer ${customerId} is blocked and cannot change the email`, ['SAL004']);
  }
}
```

`CustomerCreatedDomainEvent` (`'customer.created'`, con `customerId`) se escribe igual. La raíz, en `domain/aggregate/Customer.ts`:

```ts
import { AggregateRoot, CreatedAt, UpdatedAt } from '@archi-code/ddd/domain';
import type { PrimitiveTypes } from '@archi-code/ddd/domain';

interface Clock {
  now(): Date;
}

export class Customer extends AggregateRoot<CustomerId, CustomerEvent> {
  private _name: CustomerName;
  private _email: Email;
  private _status: CustomerStatusType;
  readonly createdAt: CreatedAt;
  private _updatedAt: UpdatedAt;

  constructor(
    id: CustomerId,
    name: CustomerName,
    email: Email,
    status: CustomerStatusType,
    createdAt: CreatedAt,
    updatedAt: UpdatedAt,
  ) {
    super(id);
    this._name = name;
    this._email = email;
    this._status = status;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static create(id: CustomerId, name: CustomerName, email: Email, clock: Clock): Customer {
    const customer = new Customer(
      id,
      name,
      email,
      new CustomerStatusType(CustomerStatus.ACTIVE),
      CreatedAt.now(clock),
      UpdatedAt.now(clock),
    );
    customer.record(new CustomerCreatedDomainEvent({ customerId: customer.id.value, clock }));
    return customer;
  }

  static fromPrimitives(primitives: PrimitiveTypes<Customer>): Customer {
    return new Customer(
      new CustomerId(primitives.id),
      new CustomerName(primitives.name),
      new Email(primitives.email),
      new CustomerStatusType(primitives.status),
      new CreatedAt(primitives.createdAt),
      new UpdatedAt(primitives.updatedAt),
    );
  }

  get name(): CustomerName {
    return this._name;
  }

  get email(): Email {
    return this._email;
  }

  get status(): CustomerStatusType {
    return this._status;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  isBlocked(): boolean {
    return this._status.value === CustomerStatus.BLOCKED;
  }

  changeEmail(email: Email, clock: Clock): void {
    if (this.isBlocked()) {
      throw new BlockedCustomerCannotChangeEmail(this.id.value);
    }
    this._email = email;
    this.touch(clock);
  }

  block(reason: BlockReason, clock: Clock): void {
    if (this.isBlocked()) {
      return;
    }
    this._status = new CustomerStatusType(CustomerStatus.BLOCKED);
    this.touch(clock);
    this.record(
      new CustomerBlockedDomainEvent({ customerId: this.id.value, reason: reason.value, clock }),
    );
  }

  toPrimitives(): PrimitiveTypes<Customer> {
    return {
      id: this.id.value,
      name: this._name.value,
      email: this._email.value,
      status: this._status.value,
      createdAt: this.createdAt.value,
      updatedAt: this._updatedAt.value,
    };
  }

  private touch(clock: Clock): void {
    this._updatedAt = UpdatedAt.now(clock);
  }
}
```

`CustomerId` y `Email` son los de `ddd-skills/ddd-value-objects-entidades/references/value-objects-ts.md`.

Fíjate en:
* Constructor público que solo asigna y dos caminos que lo usan: `create` (fija el estado inicial, comprueba las reglas de creación y registra `CustomerCreatedDomainEvent`) y `fromPrimitives` (técnica, solo para repositorios: rehace cada value object desde su primitivo, que vuelve a validar, y no registra nada). Los libros usan un constructor privado y una fábrica con nombre del negocio [IDDD cap. 11].
* Ningún setter; cada cambio es un comportamiento con nombre y sus reglas, y actualiza `_updatedAt` con el reloj que recibe (la `interface Clock` local: el dominio no importa `/application`). `changeEmail` lo pide un usuario y lanza un error de negocio; `block` es idempotente y registra `CustomerBlockedDomainEvent` con el reloj, nunca con `new Date()`.
* Todos los atributos son value objects; cambiar el correo es reemplazar un `Email`.
* Getters solo para lo que los clientes necesitan leer, dicen los libros. Con el paquete, cada campo que se guarda es `readonly` público o `private _campo` con un getter público con su nombre sin `_`, porque `toPrimitives()` los lee, y `createdAt`/`_updatedAt` van los últimos `[Fuera de los libros: convención de @archi-code/ddd]`. Los valores derivados son métodos (`isBlocked()`), nunca getters.
* El agregado no declara `version` ni la incluye en `toPrimitives()`: la versión es solo del repositorio, que la recuerda por agregado en un `WeakMap` y la guarda junto a los primitivos.

## Seguimiento de cambios

Una entidad no tiene por qué guardar su historial. Si ciertos cambios importan al negocio, la forma práctica es un evento de dominio por cada comando relevante y un almacén de eventos [IDDD cap. 5]. Ver `ddd-skills/ddd-eventos-dominio/GUIA.md`.

## Roles

Un mismo objeto puede jugar varios roles; IDDD discute modelarlo con interfaces por rol y advierte de que se puede complicar [IDDD cap. 5]. Antes de hacerlo, revisa si los roles pertenecen a contextos distintos: suele ser el caso (Cliente en Ventas, Destinatario en Almacén).
