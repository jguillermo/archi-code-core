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
* **Temprana** (al construir): el id se genera antes de crear la entidad y se pasa al constructor [IDDD cap. 5]. IDDD prefiere esta opción frente a hacer `equals` por atributos.
* Lo genera el propio value object de identidad, nunca el repositorio: el repositorio solo obtiene y persiste, sin `nextId()` `[Fuera de los libros: convención de @archi-code/ddd]`.

```ts
import { IdType } from '@archi-code/ddd/domain';

export class OrderId extends IdType<'OrderId'> {}

const order = Order.place(OrderId.generate(), customerId, lines, shippingAddress, clock);
```

`XId.generate()` crea un value object de la clase sobre la que se llama (`OrderId.generate()` es un `OrderId`) con un UUID v4. Si conviene orden temporal en índices, `new OrderId(uuidv7())` `[Fuera de los libros]`.

### Identidad sustituta

Si el ORM o la base exige su propia clave (un autoincremental), usa dos identidades: la del dominio y una sustituta para la persistencia, oculta al modelo y a sus clientes [IDDD cap. 5]. Con el paquete, la sustituta vive solo en el repositorio: se guarda junto a los primitivos (como la `version`), nunca dentro de `toPrimitives()` ni como campo del agregado.

### Estabilidad

La identidad no cambia durante la vida de la entidad. IDDD la protege con un setter interno que solo permite asignarla una vez [IDDD cap. 5]. Con el paquete, el id se pasa a `super(id)` y queda como `readonly id`; no se redeclara (`_id` + getter). Además es siempre un value object obligatorio (`IdType` o `Required(...)`): un id sin valor lanza `RequiredValueException`, así que dos entidades nuevas nunca son iguales por un id vacío [IDDD cap. 5].

## Patrón de implementación

No se escribe una clase base `Entity`: viene de `@archi-code/ddd/domain`. `Entity<Id>` solo guarda `readonly id` y compara por clase e id; `AggregateRoot<Id, Event>` la extiende y añade eventos (`record()`, `pullDomainEvents()`) y la `version` para concurrencia optimista, que solo tocan los repositorios.

Una raíz de agregado extiende `AggregateRoot`. Una entidad hija (una parte con identidad propia dentro del agregado, que se busca por ese id) extiende `Entity`, guarda su id local y value objects, y sus métodos de negocio solo los llama su raíz [IDDD cap. 5 y cap. 10]:

```ts
import { BooleanType, Entity, NumberType, Required, StringType } from '@archi-code/ddd/domain';
import { DomainException } from '@archi-code/ddd/exceptions';

export class SeatNumber extends Required(NumberType) {}
export class SeatLabel extends Required(StringType) {}
export class Sold extends Required(BooleanType) {}

export class Seat extends Entity<SeatNumber> {
  constructor(
    id: SeatNumber,
    private _label: SeatLabel,
    readonly sold: Sold,
  ) {
    super(id);
  }

  get label(): SeatLabel {
    return this._label;
  }

  relabel(label: SeatLabel): void {
    if (this.sold.value) {
      throw new DomainException(`Seat ${this.id.value} is already sold`, ['ROOM001']);
    }
    this._label = label;
  }
}

new Seat(new SeatNumber(7), new SeatLabel('A1'), new Sold(false)).equals(
  new Seat(new SeatNumber(7), new SeatLabel('B7'), new Sold(true)),
); // true: misma clase y mismo id
```

Si nadie busca la parte por su id (las líneas de un pedido), no es una entidad hija sino un `Composite` (`ddd-skills/ddd-value-objects-entidades/references/value-objects-ts.md`, sección 7).

### Creación frente a reconstitución

Separar dos caminos evita que la carga desde base de datos vuelva a disparar reglas de creación o eventos `[Fuera de los libros como patrón explícito; IDDD lo resuelve con acceso por campo del ORM]`. Con el paquete, los dos caminos son una factoría de negocio y `static fromPrimitives(primitives: PrimitiveTypes<X>)`, con su `toPrimitives()` para guardar `[Fuera de los libros: convención de @archi-code/ddd]`:

```ts
import { Validations } from '@archi-code/validation';
import { AggregateRoot, EnumType, EventBase, Required, StringType } from '@archi-code/ddd/domain';
import type { EventMetadata, PrimitiveTypes } from '@archi-code/ddd/domain';
import { DomainException } from '@archi-code/ddd/exceptions';

export class CustomerName extends Required(StringType) {}

@Validations([{ validator: 'isLength', properties: { min: 3, max: 200 } }])
export class BlockReason extends Required(StringType) {}

export enum CustomerState {
  Active = 'active',
  Blocked = 'blocked',
}

export class CustomerStateType extends EnumType<CustomerState> {
  protected getEnum(): typeof CustomerState {
    return CustomerState;
  }
}

export class CustomerStatus extends Required(CustomerStateType) {
  isBlocked(): boolean {
    return this.value === CustomerState.Blocked;
  }
}

export class CustomerBlocked extends EventBase {
  static readonly eventName = 'CustomerBlocked';

  constructor(
    customerId: string,
    readonly reason: string,
    metadata?: EventMetadata,
  ) {
    super(customerId, metadata);
  }
}

export class BlockedCustomerCannotChangeEmail extends DomainException {
  constructor(customerId: string) {
    super(`Customer ${customerId} is blocked and cannot change the email`, ['CUS001']);
  }
}

export class Customer extends AggregateRoot<CustomerId, CustomerBlocked> {
  private constructor(
    id: CustomerId,
    private _name: CustomerName,
    private _email: Email,
    private _status: CustomerStatus,
  ) {
    super(id);
  }

  static register(id: CustomerId, name: CustomerName, email: Email): Customer {
    return new Customer(id, name, email, new CustomerStatus(CustomerState.Active));
  }

  static fromPrimitives(primitives: PrimitiveTypes<Customer>): Customer {
    return new Customer(
      new CustomerId(primitives.id),
      new CustomerName(primitives.name),
      new Email(primitives.email),
      new CustomerStatus(primitives.status),
    );
  }

  get name(): CustomerName {
    return this._name;
  }

  get email(): Email {
    return this._email;
  }

  get status(): CustomerStatus {
    return this._status;
  }

  changeEmail(email: Email): void {
    if (this._status.isBlocked()) {
      throw new BlockedCustomerCannotChangeEmail(this.id.value);
    }
    this._email = email;
  }

  block(reason: BlockReason, clock: { now(): Date }): void {
    if (this._status.isBlocked()) {
      return;
    }
    this._status = new CustomerStatus(CustomerState.Blocked);
    this.record(new CustomerBlocked(this.id.value, reason.value, { clock }));
  }

  toPrimitives(): PrimitiveTypes<Customer> {
    return {
      id: this.id.value,
      name: this._name.value,
      email: this._email.value,
      status: this._status.value,
    };
  }
}
```

`CustomerId` y `Email` son los de `ddd-skills/ddd-value-objects-entidades/references/value-objects-ts.md`.

Fíjate en:
* Constructor privado y dos factorías con nombre: `register` (lenguaje del negocio, puede registrar eventos) y `fromPrimitives` (técnica, solo para repositorios: rehace cada value object desde su primitivo, que vuelve a validar, y no registra nada).
* Ningún setter; cada cambio es un comportamiento con nombre y sus reglas. `block` es idempotente y registra `CustomerBlocked` con el reloj que recibe, nunca con `new Date()`.
* Todos los atributos son value objects; cambiar el correo es reemplazar un `Email`.
* Getters solo para lo que los clientes necesitan leer, dicen los libros. Con el paquete, cada campo que se guarda tiene un getter público con su nombre sin `_`, porque `toPrimitives()` y `AggregateMapper` los leen `[Fuera de los libros: convención de @archi-code/ddd]`. Los valores derivados son métodos (`isBlocked()`), nunca getters.
* El agregado no declara `version` ni la incluye en `toPrimitives()`: la lleva la base y la gestionan los repositorios.

## Seguimiento de cambios

Una entidad no tiene por qué guardar su historial. Si ciertos cambios importan al negocio, la forma práctica es un evento de dominio por cada comando relevante y un almacén de eventos [IDDD cap. 5]. Ver `ddd-skills/ddd-eventos-dominio/GUIA.md`.

## Roles

Un mismo objeto puede jugar varios roles; IDDD discute modelarlo con interfaces por rol y advierte de que se puede complicar [IDDD cap. 5]. Antes de hacerlo, revisa si los roles pertenecen a contextos distintos: suele ser el caso (Cliente en Ventas, Destinatario en Almacén).
