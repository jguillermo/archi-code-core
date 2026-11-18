# Servicios de dominio

El código (clase, dependencias, cómo lo instancia el caso de uso, `CourseRegistration` y su test) está en `ddd-skills/archi-code-ddd/domain-services.md`, apartados Rules y Code. Aquí queda el porqué y el diseño del ejemplo de Ventas.

## Cuándo

Según IDDD [IDDD cap. 7]: un proceso de negocio significativo, transformar una composición en otra, o calcular con datos de varios objetos (lo más común). Ejemplo: autenticar solo si el tenant está activo (`AuthenticationService`). Con el paquete, además, solo si lo comparten dos casos de uso o la regla necesita varios agregados `[Fuera de los libros: convención de @archi-code/ddd]`.

## Forma

Sin estado, con nombre de operación de negocio del lenguaje ubicuo; recibe y devuelve objetos de dominio y lanza errores de negocio [IDDD cap. 7]. No publica ni abre transacciones: lo hace el caso de uso y el repositorio. Sí puede persistir un agregado con el `save` del repositorio abstracto que recibió por constructor `[Fuera de los libros: convención de @archi-code/ddd]` (IDDD cap. 7 deja el guardado al servicio de aplicación). La forma preferida recibe los agregados ya cargados como argumentos y no tiene dependencias; el caso de uso lo instancia, nunca se inyecta `[Fuera de los libros: convención de @archi-code/ddd]`.

Solo los casos de uso ejecutan servicios de dominio, sin excepción: el caso de uso tiene en su constructor el repositorio que el servicio necesita, se lo pasa al instanciarlo dentro de `handle` y lo ejecuta. Un agregado nunca llama, instancia ni recibe un servicio de dominio, ni por constructor ni como argumento de un método, y un servicio de dominio nunca instancia, recibe ni ejecuta otro servicio de dominio: si el caso de uso necesita dos, ejecuta ambos y pasa la respuesta de uno al otro. El servicio de dominio sí instancia y modifica agregados (`Aggregate.create(…)`, sus métodos de negocio) y los devuelve, o lanza el error de negocio. También puede persistirlos: recibe por constructor la instancia del repositorio que el caso de uso tiene, y es el caso de uso quien instancia y ejecuta el servicio. Un agregado se guarda una sola vez por caso de uso, en el servicio o en el caso de uso; publicar sigue siendo del caso de uso `[Fuera de los libros: convención de @archi-code/ddd]`.

Regla estricta, sin excepción: un servicio de dominio es siempre una clase concreta (no abstracta) del dominio que realiza lógica de negocio. Nunca es una clase abstracta ni una interfaz, ni tiene métodos abstractos, para ser implementado en la capa de infraestructura; y la infraestructura nunca implementa, extiende ni sustituye un servicio de dominio `[Fuera de los libros: convención de @archi-code/ddd]` (IDDD cap. 7 admite una interfaz separada con implementación técnica).

Lo que no es un servicio de dominio: los gastos de envío de Ventas. El cálculo lo usa un solo caso de uso y trabaja con un pedido y unas tarifas ya cargadas, sin leer otros agregados, así que no cumple el «Cuándo» de arriba y no hay `ShippingCostCalculator`:

* Las tarifas (`ShippingRates`) son un value object de varias tarifas que sabe el precio de una zona y lanza `NoShippingToZone` (`SAL022`) si no hay envío a ella: el cálculo sobre valores va en el value object.
* Si el pedido paga o no el envío es una regla del pedido: un método de `Order` que recibe las tarifas y la condición de envío gratis, una `Specification<Order>` ya construida (`TotalAtLeast`, en `ddd-skills/ddd-servicios-capa-aplicacion/references/ejemplo-ecommerce.md`), que se puede combinar con `and`, `or` y `not` [IDDD cap. 5 y cap. 6].

## No existen puertos de dominio

Regla más importante, sin excepción `[Fuera de los libros: convención de @archi-code/ddd]`: lo único del dominio que otra capa implementa es el repositorio abstracto de un agregado. En `domain/<agregado>/service/` solo hay clases concretas; nunca una interfaz, una clase abstracta ni un tipo para implementar en infraestructura o en aplicación. Un «puerto de dominio» no existe y nunca se crea (IDDD cap. 7 admite una interfaz del servicio en el dominio con implementación técnica; el paquete no).

Si la regla parece necesitar una interfaz, se refactoriza el dominio:

* El dato es un agregado del contexto y se lee por su repositorio abstracto: `OrderPricing` recibe `CouponRepository` y lee el agregado `Coupon` de cada código; no hay interfaz `CouponCatalog`.
* La capacidad técnica u otro sistema (p. ej. `ExchangeRates.convert(amount, to, on)` con `Money`, `MoneyCurrency` y `RateDay`) es un puerto de aplicación: interfaz en `application/`, junto a su primer caso de uso, que habla con value objects; el adaptador de infraestructura envuelve sus errores con `cause` y redondea de forma explícita (dinero en céntimos enteros). El caso de uso llama al puerto y pasa lo cargado al servicio de dominio o al agregado; el dominio nunca ve el puerto.

Código del servicio: `ddd-skills/archi-code-ddd/domain-services.md`, apartado Code; del adaptador: `ddd-skills/archi-code-ddd/repositories.md`.

## Validar composiciones

Un servicio puede comprobar que varios agregados cargados son coherentes y avisar, sin corregirlos a la vez: cada agregado se guarda en su propia escritura [IDDD cap. 5]. Para informar de todo, reúne `ValidationIssue`s (`{ field, code, message }`) y lanza una `ValidationException` (422); si basta uno, una `DomainException` con nombre propio `[Fuera de los libros: convención de @archi-code/ddd]`.

## Tests

Con objetos de dominio reales y nombres del lenguaje [IDDD cap. 7]; fábricas de datos en `test/support/`; dependencias como stubs `[Fuera de los libros: convención de @archi-code/ddd]`. Código: `ddd-skills/archi-code-ddd/domain-services.md` (test de `CourseRegistration`) y `ddd-skills/archi-code-ddd/tests.md`.

El modelo es el de `ddd-skills/ddd-agregados/references/implementacion-ts.md`; `TotalAtLeast` y `Customer`, los de `ddd-skills/ddd-servicios-capa-aplicacion/references/ejemplo-ecommerce.md`.
