# Value Objects y entidades

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Valor o entidad, value objects inmutables, entidades con comportamiento, identidad, validación y persistencia de valores. La forma del código la fija `ddd-skills/archi-code-ddd/`.

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* Un value object es una subclase con nombre de un tipo del paquete (`class Email extends Required(StringType) {}`) con reglas en `@Validations`; se crea con `new` y siempre es válido. Sin `of()` ni `assertValid()`; la normalización va en `filter`.
* Varios atributos: `Composite({...})` con reglas `custom`. Una línea de pedido es `Composite` si las líneas se reemplazan enteras, y entidad hija (`OrderLine extends Entity<LineNumber>`) si se cambia una por su número. Un estado: un fichero `<Enum>Type.ts` con el enum, `<Enum>Option extends EnumType` y `<Enum>Type extends Required(<Enum>Option)`.
* Un id es `IdType<'OrderId'>`, generado por el value object (`OrderId.generate()`) o derivado con `UuidType.fromValue` (`PaymentId.forOrder(order)`), nunca por el repositorio; lo calcula el caso de uso. Un agregado de otro contexto se referencia con un `UuidType` propio (`OrderReference`), nunca con la clase de id del otro contexto.
* Cada clase en su fichero de `domain/value-object/`; cada contexto declara los suyos.
* `Money` en céntimos enteros (`Cents`), no `bigint`: el paquete no tiene ese tipo.
* Los errores de una entrada se recogen con `ValueObjectBuilder.build`, no con un manejador de notificación.
* Un value object es opcional por defecto (`T | null`) y `Required(...)` lo hace obligatorio; los libros modelan lo opcional en el campo (`X | null`). Valen las dos.
* La identidad es siempre obligatoria: un id vacío lanza `RequiredValueException` [IDDD cap. 5].
* Todo el estado del agregado son value objects (también un booleano) con getter público sin `_`; derivados como métodos; `create`, `fromPrimitives` y `toPrimitives()` con test de ida y vuelta (los libros usan un mapper).

## Paso 1. ¿Valor o entidad?

[IDDD cap. 5 y 6]
1. ¿Hay que distinguir este ejemplar y seguirlo en sus cambios? → **entidad**.
2. Si no, ¿mide o describe, es inmutable, forma un todo, se reemplaza entero, se compara por valor, no tiene efectos secundarios? → **value object**.
3. ¿Entidad solo porque tiene tabla? Sigue siendo valor: el modelo de datos se subordina [IDDD cap. 6].

Ante la duda, valor; una entidad es sobre todo un contenedor de valores [IDDD cap. 6].

## Paso 2. Implementar

Código en `ddd-skills/ddd-value-objects-entidades/references/value-objects-ts.md` y `ddd-skills/ddd-value-objects-entidades/references/entidades-ts.md`.

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
