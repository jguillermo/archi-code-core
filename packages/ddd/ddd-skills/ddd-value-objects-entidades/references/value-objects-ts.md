# Value objects en TypeScript

Contenido: 1. Patrón base · 2. Money · 3. Identificadores · 4. Valores de un atributo · 5. Rangos · 6. Tipos estándar y estados · 7. Colecciones de valores · 8. Integración minimalista · 9. Tests

## 1. Patrón base

`[Fuera de los libros: convención de @archi-code/ddd]`. Las características de IDDD cap. 6 y *DDD in PHP* (inmutable, válido desde su creación, igualdad por valor) ya las da el paquete; no se escribe una clase base `ValueObject` propia:

| Necesitas | Clase del paquete (`@archi-code/ddd/domain`) |
|---|---|
| Un valor de un atributo (texto, número, booleano, fecha, UUID) | Subclase con nombre de `StringType`, `NumberType`, `BooleanType`, `DateType`, `UuidType`; obligatoria con `Required(XType)` |
| Un id | `IdType` (UUID obligatorio, `XId.generate()`) |
| Un estado o tipo estándar | `EnumType<E>` |
| Varios atributos que forman un todo | `Composite({ campo: Clase, … })` |
| Un tipo propio | `AbstractType<T>` implementando solo `protected filter(value: unknown): T` |

```ts
import { Validations } from '@archi-code/validation';
import { Required, StringType } from '@archi-code/ddd/domain';

@Validations([{ validator: 'isEmail' }])
export class Email extends Required(StringType) {}

new Email('ana@example.com').equals(new Email('ana@example.com')); // true
new Email('x'); // ValidationException: Validation failed, Email: Value does not satisfy isEmail
```

Lo que ya hace el paquete y no se reescribe:
* El constructor convierte la entrada, comprueba `Required` y ejecuta todas las reglas de `@Validations` (de `@archi-code/validation`): un value object que existe es válido. No hay factoría `of()` ni `assertValid()`; se crea con `new`.
* `_value` es `readonly`, las fechas son inmutables y un `Composite` está congelado: `readonly` protege en compilación y el paquete también en ejecución.
* `equals` compara clase y valor: fechas por instante, listas y objetos por contenido. Con una comparación por referencia, dos `DateRange` con las mismas fechas no serían iguales, y eso rompe la igualdad por valor [IDDD cap. 6].
* Cada valor del dominio es una subclase con nombre: el nombre aparece en los errores y `equals` distingue `BillingCountry('ES')` de `ShippingCountry('ES')`.

Lo que no es opcional, con o sin paquete, es la inmutabilidad y la igualdad por valor [IDDD cap. 6].

## 2. Money

El ejemplo canónico de *DDD in PHP* (moneda e importe juntos) [PHP: Value Objects]. Nunca `number` en coma flotante para dinero `[Fuera de los libros]`: aquí, céntimos enteros en un `Composite`. Los libros usarían `bigint`; el paquete no tiene tipo `bigint`, así que `Cents` es `Required(NumberType)` con `isInt`, exacto hasta `Number.MAX_SAFE_INTEGER` céntimos `[Fuera de los libros: convención de @archi-code/ddd]`.

```ts
import { Validations } from '@archi-code/validation';
import { Composite, NumberType, Required, StringType } from '@archi-code/ddd/domain';
import { DomainException } from '@archi-code/ddd/exceptions';

export class CurrencyMismatch extends DomainException {
  constructor(expected: string, received: string) {
    super(`Cannot add ${received} to ${expected}`, ['PAY001']);
  }
}

export class InvalidMultiplier extends DomainException {
  constructor(factor: string) {
    super(`${factor} is not a valid multiplier`, ['PAY002']);
  }
}

@Validations([{ validator: 'isInt' }])
export class Cents extends Required(NumberType) {}

@Validations([{ validator: 'isISO4217' }])
export class Currency extends Required(StringType) {
  protected filter(value: unknown): string {
    return super.filter(value).trim().toUpperCase();
  }
}

export type Rounding = 'HALF_EVEN' | 'HALF_UP';

export class Money extends Composite({ amount: Cents, currency: Currency }) {
  static zero(currency: Currency): Money {
    return new Money({ amount: new Cents(0), currency });
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return this.withCents(this.amount.value + other.amount.value);
  }

  times(quantity: Quantity): Money {
    return this.withCents(this.amount.value * quantity.value);
  }

  multiplyBy(factor: string, rounding: Rounding = 'HALF_EVEN'): Money {
    if (!/^\d+(\.\d{1,6})?$/.test(factor)) {
      throw new InvalidMultiplier(factor);
    }
    const [whole, decimals = ''] = factor.split('.');
    const scaled = BigInt(whole + decimals.padEnd(6, '0'));
    return this.withCents(
      Number(Money.roundDiv(BigInt(this.amount.value) * scaled, 1_000_000n, rounding)),
    );
  }

  percentage(percent: string, rounding: Rounding = 'HALF_EVEN'): Money {
    if (!/^\d+(\.\d{1,4})?$/.test(percent)) {
      throw new InvalidMultiplier(percent);
    }
    const [whole, decimals = ''] = percent.split('.');
    const millionths = BigInt(whole + decimals.padEnd(4, '0')).toString().padStart(7, '0');
    return this.multiplyBy(`${millionths.slice(0, -6)}.${millionths.slice(-6)}`, rounding);
  }

  covers(other: Money): boolean {
    return this.currency.equals(other.currency) && this.amount.value >= other.amount.value;
  }

  isZero(): boolean {
    return this.amount.value === 0;
  }

  toString(): string {
    const cents = Math.abs(this.amount.value);
    const sign = this.amount.value < 0 ? '-' : '';
    return `${sign}${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, '0')} ${this.currency.value}`;
  }

  private withCents(cents: number): Money {
    return new Money({ amount: new Cents(cents), currency: this.currency });
  }

  private assertSameCurrency(other: Money): void {
    if (!this.currency.equals(other.currency)) {
      throw new CurrencyMismatch(this.currency.value, other.currency.value);
    }
  }

  private static roundDiv(dividend: bigint, divisor: bigint, mode: Rounding): bigint {
    const quotient = dividend / divisor;
    const remainder = dividend % divisor;
    if (remainder === 0n) {
      return quotient;
    }
    const sign = dividend < 0n ? -1n : 1n;
    const twice = 2n * (remainder < 0n ? -remainder : remainder);
    if (twice > divisor) {
      return quotient + sign;
    }
    if (twice < divisor) {
      return quotient;
    }
    return mode === 'HALF_UP' || quotient % 2n !== 0n ? quotient + sign : quotient;
  }
}

const price = Money.fromPrimitives({ amount: 850, currency: ' eur ' });
price.percentage('21').toPrimitives(); // { amount: 178, currency: 'EUR' }: 178,5 redondeado al par
```

Es el `Money` del pedido de `ddd-skills/ddd-agregados/references/implementacion-ts.md` (`add`, `times`, `covers`, con `Cents`, `Currency` y `CurrencyMismatch`), más las operaciones que un proyecto añade cuando las necesita (`zero`, `multiplyBy`, `percentage`, `isZero`, `toString`); `Quantity` está en la sección 7.

Por qué dos métodos: `times` es exacto (precio por cantidad) y `multiplyBy` obliga a decidir el redondeo, que en dinero nunca debe quedar implícito `[Fuera de los libros]`. El cálculo intermedio va en `bigint` para no perder exactitud; el resultado vuelve a `Cents`, que rechaza lo que no sea entero. Si el dominio reparte importes (pagos fraccionados), añade un `allocate` que reparta el resto de céntimos en lugar de redondear cada parte.

Todas las operaciones son funciones sin efectos secundarios: devuelven un `Money` nuevo [IDDD cap. 6]. El `Composite` está congelado; los valores derivados (`isZero()`) son métodos, nunca getters.

## 3. Identificadores

Los value objects son buenos contenedores de identidad: inmutables, estables y con el comportamiento de identidad centralizado [IDDD cap. 5].

```ts
import { IdType } from '@archi-code/ddd/domain';

export class OrderId extends IdType<'OrderId'> {}
export class CustomerId extends IdType<'CustomerId'> {}

const orderId = OrderId.generate(); // un OrderId con un UUID v4
new OrderId('9B2F6C1E-4D3A-4F8B-A1C2-3E4D5F6A7B8C').value; // '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c'
```

`IdType` es obligatorio, acepta cualquier versión de UUID, lo guarda en minúsculas y rechaza el UUID nulo. Para ids con orden temporal en índices, `new OrderId(uuidv7())` `[Fuera de los libros]`. Una identidad que aporta el usuario o asigna otro contexto (código de campaña, id del CRM) es un `Required(StringType)` con nombre y sus reglas; un UUID estable a partir de una clave externa sale de `UuidType.fromValue(key)`:

```ts
import { Validations } from '@archi-code/validation';
import { Required, StringType } from '@archi-code/ddd/domain';

@Validations([{ validator: 'matches', properties: { pattern: '^[A-Z0-9]{4,12}$' } }])
export class CampaignCode extends Required(StringType) {
  protected filter(value: unknown): string {
    return super.filter(value).trim().toUpperCase();
  }
}
```

Un tipo por identificador (`OrderId`, `CustomerId`) hace que `equals` nunca confunda un id de cliente con uno de pedido, porque compara la clase. En compilación, TypeScript es estructural y dos clases con la misma forma se aceptarían una por otra; por eso `IdType` recibe una marca con el nombre de la clase, que solo existe en los tipos, y el compilador las distingue `[Fuera de los libros: convención de @archi-code/ddd]`:

```ts
import { IdType } from '@archi-code/ddd/domain';

export class OrderId extends IdType<'OrderId'> {}
export class CustomerId extends IdType<'CustomerId'> {}

const orderId: OrderId = CustomerId.generate(); // error de compilación
```

Sin marca (`extends IdType {}`) la clase compila, pero se acepta donde se espera cualquier otro id: pon siempre el nombre de la clase. Un `IdType` sin marca sirve como tipo para cualquier id (`AggregateRoot<IdType>`).

## 4. Valores de un atributo

¿Merece la pena envolver un único atributo? Si tiene reglas o comportamiento (formato, normalización, comparación), sí. Un booleano o un número autocontenido sin comportamiento puede quedarse como primitivo; envolver de más es un error menor y se corrige refactorizando [IDDD cap. 6]. Con el paquete, todo el estado de un agregado es value objects, también un booleano (`class Shipped extends Required(BooleanType) {}`): así infraestructura lo guarda sin leer campos sueltos `[Fuera de los libros: convención de @archi-code/ddd]`.

La normalización (recortar, minúsculas) va en `filter`, llamando primero a `super.filter(value)`; las reglas se ejecutan sobre el valor ya normalizado:

```ts
import { Validations } from '@archi-code/validation';
import { Required, StringType } from '@archi-code/ddd/domain';

@Validations([{ validator: 'isEmail' }])
export class Email extends Required(StringType) {
  protected filter(value: unknown): string {
    return super.filter(value).trim().toLowerCase();
  }

  domain(): string {
    return this.value.split('@')[1];
  }
}

new Email(' Ana@Example.COM ').domain(); // 'example.com'
```

Un value object es opcional por defecto (`class Nickname extends StringType {}`: `value: string | null`) y `Required(XType)` lo hace obligatorio (`RequiredValueException` si llega vacío) `[Fuera de los libros: convención de @archi-code/ddd]`; los libros crean siempre el valor con contenido y modelan lo opcional en el campo (`nickname: Nickname | null`). Con el paquete valen las dos formas.

## 5. Rangos y todos conceptuales

Atributos que solo tienen sentido juntos forman un todo conceptual [IDDD cap. 6]. Si una entidad tiene `startDate` y `endDate` sueltos, falta un value object: un `Composite`, con la regla que combina sus campos como regla `custom` de `@Validations` (su `fn` recibe el composite ya construido).

```ts
import { Validations } from '@archi-code/validation';
import { Composite, DateType, Required } from '@archi-code/ddd/domain';

export class StartDate extends Required(DateType) {}
export class EndDate extends Required(DateType) {}

@Validations([
  {
    custom: 'endsAfterItStarts',
    fn: (range) => (range as DateRange).end.value >= (range as DateRange).start.value,
    message: 'A date range cannot end before it starts',
  },
])
export class DateRange extends Composite({ start: StartDate, end: EndDate }) {
  contains(moment: Date): boolean {
    return moment >= this.start.value && moment <= this.end.value;
  }

  overlaps(other: DateRange): boolean {
    return this.start.value <= other.end.value && other.start.value <= this.end.value;
  }

  extendTo(end: EndDate): DateRange {
    return new DateRange({ start: this.start, end });
  }
}
```

`extendTo` devuelve un rango nuevo, que vuelve a pasar la regla: reemplazo, no mutación. `Date` es mutable en JavaScript, pero `DateType` guarda una fecha inmutable (sus setters lanzan), así que no hace falta copiarla al construir. `DateType` rechaza fechas con hora sin zona horaria.

## 6. Tipos estándar y estados

Los tipos estándar describen el tipo de algo (moneda, tipo de cliente, estado) [IDDD cap. 6]. IDDD los implementa como enum con comportamiento (patrón State). Con el paquete, un `EnumType` y una subclase obligatoria con el comportamiento:

```ts
import { EnumType, Required } from '@archi-code/ddd/domain';

export enum Status {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Cancelled = 'cancelled',
}

export class StatusType extends EnumType<Status> {
  protected getEnum(): typeof Status {
    return Status;
  }
}

export class OrderStatus extends Required(StatusType) {
  isPending(): boolean {
    return this.value === Status.Pending;
  }

  isConfirmed(): boolean {
    return this.value === Status.Confirmed;
  }

  canBeCancelled(): boolean {
    return this.value !== Status.Cancelled;
  }
}
```

Las reglas de transición viven en el tipo, no en `if` repartidos. Su primitivo es la opción del enum, así que `fromPrimitives` lo rehace sin conversión: `new OrderStatus(primitives.status)`. El estado de disponibilidad de IDDD (`ADD_ON_NOT_ENABLED`, `NOT_REQUESTED`, `REQUESTED`, `READY`) es un ejemplo de este patrón aplicado a integración [IDDD cap. 3].

## 7. Colecciones de valores

Una colección de valores también puede ser un valor con comportamiento propio `[Fuera de los libros]`. Con el paquete es un `Composite` con un campo lista (`[OrderLine]`) y sus reglas como `custom`; `ArrayType` solo guarda value objects simples, nunca composites:

```ts
import { Validations } from '@archi-code/validation';
import { Composite, NumberType, Required, StringType } from '@archi-code/ddd/domain';

export class Sku extends Required(StringType) {}

@Validations([{ validator: 'isInt', properties: { min: 1 } }])
export class Quantity extends Required(NumberType) {}

export class OrderLine extends Composite({ sku: Sku, quantity: Quantity, unitPrice: Money }) {
  subtotal(): Money {
    return this.unitPrice.times(this.quantity);
  }
}

@Validations([
  {
    custom: 'hasLines',
    fn: (lines) => (lines as OrderLines).items.length > 0,
    message: 'An order needs at least one line',
  },
  {
    custom: 'uniqueSku',
    fn: (lines) => {
      const skus = (lines as OrderLines).items.map((line) => line.sku.value);
      return new Set(skus).size === skus.length;
    },
    message: 'Each SKU appears in one line only',
  },
])
export class OrderLines extends Composite({ items: [OrderLine] }) {
  withLine(line: OrderLine): OrderLines {
    return new OrderLines({ items: [...this.items, line] });
  }

  total(): Money {
    const [first, ...rest] = this.items;
    return rest.reduce((sum, line) => sum.add(line.subtotal()), first.subtotal());
  }
}
```

Son los del pedido de `ddd-skills/ddd-agregados/references/implementacion-ts.md`. Una regla rota lanza `ValidationException` con el nombre de la regla como `code` (`hasLines`, `uniqueSku`). `OrderLines.fromPrimitives(data)` informa de cada campo inválido con su ruta (`items.1.quantity`). Líneas en monedas distintas no llegan a sumarse: `total()` lanza `CurrencyMismatch` al sumar sus `Money`.

## 8. Integración minimalista

Cuando entra información de otro contexto, modélala como value object en el contexto receptor siempre que se pueda: menos atributos de los que hacerse cargo y ninguna obligación de mantenerlos sincronizados. En IDDD, un `Moderator` de Colaboración es un valor creado a partir de `User` y `Role` de otro contexto, con pocos atributos y el rol expresado en el nombre de la clase [IDDD cap. 6]. Con el paquete sería un `Composite` con nombre (`class Moderator extends Composite({ identity: UserIdentity, name: FullName, email: Email }) {}`). Si el estado remoto debe seguir cambiando localmente, entonces sí, un agregado [IDDD cap. 6].

## 9. Tests

Los tests de value objects deben tener significado de dominio, no ser mecánicos [IDDD cap. 6]:

```ts
import { describe, expect, it } from 'vitest';

const euros = (amount: number) => Money.fromPrimitives({ amount, currency: 'EUR' });

describe('Money', () => {
  it('suma importes de la misma moneda', () => {
    expect(euros(850).add(euros(850)).equals(euros(1700))).toBe(true);
  });

  it('no permite sumar euros y dólares', () => {
    expect(() => euros(100).add(Money.fromPrimitives({ amount: 100, currency: 'USD' }))).toThrow(
      CurrencyMismatch,
    );
  });

  it('es inmutable', () => {
    const price = euros(850);
    price.times(new Quantity(2));
    expect(price.equals(euros(850))).toBe(true);
  });

  it('rechaza importes con fracciones de céntimo', () => {
    expect(() => euros(12.5)).toThrow(ValidationException);
  });
});
```

`ValidationException` se importa de `@archi-code/ddd/exceptions`.
