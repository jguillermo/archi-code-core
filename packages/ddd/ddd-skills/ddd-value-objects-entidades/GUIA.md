# Value Objects y entidades

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Valor o entidad, value objects inmutables, entidades con comportamiento, identidad, validación y persistencia de valores. La forma del código la fija `ddd-skills/archi-code-ddd/`.

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

La forma del código está en `ddd-skills/archi-code-ddd/value-objects.md` (value objects, ids, estados, listas, `Composite`, `Money`), `ddd-skills/archi-code-ddd/aggregates.md` (entidades hijas, `create`, `fromPrimitives`/`toPrimitives`), `ddd-skills/archi-code-ddd/domain-services.md` (`Specification`), `ddd-skills/archi-code-ddd/events-and-errors.md` (errores de negocio) y `ddd-skills/archi-code-ddd/criteria.md` (selecciones). Diferencias con los libros:

* Todo el estado del agregado son value objects, también un booleano; en los libros envolver un atributo sin reglas es opcional [IDDD cap. 6].
* Un value object es opcional por defecto y uno obligatorio se declara así; los libros modelan lo opcional en el campo (`X | null`). Valen las dos.
* El id lo genera su propio value object (o se deriva de otro dato) y lo pasa el caso de uso; nunca el repositorio.
* Un agregado de otro contexto se referencia con un tipo propio del contexto que lo guarda, nunca con la clase de id del otro.
* `Money` en céntimos enteros, no `bigint`.
* Todos los errores de una entrada se recogen a la vez con una utilidad del paquete, no con un manejador de notificación [IDDD cap. 5; PHP: Entities].
* Constructor público que solo asigna y fábrica `create`, no constructor privado [IDDD cap. 11]; el agregado se convierte a sí mismo a primitivos, sin mapper, con test de ida y vuelta.
* La versión no está en la entidad: la recuerda el repositorio.
* Sin consultas de negocio con `Specification` en el repositorio [PHP: Repositories]: una selección es un `Criteria` o un read model.

## Paso 1. ¿Valor o entidad?

[IDDD cap. 5 y 6]
1. ¿Hay que distinguir este ejemplar y seguirlo en sus cambios? → **entidad**.
2. Si no, ¿mide o describe, es inmutable, forma un todo, se reemplaza entero, se compara por valor, no tiene efectos secundarios? → **value object**.
3. ¿Entidad solo porque tiene tabla? Sigue siendo valor: el modelo de datos se subordina [IDDD cap. 6].

Ante la duda, valor; una entidad es sobre todo un contenedor de valores [IDDD cap. 6].

Una parte del agregado que nadie busca por id es un valor; en cuanto un caso de uso cambia una por su número (una línea de pedido), es entidad hija con identidad local [IDDD cap. 6 y 10].

## Paso 2. Implementar

Diseño en `ddd-skills/ddd-value-objects-entidades/references/value-objects-ts.md` y `ddd-skills/ddd-value-objects-entidades/references/entidades-ts.md`; el código, en `ddd-skills/archi-code-ddd/value-objects.md` y `ddd-skills/archi-code-ddd/aggregates.md`.

**Value objects**
* Inmutables; las operaciones devuelven instancias nuevas [IDDD cap. 6].
* Válidos desde su creación [IDDD cap. 5; PHP: Value Objects].
* Igualdad por valor con `equals` del paquete; `===` compara referencias `[Fuera de los libros]`.
* Sus métodos reciben valores, no entidades [IDDD cap. 6].
* Sin primitivos sueltos para conceptos del dominio [IDDD cap. 6; PHP: Entities].

**Entidades**
* Identidad estable: `super(id)`, `readonly` [IDDD cap. 5].
* Igualdad por clase e id (`equals` de `Entity`).
* Sin setters: verbos del negocio (`commitTo(sprint)`, no `setSprintId` + `setStatus`) [IDDD cap. 1 y 5].
* Diseño inicial mínimo: identidad, cómo encontrarla y comportamiento esencial [IDDD cap. 5].

## Paso 3. Identidad

[IDDD cap. 5; PHP: Entities] La aporta el usuario (puede ser incorrecta), la aplicación (por defecto), la base de datos (llega tarde) u otro contexto (sincronización). Por defecto, generada por la aplicación y **temprana**, por el propio value object (`OrderId.generate()`) `[Fuera de los libros: convención de @archi-code/ddd]`; `new OrderId(uuidv7())` si conviene orden temporal `[Fuera de los libros]`.

## Paso 4. Validación en tres niveles

[IDDD cap. 5; PHP: Entities] Atributo (constructor del value object), objeto completo (reglas `custom`, o un validador aparte si esa validación cambia más que la entidad), composición (servicio de dominio con lo cargado). Detalle en `ddd-skills/ddd-value-objects-entidades/references/validacion.md`.

## Paso 5. Diseño flexible y Specification

Interfaces que revelan intención, funciones sin efectos, clausura de operaciones [IDDD cap. 5 y 6]. Regla con nombre que se combina → `Specification<T>` [IDDD cap. 5; PHP: Repositories]. Ver `ddd-skills/ddd-value-objects-entidades/references/specification-y-diseno-flexible.md`.

## Paso 6. Persistencia

El modelo de datos al servicio del de dominio [IDDD cap. 6]; el repositorio parte de `toPrimitives()` y reparte en columnas en infraestructura. Ver `ddd-skills/ddd-value-objects-entidades/references/persistencia-valores.md`.

## Señales de alarma

* `get`/`set` por cada campo: modelo anémico [IDDD cap. 1].
* `amount: number`, `email: string`, `status: string`; `update(dto)`.
* Entidades hijas que nadie busca por id (deberían ser valores).
* `equals` con ids `undefined` [IDDD cap. 5].
* Clases base propias o factorías `of()`.
* Getters calculados en agregados o composites: rompen `toPrimitives()`.
* Un value object que modifica una entidad recibida [IDDD cap. 6].
* La misma regla repetida en controlador, DTO y entidad.

Ejemplo de Ventas (valor o entidad de cada pieza): `ddd-skills/ddd-value-objects-entidades/references/ejemplo-ecommerce.md`.
