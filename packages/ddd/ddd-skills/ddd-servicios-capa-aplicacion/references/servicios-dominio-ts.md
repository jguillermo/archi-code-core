# Servicios de dominio

El código (clase, dependencias, cómo lo instancia el caso de uso, puerto de dominio, `CourseFinder` y su test) está en `ddd-skills/archi-code-ddd/domain-services.md`, apartados Rules y Code. Aquí queda el porqué y el diseño del ejemplo de Ventas.

## Cuándo

Según IDDD [IDDD cap. 7]: un proceso de negocio significativo, transformar una composición en otra, o calcular con datos de varios objetos (lo más común). Ejemplo: autenticar solo si el tenant está activo (`AuthenticationService`). Con el paquete, además, solo si lo comparten dos casos de uso o la regla necesita varios agregados o un puerto de dominio `[Fuera de los libros: convención de @archi-code/ddd]`.

## Forma

Sin estado, con nombre de operación de negocio del lenguaje ubicuo; recibe y devuelve objetos de dominio y lanza errores de negocio [IDDD cap. 7]. No guarda ni publica: lo hace el caso de uso. La forma preferida recibe los agregados ya cargados como argumentos y no tiene dependencias; el caso de uso lo instancia, nunca se inyecta `[Fuera de los libros: convención de @archi-code/ddd]`.

Diseño de `ShippingCostCalculator` en Ventas (cálculo con datos de varios objetos [IDDD cap. 7]):

* `costFor` recibe el pedido, la zona de envío, las tarifas y la condición de envío gratis, y devuelve `Money`.
* Las tarifas (`ShippingRates`) son un value object de varias tarifas que sabe el precio de una zona y lanza `NoShippingToZone` (`SAL022`) si no hay envío a ella: la regla sobre valores va en el value object, no en el servicio.
* La condición de envío gratis es una `Specification<Order>` ya construida (`TotalAtLeast`, en `ddd-skills/ddd-servicios-capa-aplicacion/references/ejemplo-ecommerce.md`), que se puede combinar con `and`, `or` y `not` [IDDD cap. 5 y cap. 6]; el servicio no la elige, solo la aplica.

## Puerto de dominio

Sin interfaz si hay una sola implementación sin infraestructura; si la hay, nada de `Impl`: la implementación se nombra por lo que la distingue [IDDD cap. 7]. Si necesita tecnología, la interfaz es un puerto del dominio que habla con value objects (p. ej. `ExchangeRates.convert(amount, to, on)` con `Money`, `MoneyCurrency` y `RateDay`) y la implementación un adaptador de infraestructura que envuelve sus errores con `cause` y redondea de forma explícita (dinero en céntimos enteros) [IDDD cap. 7]. Código del puerto: `ddd-skills/archi-code-ddd/domain-services.md`, apartado Code; del adaptador: `ddd-skills/archi-code-ddd/repositories.md`.

## Validar composiciones

Un servicio puede comprobar que varios agregados cargados son coherentes y avisar, sin corregirlos a la vez: cada agregado se guarda en su propia escritura [IDDD cap. 5]. Para informar de todo, reúne `ValidationIssue`s (`{ field, code, message }`) y lanza una `ValidationException` (422); si basta uno, una `DomainException` con nombre propio `[Fuera de los libros: convención de @archi-code/ddd]`.

## Tests

Con objetos de dominio reales y nombres del lenguaje [IDDD cap. 7]; fábricas de datos en `test/support/`; dependencias como stubs `[Fuera de los libros: convención de @archi-code/ddd]`. Código: `ddd-skills/archi-code-ddd/domain-services.md` (test de `CourseFinder`) y `ddd-skills/archi-code-ddd/tests.md`.

El modelo es el de `ddd-skills/ddd-agregados/references/implementacion-ts.md`; `TotalAtLeast` y `Customer`, los de `ddd-skills/ddd-servicios-capa-aplicacion/references/ejemplo-ecommerce.md`.
