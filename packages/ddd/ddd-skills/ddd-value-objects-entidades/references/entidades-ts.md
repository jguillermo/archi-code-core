# Entidades en TypeScript

Código de la raíz y de las entidades hijas (`AggregateRoot`, `Entity`, constructor, `create`, `fromPrimitives`/`toPrimitives`, campos y getters, hora actual): `ddd-skills/archi-code-ddd/aggregates.md`, apartado Code. Aquí queda el diseño.

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

* **Temprana**: tardía, el evento de creación sale sin id y varios objetos nuevos parecen iguales [IDDD cap. 5]. El caso de uso genera el id y lo pasa a `create`; nunca el repositorio, que solo obtiene y persiste (sin `nextId()`) `[Fuera de los libros: convención de @archi-code/ddd]`.
* **Sustituta**: si la base exige su clave, otra identidad oculta al modelo [IDDD cap. 5]; aquí vive solo en el repositorio, como la `version`, nunca en `toPrimitives()` `[Fuera de los libros: convención de @archi-code/ddd]`.
* **Estable**: se fija al crear y no cambia [IDDD cap. 5].

## Entidad hija

Una parte con identidad propia dentro del agregado, que se busca por su id local; sus métodos solo los llama la raíz [IDDD cap. 5 y 10]. Si nadie la busca por id, es un valor (`Composite`) [IDDD cap. 6]. Código: `ddd-skills/archi-code-ddd/aggregates.md` (`OrderLine extends Entity<LineNumber>`).

## Creación y reconstitución

Dos caminos para que cargar no repita reglas ni eventos `[Fuera de los libros como patrón explícito; IDDD lo resuelve con acceso por campo del ORM]`. Los libros usan constructor privado y fábrica con nombre [IDDD cap. 11]; aquí un constructor público que solo asigna, `create` para nacer (reglas de creación y evento) y `fromPrimitives` para cargar (solo rehace los value objects, que vuelven a validar) `[Fuera de los libros: convención de @archi-code/ddd]`. Forma: `ddd-skills/archi-code-ddd/aggregates.md`.

* Un método pedido por un usuario lanza un error de negocio; uno que se repite sin efecto (bloquear un cliente ya bloqueado) es idempotente.

El diseño de `Order` está en `ddd-skills/ddd-agregados/references/implementacion-ts.md`; su código, en `ddd-skills/archi-code-ddd/aggregates.md`.

## Historial y roles

* Si los cambios importan al negocio, un evento por comando relevante y un almacén de eventos [IDDD cap. 5]; ver `ddd-skills/ddd-eventos-dominio/GUIA.md`.
* Varios roles de un objeto suelen ser contextos distintos (Cliente en Ventas, Destinatario en Almacén) [IDDD cap. 5].
