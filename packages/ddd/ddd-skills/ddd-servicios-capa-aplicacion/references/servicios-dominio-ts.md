# Servicios de dominio en TypeScript

## Cuándo

Según IDDD [IDDD cap. 7]: un proceso de negocio significativo, transformar una composición en otra, o calcular con datos de varios objetos (lo más común). Ejemplo: autenticar solo si el tenant está activo (`AuthenticationService`). Con el paquete, además, solo si lo comparten dos casos de uso o la regla necesita varios agregados o un puerto de dominio `[Fuera de los libros: convención de @archi-code/ddd]`.

## Forma

Clase normal en `domain/service/` (un fichero PascalCase por clase), con nombre de operación de negocio, sin estado; recibe agregados y value objects, devuelve un value object y lanza errores de negocio. Las dependencias (repositorio abstracto con solo `findById`, puertos de dominio) llegan por constructor; el caso de uso la instancia en `handle` (`new CourseFinder(this.courses)`), nunca se inyecta `[Fuera de los libros: convención de @archi-code/ddd]`. Forma preferida, agregados ya cargados y sin dependencias:

```ts
export class ShippingCostCalculator {
  costFor(order: Order, zone: ShippingZone, rates: ShippingRates, freeShipping: SatisfiedBy<Order>): Money {
    const price = rates.priceFor(zone);
    if (!freeShipping.isSatisfiedBy(order)) {
      return price;
    }
    return new Money({ amount: new Cents(0), currency: price.currency });
  }
}
```

* `ShippingRates` es un `Composite({ items: [ShippingRate] })` cuyo `priceFor` lanza `NoShippingToZone` (`DomainException`, `SAL022`).
* La condición es una `Specification<Order>` ya construida (`new TotalAtLeast(euros(5000))`); `SatisfiedBy<Order>` acepta cualquier objeto con `isSatisfiedBy` y se combina con `and`, `or`, `not`.
* No guarda ni publica: lo hace el caso de uso.

## Puerto de dominio

Sin interfaz si hay una sola implementación sin infraestructura; si la hay, nada de `Impl`: la implementación se nombra por lo que la distingue [IDDD cap. 7]. Si necesita tecnología, la interfaz es un puerto en `domain/service/` con value objects y la implementación un adaptador en `infrastructure/<área>/` que envuelve errores en `InternalErrorException` con `cause` y redondea de forma explícita (dinero en céntimos enteros) [IDDD cap. 7]:

```ts
export interface ExchangeRates {
  convert(amount: Money, to: MoneyCurrency, on: RateDay): Promise<Money>;
}
```

## Validar composiciones

Un servicio puede comprobar que varios agregados cargados son coherentes y avisar, sin corregirlos a la vez: cada agregado se guarda en su propia escritura [IDDD cap. 5]. Para informar de todo, reúne `ValidationIssue`s (`{ field, code, message }`) y lanza una `ValidationException` (422); si basta uno, una `DomainException` con nombre propio.

## Tests

Con objetos de dominio reales y nombres del lenguaje [IDDD cap. 7]; fábricas de datos en `test/support/`; dependencias como stubs `vi.fn()` `[Fuera de los libros: convención de @archi-code/ddd]`:

```ts
it('ships for free to the peninsula from 50 EUR', () => {
  const cost = new ShippingCostCalculator().costFor(
    anOrderWorth(5200),
    new ShippingZone('PENINSULA'),
    standardRates(),
    new TotalAtLeast(euros(5000)),
  );
  expect(cost.toPrimitives()).toEqual({ amount: 0, currency: 'EUR' });
});
```

El modelo es el de `ddd-skills/ddd-agregados/references/implementacion-ts.md`; `TotalAtLeast` y `Customer`, los de `ddd-skills/ddd-servicios-capa-aplicacion/references/ejemplo-ecommerce.md`.
