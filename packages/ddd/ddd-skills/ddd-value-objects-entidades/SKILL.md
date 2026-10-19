# Value Objects y entidades

> Guía de la suite DDD de @archi-code/ddd: se lee solo a través del skill `archi-code-ddd` (packages/ddd/SKILL.md), nunca como skill independiente.

**Cuándo usarla.** Úsala siempre que se cree o revise una clase del dominio, aparezcan primitivos sueltos (string para emails, number para dinero), getters y setters públicos, dudas sobre igualdad, ids o validaciones, o se pregunte "¿esto es una entidad?", aunque no se mencione DDD.

Dos piezas básicas del modelo. Vernon insiste en un sesgo concreto: **modela con value objects siempre que puedas**. Incluso una entidad debería ser sobre todo un contenedor de value objects, no de entidades hijas, porque los valores son más fáciles de crear, probar, usar, optimizar y mantener [IDDD cap. 6].

## Convenciones de la suite DDD

* **Trazabilidad.** Cada regla indica su origen: `[Destilado cap. N]`, `[IDDD cap. N]`, `[PHP: capítulo]`. Lo que no sale de esos libros va marcado `[Fuera de los libros]`. Respeta estas marcas al responder.
* **Idioma.** Responde en el idioma de la persona. El código de ejemplo es TypeScript.
* **Honestidad del modelo.** Si faltan datos para decidir, declara los supuestos.

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

* Value objects: `references/value-objects-ts.md`. Plantillas para `Money`, identificadores, `Email`, `DateRange`, colecciones de valores y estados.
* Entidades: `references/entidades-ts.md`. Identidad, constructor completo, comportamiento con nombres del lenguaje, protección de invariantes, reconstitución desde persistencia.

Reglas mínimas que no se negocian (los nombres de los métodos son interfaces que revelan intención, ver Paso 5):

**Value objects**
* Inmutables: propiedades `readonly`, sin métodos que muten. Las operaciones devuelven nuevas instancias [IDDD cap. 6].
* Válidos desde su creación: el constructor o la factoría rechazan estados imposibles [IDDD cap. 5; PHP: Value Objects].
* Igualdad por valor con un `equals` explícito; en TypeScript `===` compara referencias `[Fuera de los libros]`.
* Los métodos reciben otros value objects, no entidades, para garantizar que no hay efectos secundarios [IDDD cap. 6].
* Nada de primitivos sueltos para conceptos del dominio: un `string` no puede tener comportamiento del negocio [IDDD cap. 6; PHP: Entities, "Objects vs. Primitive Types"].

**Entidades**
* Identidad estable, protegida contra cambios [IDDD cap. 5].
* Igualdad por identidad.
* Sin setters públicos: métodos con verbos del negocio que protegen reglas (ver la comparación `commitTo` frente a `setStatus` en `ddd-descubrimiento-dominio`) [IDDD cap. 1 y cap. 5].
* Diseño inicial mínimo: identidad, lo que sirve para encontrarla y el comportamiento esencial con los atributos que ese comportamiento necesita. El resto, después [IDDD cap. 5].
* Con `@archi-code/ddd`: la raíz extiende `AggregateRoot` y una entidad hija extiende `Entity<Id>`, que solo guarda el id y compara por identidad; la entidad hija tiene su id y sus value objects y **ninguna lógica de negocio**, que vive en la raíz `[Fuera de los libros: convención de @archi-code/ddd]`.

## Paso 3. Identidad

Elige la estrategia con `references/entidades-ts.md` (sección Identidad). Resumen [IDDD cap. 5; PHP: Entities]:

| Estrategia | Riesgo principal |
|---|---|
| La aporta el usuario | Única pero incorrecta; cambiarla después es caro |
| La genera la aplicación (UUID) | Ninguno relevante; requiere un generador fiable |
| La genera la base de datos (secuencia) | Llega tarde: el evento de creación sale sin id, y los objetos nuevos parecen iguales en colecciones |
| La asigna otro contexto | Sincronización con el origen; la más compleja |

Recomendación por defecto: identidad generada por la aplicación, **temprana** (antes de persistir) [IDDD cap. 5]. Con `@archi-code/ddd`, la genera el value object (`OrderId.generate()`), no el repositorio, que solo obtiene y persiste `[Fuera de los libros: convención de @archi-code/ddd]`.

## Paso 4. Validación en tres niveles

[IDDD cap. 5; PHP: Entities]

1. **Atributo:** en la factoría del value object o en la asignación protegida de la entidad.
2. **Objeto completo:** reglas que combinan atributos. IDDD sugiere un validador separado cuando esa validación cambia más que la entidad.
3. **Composición:** reglas sobre varios objetos o agregados. Un servicio de dominio que lee lo necesario por repositorio.

Detalle, patrón de notificación para acumular errores y qué validar en la interfaz frente al dominio en `references/validacion.md`.

## Paso 5. Diseño flexible y Specification

Revisa el diseño con los patrones de diseño flexible (Supple Design): interfaces que revelan intención, funciones sin efectos secundarios, aserciones, contornos conceptuales, clases autónomas y clausura de operaciones [IDDD cap. 5 y cap. 6 aplican varios]. Cuando una regla tiene nombre en el negocio, se usa en varios sitios o se combina con otras, modélala como **Specification** para validar, seleccionar o construir [IDDD cap. 5; PHP: Repositories]. Guía y código en `references/specification-y-diseno-flexible.md`.

## Paso 6. Persistencia sin fugas

Cómo guardar value objects (columnas embebidas, JSON, tabla propia para colecciones) sin convertirlos en entidades del modelo: `references/persistencia-valores.md`. La regla: diseña el modelo de datos al servicio del modelo de dominio [IDDD cap. 6].

## Señales de alarma

* Clases con todos los campos públicos y `get`/`set` por cada uno: modelo anémico [IDDD cap. 1].
* `amount: number` para dinero, `email: string`, `status: string`.
* Métodos `update(dto)` que copian campos del DTO a la entidad.
* Entidades hijas con id propio que nadie busca por ese id (deberían ser valores).
* `equals` que compara ids `undefined` de objetos aún no guardados [IDDD cap. 5].
* Un value object con un método que modifica una entidad recibida por parámetro [IDDD cap. 6].
* Validaciones de negocio repetidas en controlador, DTO y entidad, con criterios distintos.

## Ejemplo

`references/ejemplo-ecommerce.md` diseña `Money`, `Quantity`, `OrderLine`, `ShippingAddress`, `OrderStatus` y la entidad `Order` (todavía sin límites de agregado; eso es `ddd-agregados`).

## Siguiente skill

* Dónde termina cada objeto y qué se guarda junto → `ddd-agregados`.
* Cómo se guardan → `ddd-repositorios-persistencia`.
