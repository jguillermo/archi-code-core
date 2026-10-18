# Servicios de dominio en TypeScript

## Cuándo

IDDD enumera tres situaciones [IDDD cap. 7]:
* realizar un proceso de negocio significativo;
* transformar un objeto de dominio de una composición a otra;
* calcular un valor que requiere datos de más de un objeto de dominio (el caso más común).

Ejemplo de IDDD: autenticar a un usuario solo si su tenant está activo. Ponerlo en `User` obliga al cliente a conocer `Tenant` y las reglas de cifrado; un servicio `AuthenticationService` expresa la operación del lenguaje y oculta los detalles [IDDD cap. 7].

## Forma

```ts
// domain/shipping/ShippingCostPolicy.ts
export class ShippingCostCalculator {
  constructor(private readonly rates: ShippingRateTable) {}   // value object o puerto de dominio

  /** Gastos de envío de un pedido según destino, peso y promociones vigentes. */
  costFor(lines: OrderLines, destination: ShippingAddress, promotions: ActivePromotions): Money {
    const weight = lines.totalWeight();
    const base = this.rates.rateFor(destination.zone(), weight);
    return promotions.freeShippingApplies(lines.total(), destination) ? Money.zero(base.currency.code) : base;
  }
}
```

* Sin estado; recibe objetos de dominio y devuelve un value object.
* El nombre de la clase y del método salen del glosario.
* No guarda nada ni publica nada; eso lo hace quien lo invoca.

## Interfaz separada o no

Si solo habrá una implementación y no depende de infraestructura, una clase concreta basta. IDDD discute la interfaz separada y advierte contra nombres de implementación sin significado como `Impl`: si hay interfaz, la implementación se nombra por lo que la distingue [IDDD cap. 7].

Cuando la implementación necesita tecnología (consultar otro contexto, un servicio de tipos de cambio), la interfaz va en el dominio y la implementación en infraestructura [IDDD cap. 7].

```ts
// domain/pricing/ExchangeRates.ts
export interface ExchangeRates {
  convert(amount: Money, to: Currency, on: Date): Promise<Money>;
}
// infrastructure/pricing/EcbExchangeRates.ts implementa ExchangeRates
```

## Validación de composiciones

Un servicio de dominio es buen sitio para validar que varios agregados sean coherentes entre sí: lee lo necesario por repositorio y comprueba [IDDD cap. 5]. Si detecta un problema, informa (error o evento); no corrige varios agregados en la misma transacción.

## Tests

Los servicios se prueban como cualquier objeto de dominio, con datos realistas y nombres del lenguaje [IDDD cap. 7].

```ts
it('el envío es gratis en península a partir de 50 €', () => {
  const calc = new ShippingCostCalculator(standardRates());
  const cost = calc.costFor(linesWorth('52.00'), madridAddress(), promotions({ freeShippingFrom: '50.00', zones: ['PENINSULA'] }));
  expect(cost.equals(Money.zero('EUR'))).toBe(true);
});
```
