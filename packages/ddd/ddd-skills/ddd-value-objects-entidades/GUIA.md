# Value Objects y entidades

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Los ejemplos están escritos con la API de `@archi-code/ddd` (las clases de su `src`) y se copian tal cual. Las guías deciden el diseño; la forma del código (carpetas y nombres, eventos, constructor y `create` del agregado, casos de uso de usuario y por reacción) la fija `ddd-skills/archi-code-ddd/`, que manda si un ejemplo difiere. El paquete se aparta de los libros donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]`; cualquier otra discrepancia sobre una regla de DDD es un defecto del paquete.
>
> **Cuándo consultar esta guía.** Diseño táctico DDD de Value Objects y entidades en TypeScript. Decide si un concepto es value object o entidad, cómo implementar value objects inmutables con igualdad por valor y comportamiento sin efectos secundarios (Money, identificadores, rangos, direcciones, tipos estándar y estados), cómo diseñar entidades con identidad estable y comportamiento con nombres del negocio en lugar de setters, estrategias y momento de generación de identidad, los tres niveles de validación (atributo, objeto completo, composición) y cómo persistir value objects sin que la base de datos deforme el modelo. Consúltala siempre que se cree o revise una clase del dominio, aparezcan primitivos sueltos (string para emails, number para dinero), getters y setters públicos, dudas sobre igualdad, ids o validaciones, o se pregunte "¿esto es una entidad?", aunque no se mencione DDD.

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* Un value object es una subclase con nombre de un tipo del paquete (`class Email extends Required(StringType) {}`) con sus reglas en `@Validations` (de `@archi-code/validation`): se crea con `new` y su constructor lo deja siempre válido; no hay factorías `of()` ni `assertValid()`, y la normalización va en `filter`.
* Un valor de varios atributos (`Money`, `DateRange`, `OrderLine`, `OrderLines`) es `Composite({...})`, con las reglas que combinan campos como `custom`; un estado, un único fichero `<Enum>Type.ts` con el enum, `<Enum>Option extends EnumType` y `<Enum>Type extends Required(<Enum>Option)`; un id, `IdType`, generado por el propio value object (`OrderId.generate()`) o derivado de otro agregado con `UuidType.fromValue` (`PaymentId.forOrder(order)`), nunca por el repositorio; lo calcula el caso de uso y lo recibe `create`. Una referencia a un agregado de otro contexto es un `UuidType` propio (`OrderReference extends Required(UuidType)`), nunca la clase de id del otro contexto.
* Cada clase va en su fichero de `domain/value-object/` (PascalCase, el nombre de la clase) y cada contexto declara los suyos aunque otro tenga uno parecido.
* `Money` va en céntimos enteros (`Cents`, `Required(NumberType)` con `isInt`) en lugar de `bigint`: exacto hasta `Number.MAX_SAFE_INTEGER` (9.007.199.254.740.991 céntimos); el paquete no tiene tipo `bigint`.
* Los errores de una entrada se recogen con `ValueObjectBuilder.build({...})` y `ValidationException.errors`, no con un manejador de notificación.
* Un value object es opcional por defecto (`value: T | null`) y `Required(XType)` lo hace obligatorio. Los libros crean siempre el valor con contenido y modelan lo opcional en el campo (`reservation: ReservationId | null`); con el paquete valen las dos formas.
* La identidad de una entidad o raíz siempre es un value object obligatorio (`IdType` o `Required(...)`): un id sin valor lanza `RequiredValueException`, así dos entidades nuevas nunca son iguales por un id vacío [IDDD cap. 5].
* Todo el estado de un agregado es value objects (también un booleano), cada campo guardado tiene un getter público con su nombre sin `_` y los valores derivados son métodos, nunca getters. El constructor del agregado es público y solo asigna; se crea con `static create(id, …valueObjects, clock)` y se reconstituye con `static fromPrimitives(PrimitiveTypes<X>)` con su `toPrimitives()`, que el repositorio llama directamente y cuyo viaje de ida y vuelta prueba el spec del agregado (nada lo comprueba en ejecución). Los libros solo piden getters donde hacen falta y un mapper en infraestructura.

Dos piezas básicas del modelo. Vernon insiste en un sesgo concreto: **modela con value objects siempre que puedas**. Incluso una entidad debería ser sobre todo un contenedor de value objects, no de entidades hijas, porque los valores son más fáciles de crear, probar, usar, optimizar y mantener [IDDD cap. 6].


## Paso 1. ¿Value object o entidad?

Aplica estas preguntas en orden [IDDD cap. 5 y cap. 6]:

1. ¿Importa distinguir **este** ejemplar de cualquier otro, aunque todos sus atributos coincidan, y seguirlo a lo largo de cambios? Sí → **entidad**.
2. Si no, comprueba las características de valor. Si cumple la mayoría → **value object**:
   * mide, cuantifica o describe algo del dominio (no es una cosa en sí);
   * puede ser inmutable;
   * forma un todo conceptual con atributos que solo tienen sentido juntos;
   * se reemplaza entero cuando cambia la descripción;
   * se compara por igualdad de valor;
   * ofrece comportamiento sin efectos secundarios.
3. ¿Te inclinas por entidad solo porque la base de datos lo guarda en su propia tabla? Entonces sigue siendo un value object. El modelo de datos se subordina al de dominio, no al revés [IDDD cap. 6].

Si dudas, empieza por value object: es más barato pasar de valor a entidad que deshacer una red de entidades [IDDD cap. 6].

| Concepto | Decisión típica | Por qué |
|---|---|---|
| Importe con moneda | Value object `Money` | Cuantifica; dos "17,00 €" son intercambiables |
| Dirección de envío de un pedido | Value object | Describe el pedido; si cambia, se reemplaza entera |
| Dirección en una agenda de clientes con historial y verificación | Puede ser entidad | Se sigue su ciclo de vida |
| Línea de pedido | Normalmente value object | Se identifica por su producto dentro del pedido |
| Pedido, Cliente, Pago | Entidad (y raíz de agregado) | Ciclo de vida e identidad propios |
| `OrderId`, `CustomerId` | Value object que contiene la identidad | Inmutable y estable [IDDD cap. 5] |
| Estado del pedido | Tipo estándar como value object | Describe el tipo de estado y puede llevar comportamiento [IDDD cap. 6] |

## Paso 2. Implementar

* Value objects: `ddd-skills/ddd-value-objects-entidades/references/value-objects-ts.md`. Qué clase del paquete usar en cada caso y ejemplos de `Money`, identificadores, `Email`, `DateRange`, colecciones de valores y estados.
* Entidades: `ddd-skills/ddd-value-objects-entidades/references/entidades-ts.md`. Identidad, `Entity` y `AggregateRoot`, constructor completo, comportamiento con nombres del lenguaje, protección de invariantes, reconstitución con `fromPrimitives`.

Reglas mínimas que no se negocian (los nombres de los métodos son interfaces que revelan intención, ver Paso 5):

**Value objects**
* Inmutables: propiedades `readonly`, sin métodos que muten. Las operaciones devuelven nuevas instancias [IDDD cap. 6].
* Válidos desde su creación: el constructor rechaza estados imposibles (`Required(...)` y `@Validations`) [IDDD cap. 5; PHP: Value Objects].
* Igualdad por valor con `equals`, que el paquete ya da (clase y valor; fechas por instante, listas por contenido); en TypeScript `===` compara referencias `[Fuera de los libros]`.
* Los métodos reciben otros value objects, no entidades, para garantizar que no hay efectos secundarios [IDDD cap. 6].
* Nada de primitivos sueltos para conceptos del dominio: un `string` no puede tener comportamiento del negocio [IDDD cap. 6; PHP: Entities, "Objects vs. Primitive Types"].

**Entidades**
* Identidad estable, protegida contra cambios: se pasa a `super(id)` y queda `readonly` [IDDD cap. 5].
* Igualdad por identidad: `equals` de `Entity` y `AggregateRoot` compara clase e id.
* Sin setters públicos: métodos con verbos del negocio que protegen reglas: `backlogItem.commitTo(sprint)` y no `setSprintId(...)` + `setStatus(Committed)`, que deja la regla en cada cliente y el objeto a medias [IDDD cap. 1 y cap. 5].
* Diseño inicial mínimo: identidad, lo que sirve para encontrarla y el comportamiento esencial con los atributos que ese comportamiento necesita. El resto, después [IDDD cap. 5].

## Paso 3. Identidad

Elige la estrategia con `ddd-skills/ddd-value-objects-entidades/references/entidades-ts.md` (sección Identidad). Resumen [IDDD cap. 5; PHP: Entities]:

| Estrategia | Riesgo principal |
|---|---|
| La aporta el usuario | Única pero incorrecta; cambiarla después es caro |
| La genera la aplicación (UUID) | Ninguno relevante; requiere un generador fiable |
| La genera la base de datos (secuencia) | Llega tarde: el evento de creación sale sin id, y los objetos nuevos parecen iguales en colecciones |
| La asigna otro contexto | Sincronización con el origen; la más compleja |

Recomendación por defecto: identidad generada por la aplicación, **temprana** (antes de persistir), generada por el propio value object de identidad (`OrderId.generate()`), nunca por el repositorio [IDDD cap. 5 para la identidad temprana; `[Fuera de los libros: convención de @archi-code/ddd]` para quién la genera]. Si conviene orden temporal en índices, `new OrderId(uuidv7())`: `IdType` acepta cualquier versión de UUID `[Fuera de los libros]`.

## Paso 4. Validación en tres niveles

[IDDD cap. 5; PHP: Entities]

1. **Atributo:** en el constructor del value object (`Required(...)` y `@Validations`).
2. **Objeto completo:** reglas que combinan atributos (las de un valor de varios atributos, reglas `custom` de su `Composite`). IDDD sugiere un validador separado cuando esa validación cambia más que la entidad.
3. **Composición:** reglas sobre varios objetos o agregados. Un servicio de dominio que recibe lo cargado o lee lo necesario con `AggregateFinder`.

Detalle, cómo acumular todos los errores (`ValueObjectBuilder.build` en lugar del patrón de notificación) y qué validar en la interfaz frente al dominio en `ddd-skills/ddd-value-objects-entidades/references/validacion.md`.

## Paso 5. Diseño flexible y Specification

Revisa el diseño con los patrones de diseño flexible (Supple Design): interfaces que revelan intención, funciones sin efectos secundarios, aserciones, contornos conceptuales, clases autónomas y clausura de operaciones [IDDD cap. 5 y cap. 6 aplican varios]. Cuando una regla tiene nombre en el negocio, se usa en varios sitios o se combina con otras, modélala como **Specification** (`Specification<T>` de `@archi-code/ddd/domain`) para validar, seleccionar o construir [IDDD cap. 5; PHP: Repositories]. Guía y código en `ddd-skills/ddd-value-objects-entidades/references/specification-y-diseno-flexible.md`.

## Paso 6. Persistencia sin fugas

Cómo guardar value objects (columnas embebidas, JSON, tabla propia para colecciones) sin convertirlos en entidades del modelo: `ddd-skills/ddd-value-objects-entidades/references/persistencia-valores.md`. La regla: diseña el modelo de datos al servicio del modelo de dominio [IDDD cap. 6]. Con el paquete, el repositorio parte de `order.toPrimitives()` (y carga con `Order.fromPrimitives(...)`, recordando la versión de la fila en su propio `WeakMap`, nunca en el agregado) y decide en infraestructura cómo reparte los primitivos en columnas.

## Señales de alarma

* Clases con todos los campos públicos y `get`/`set` por cada uno: modelo anémico [IDDD cap. 1].
* `amount: number` para dinero, `email: string`, `status: string`.
* Métodos `update(dto)` que copian campos del DTO a la entidad.
* Entidades hijas con id propio que nadie busca por ese id (deberían ser valores).
* `equals` que compara ids `undefined` de objetos aún no guardados [IDDD cap. 5].
* Clases base propias (`ValueObject`, `Entity`, `deepEqual`) escritas en el proyecto: vienen del paquete. Tampoco factorías `of()`: un value object se crea con `new`.
* Getters calculados (`get total()`) en agregados, entidades o composites: rompen `toPrimitives()`; escribe un método.
* Un value object con un método que modifica una entidad recibida por parámetro [IDDD cap. 6].
* Validaciones de negocio repetidas en controlador, DTO y entidad, con criterios distintos.

## Ejemplo

`ddd-skills/ddd-value-objects-entidades/references/ejemplo-ecommerce.md` diseña `Money`, `Quantity`, `OrderLine`, `OrderLines`, `ShippingAddress` y `OrderStatus`, y explica por qué `Order` es una entidad (la clase completa, con sus límites de agregado, está en `ddd-skills/ddd-agregados/references/implementacion-ts.md`; los límites se deciden en `ddd-skills/ddd-agregados/GUIA.md`).

## Siguiente guía

* Dónde termina cada objeto y qué se guarda junto → `ddd-skills/ddd-agregados/GUIA.md`.
* Cómo se guardan → `ddd-skills/ddd-repositorios-persistencia/GUIA.md`.
