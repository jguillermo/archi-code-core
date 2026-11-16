# Entidades en TypeScript

## Qué es

Lo que importa por su individualidad y cambia sin dejar de ser lo mismo [IDDD cap. 5]. Antes, comprueba si es un valor; si solo se editan datos, CRUD puede bastar [IDDD cap. 5].

* Empieza por la identidad y cómo encontrarla; luego el comportamiento esencial con nombres del lenguaje (`activate()`, no `setActive(boolean)`); el lenguaje también son adjetivos y verbos, no solo sustantivos [IDDD cap. 5].

## Identidad

| Estrategia [IDDD cap. 5; PHP: Entities] | Cuándo | Cuidado |
|---|---|---|
| La aporta el usuario | El negocio exige un código legible | Única pero incorrecta; guárdala como atributo y usa otra identidad |
| La genera la aplicación | Por defecto | Generador fiable con varios nodos |
| La genera la persistencia | Secuencias heredadas | Llega tarde; un viaje a la base por id |
| La asigna otro contexto | El concepto nace fuera (CRM) | Sincronización por eventos; úsala poco |

La del usuario u otro contexto es un `Required(StringType)` con nombre y reglas (`AggregateRoot<CampaignCode>`) `[Fuera de los libros: convención de @archi-code/ddd]`.

* **Temprana**: tardía, el evento de creación sale sin id y varios objetos nuevos parecen iguales [IDDD cap. 5]. El caso de uso genera el id (`OrderId.generate()`) y lo pasa a `create`; nunca el repositorio, que solo obtiene y persiste (sin `nextId()`) `[Fuera de los libros: convención de @archi-code/ddd]`.
* **Sustituta**: si la base exige su clave, otra identidad oculta al modelo [IDDD cap. 5]; aquí vive solo en el repositorio, como la `version`, nunca en `toPrimitives()` `[Fuera de los libros: convención de @archi-code/ddd]`.
* **Estable**: se pasa a `super(id)` y queda `readonly id`; no se redeclara [IDDD cap. 5].

## Implementación

`[Fuera de los libros: convención de @archi-code/ddd]` `Entity<Id>` (de `@archi-code/ddd/domain`) guarda `readonly id` y compara por clase e id; `AggregateRoot<Id>` añade `record()` y `pullDomainEvents()`. La versión no está en el agregado: la recuerda el repositorio en un `WeakMap`.

Una entidad hija (se busca por su id dentro del agregado) extiende `Entity`, y sus métodos solo los llama la raíz [IDDD cap. 5 y 10]:

```ts
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
```

No tiene eventos, `create` ni conversión propia: la raíz la construye y la convierte. Si nadie la busca por id, es un `Composite`.

## Creación y reconstitución

Dos caminos para que cargar no repita reglas ni eventos `[Fuera de los libros como patrón explícito; IDDD lo resuelve con acceso por campo del ORM]`. Los libros usan constructor privado y fábrica con nombre [IDDD cap. 11]; aquí `[Fuera de los libros: convención de @archi-code/ddd]`:

* Constructor público que solo asigna.
* `static create(id, …valueObjects)`: estado inicial, invariantes de creación y `<Agregado>CreatedDomainEvent`.
* `static fromPrimitives(PrimitiveTypes<X>)`: técnico, solo para repositorios; rehace cada value object (que vuelve a validar), sin reglas ni eventos; `toPrimitives()` devuelve datos planos.
* Cada cambio es un método con nombre que actualiza `_updatedAt` con `UpdatedAt.now()` en `touch()`; nunca `new Date()` ni la hora como parámetro. Eventos sin fecha: `occurredOn` lo pone el bus.
* Campos: `readonly` público o `private _campo` con getter sin `_`; `createdAt` y `_updatedAt` los últimos. Derivados como métodos (`isBlocked()`).
* Un método pedido por un usuario lanza un error de negocio; uno que se repite sin efecto (bloquear un cliente ya bloqueado) es idempotente.

La clase completa (`Order`) está en `ddd-skills/ddd-agregados/references/implementacion-ts.md`.

## Historial y roles

* Si los cambios importan al negocio, un evento por comando relevante y un almacén de eventos [IDDD cap. 5]; ver `ddd-skills/ddd-eventos-dominio/GUIA.md`.
* Varios roles de un objeto suelen ser contextos distintos (Cliente en Ventas, Destinatario en Almacén) [IDDD cap. 5].
