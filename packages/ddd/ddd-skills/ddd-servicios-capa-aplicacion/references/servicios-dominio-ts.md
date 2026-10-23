# Servicios de dominio en TypeScript

## Cuándo

IDDD enumera tres situaciones [IDDD cap. 7]:
* realizar un proceso de negocio significativo;
* transformar un objeto de dominio de una composición a otra;
* calcular un valor que requiere datos de más de un objeto de dominio (el caso más común).

Ejemplo de IDDD: autenticar a un usuario solo si su tenant está activo. Ponerlo en `User` obliga al cliente a conocer `Tenant` y las reglas de cifrado; un servicio `AuthenticationService` expresa la operación del lenguaje y oculta los detalles [IDDD cap. 7].

## Forma

El paquete no trae una clase base para servicios de dominio: son clases normales en `domain/`, con el nombre de la operación de negocio. Reciben agregados ya cargados y value objects, y devuelven un value object.

```ts
import { Composite, DomainException, Required, StringType } from '@archi-code/ddd/domain';
import type { SatisfiedBy } from '@archi-code/ddd/domain';
import { Validations } from '@archi-code/validation';

@Validations([{ validator: 'isIn', properties: { values: ['PENINSULA', 'BALEARES', 'CANARIAS'] } }])
export class ShippingZone extends Required(StringType) {}

export class ShippingRate extends Composite({ zone: ShippingZone, price: Money }) {}

export class NoShippingToZone extends DomainException {
  constructor(zone: string) {
    super(`There is no shipping rate for ${zone}`, ['SHP001']);
  }
}

export class ShippingRates extends Composite({ items: [ShippingRate] }) {
  priceFor(zone: ShippingZone): Money {
    const rate = this.items.find((candidate) => candidate.zone.equals(zone));
    if (rate === undefined) {
      throw new NoShippingToZone(zone.value);
    }
    return rate.price;
  }
}

export class ShippingCostCalculator {
  costFor(
    order: Order,
    zone: ShippingZone,
    rates: ShippingRates,
    freeShipping: SatisfiedBy<Order>,
  ): Money {
    const price = rates.priceFor(zone);
    if (!freeShipping.isSatisfiedBy(order)) {
      return price;
    }
    return new Money({ amount: new Cents(0), currency: price.currency });
  }
}
```

* Sin estado; recibe objetos de dominio (`Order`, la tabla de tarifas como composite, la zona) y devuelve un value object (`Money`, el composite de `Cents` y `Currency`).
* La condición de envío gratis es una `Specification<Order>` que recibe ya construida (`new OrderAbove(euros(5000))`); `SatisfiedBy<Order>` acepta también cualquier objeto con `isSatisfiedBy`, y se combina con `and`, `or` y `not`.
* El nombre de la clase y del método salen del lenguaje ubicuo.
* No guarda nada ni publica nada; eso lo hace el caso de uso que lo invoca.
* El servicio puede leer por repositorio [IDDD cap. 7]: con el paquete recibe un `AggregateFinder` (solo lectura) o los agregados ya cargados por el caso de uso, como aquí; nunca guarda ni elimina.

## Interfaz separada o no

Si solo habrá una implementación y no depende de infraestructura, una clase concreta basta. IDDD discute la interfaz separada y advierte contra nombres de implementación sin significado como `Impl`: si hay interfaz, la implementación se nombra por lo que la distingue [IDDD cap. 7].

Cuando la implementación necesita tecnología (consultar otro contexto, un servicio de tipos de cambio), la interfaz va en el dominio, con value objects, y la implementación en infraestructura [IDDD cap. 7]. El adaptador envuelve los errores del cliente en `InternalErrorException` con `cause` y redondea de forma explícita (el dinero va en céntimos enteros):

```ts
import { DateType, Required } from '@archi-code/ddd/domain';

export class RateDay extends Required(DateType) {}

export interface ExchangeRates {
  convert(amount: Money, to: Currency, on: RateDay): Promise<Money>;
}
```

```ts
import { InternalErrorException } from '@archi-code/ddd/infrastructure';

interface EcbClient {
  rate(from: string, to: string, day: string): Promise<number>;
}

export class EcbExchangeRates implements ExchangeRates {
  constructor(private readonly ecb: EcbClient) {}

  async convert(amount: Money, to: Currency, on: RateDay): Promise<Money> {
    let rate: number;
    try {
      rate = await this.ecb.rate(amount.currency.value, to.value, on.value.toISOString().slice(0, 10));
    } catch (error) {
      throw new InternalErrorException('reading the ECB exchange rates', { cause: error });
    }
    return new Money({ amount: new Cents(Math.round(amount.amount.value * rate)), currency: to });
  }
}
```

## Validación de composiciones

Un servicio de dominio es buen sitio para validar que varios agregados sean coherentes entre sí [IDDD cap. 5]. Recibe los agregados que el caso de uso ya cargó y comprueba. Si detecta un problema, informa (error o evento); no corrige varios agregados a la vez: cada agregado se guarda en su propia escritura atómica.

Para informar de todos los problemas a la vez, reúne `ValidationIssue`s y lanza una sola `ValidationException` (`ExceptionKind.Invalid`, 422 en HTTP, cada problema con su `field` y su `code`); si basta con uno, lanza una `DomainException` con nombre y código propio:

```ts
import { ValidationException } from '@archi-code/ddd/domain';
import type { ValidationIssue } from '@archi-code/ddd/domain';

export class ShipmentCheck {
  assertCanShip(order: Order, customer: Customer): void {
    const issues: ValidationIssue[] = [];
    if (!order.customerId.equals(customer.id)) {
      issues.push({ field: 'customer', code: 'SHP002', message: `Order ${order.id.value} belongs to another customer` });
    }
    if (customer.blocked.value) {
      issues.push({ field: 'customer', code: 'CUS001', message: `Customer ${customer.id.value} is blocked` });
    }
    if (!order.status.isPending()) {
      issues.push({ field: 'order', code: 'ORD001', message: `Order ${order.id.value} is no longer pending` });
    }
    if (issues.length > 0) {
      throw new ValidationException(issues);
    }
  }
}
```

## Tests

Los servicios se prueban como cualquier objeto de dominio, con datos realistas y nombres del lenguaje [IDDD cap. 7]. Con Vitest, las fábricas de datos de prueba (`anOrderWorth`, `euros`, `standardRates`) viven en `test/support/` del proyecto:

```ts
import { describe, expect, it } from 'vitest';

describe('ShippingCostCalculator', () => {
  it('ships for free to the peninsula from 50 EUR', () => {
    const cost = new ShippingCostCalculator().costFor(
      anOrderWorth(5200),
      new ShippingZone('PENINSULA'),
      standardRates(),
      new OrderAbove(euros(5000)),
    );

    expect(cost.toPrimitives()).toEqual({ amount: 0, currency: 'EUR' });
  });

  it('charges the rate of the Canary Islands below the minimum', () => {
    const cost = new ShippingCostCalculator().costFor(
      anOrderWorth(3000),
      new ShippingZone('CANARIAS'),
      standardRates(),
      new OrderAbove(euros(5000)),
    );

    expect(cost.equals(euros(1295))).toBe(true);
  });
});
```

```ts
import { FixedClock } from '@archi-code/ddd/infrastructure';

const clock = new FixedClock('2026-03-01T09:30:00Z');

export const euros = (cents: number): Money => Money.fromPrimitives({ amount: cents, currency: 'EUR' });

export const anOrderWorth = (cents: number): Order =>
  Order.place(
    OrderId.generate(),
    new CustomerId('3c1d2e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f'),
    OrderLines.fromPrimitives({
      items: [{ sku: 'TORCH-01', quantity: 1, unitPrice: { amount: cents, currency: 'EUR' } }],
    }),
    ShippingAddress.fromPrimitives({ street: 'Calle Mayor 1', city: 'Huelva', country: 'ES' }),
    clock,
  );

export const standardRates = (): ShippingRates =>
  ShippingRates.fromPrimitives({
    items: [
      { zone: 'PENINSULA', price: { amount: 495, currency: 'EUR' } },
      { zone: 'CANARIAS', price: { amount: 1295, currency: 'EUR' } },
    ],
  });
```

`Order`, `OrderLines`, `ShippingAddress`, `Money` y `Cents` son los de `ddd-skills/ddd-agregados/references/implementacion-ts.md`, y `OrderAbove` y `Customer`, los de `ddd-skills/ddd-servicios-capa-aplicacion/references/ejemplo-ecommerce.md`.
