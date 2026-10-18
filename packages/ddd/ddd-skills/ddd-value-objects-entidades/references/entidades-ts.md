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

### Momento: temprana o tardía

* **Tardía** (al persistir): el evento de creación se publicaría sin identidad y, si `equals` compara ids, varios objetos nuevos parecerían el mismo en un `Set` [IDDD cap. 5].
* **Temprana** (al construir): el repositorio ofrece `nextId()` y el id se pasa al constructor [IDDD cap. 5]. IDDD prefiere esta opción frente a hacer `equals` por atributos.

```ts
export interface OrderRepository {
  nextId(): OrderId;
  // ...
}

export class PostgresOrderRepository implements OrderRepository {
  nextId(): OrderId {
    return OrderId.of(`ord-${uuidv7()}`);
  }
}
```

### Identidad sustituta

Si el ORM o la base exige su propia clave (un autoincremental), usa dos identidades: la del dominio y una sustituta para la persistencia, oculta al modelo y a sus clientes [IDDD cap. 5]. En TypeScript, la sustituta vive solo en el mapper de infraestructura.

### Estabilidad

La identidad no cambia durante la vida de la entidad. IDDD la protege con un setter interno que solo permite asignarla una vez [IDDD cap. 5]. En TypeScript basta con `readonly`.

## Patrón de implementación

```ts
export abstract class Entity<Id extends ValueObject<any>> {
  protected constructor(public readonly id: Id) {}

  equals(other: Entity<Id> | null | undefined): boolean {
    return other != null && other.constructor === this.constructor && this.id.equals(other.id);
  }
}
```

### Creación frente a reconstitución

Separar dos caminos evita que la carga desde base de datos vuelva a disparar reglas de creación o eventos `[Fuera de los libros como patrón explícito; IDDD lo resuelve con acceso por campo del ORM]`:

```ts
export class Customer extends Entity<CustomerId> {
  private constructor(
    id: CustomerId,
    private name: PersonName,
    private email: Email,
    private status: CustomerStatus,
  ) {
    super(id);
  }

  /** Nace un cliente: aplica reglas de alta. */
  static register(id: CustomerId, name: PersonName, email: Email): Customer {
    return new Customer(id, name, email, CustomerStatus.Active);
  }

  /** Solo para repositorios: recompone un estado ya válido. */
  static reconstitute(state: { id: CustomerId; name: PersonName; email: Email; status: CustomerStatus }): Customer {
    return new Customer(state.id, state.name, state.email, state.status);
  }

  changeEmail(newEmail: Email): void {
    if (this.status.equals(CustomerStatus.Blocked)) throw new BlockedCustomerCannotChangeEmail(this.id);
    this.email = newEmail;              // reemplazo del valor completo
  }

  block(reason: BlockReason): void {
    if (this.status.equals(CustomerStatus.Blocked)) return;   // idempotente
    this.status = CustomerStatus.Blocked;
  }

  get currentEmail(): Email { return this.email; }
}
```

Fíjate en:
* Constructor privado y dos factorías con nombre: `register` (lenguaje del negocio) y `reconstitute` (técnica, solo para infraestructura).
* Ningún setter; cada cambio es un comportamiento con nombre y sus reglas.
* Los atributos son value objects; cambiar el correo es reemplazar un `Email`.
* Getters solo para lo que los clientes necesitan leer.

## Seguimiento de cambios

Una entidad no tiene por qué guardar su historial. Si los expertos se interesan por ciertos cambios, la forma práctica es un evento de dominio por cada comando relevante y un almacén de eventos [IDDD cap. 5]. Ver `ddd-eventos-dominio`.

## Roles

Un mismo objeto puede jugar varios roles; IDDD discute modelarlo con interfaces por rol y advierte de que se puede complicar [IDDD cap. 5]. Antes de hacerlo, revisa si los roles pertenecen a contextos distintos: suele ser el caso (Cliente en Ventas, Destinatario en Almacén).
