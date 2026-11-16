# Value objects en TypeScript

## Qué clase usar

`[Fuera de los libros: convención de @archi-code/ddd]` Inmutabilidad, validez y igualdad por valor [IDDD cap. 6; PHP: Value Objects] ya las da el paquete (`@archi-code/ddd/domain`):

| Necesitas | Clase |
|---|---|
| Un atributo | Subclase de `StringType`, `NumberType`, `BooleanType`, `DateType`, `UuidType`; obligatoria con `Required(XType)` |
| Un id | `IdType<'XId'>` |
| Un estado | `EnumType<E>` |
| Varios atributos | `Composite({ campo: Clase })`, listas `[Clase]` |
| Un tipo propio | `AbstractType<T>` con `protected filter(value: unknown): T` |

```ts
@Validations([{ validator: 'isEmail' }])
export class Email extends Required(StringType) {
  protected filter(value: unknown): string {
    return super.filter(value).trim().toLowerCase();
  }
}

new Email('x'); // ValidationException: Email: Value does not satisfy isEmail
```

* El constructor convierte, comprueba `Required` y ejecuta `@Validations`; la normalización va en `filter` antes de las reglas.
* `equals` compara clase y valor (fechas por instante, listas y objetos por contenido): `BillingCountry('ES')` ≠ `ShippingCountry('ES')`.
* `DateType` guarda una fecha inmutable y rechaza fecha-hora sin zona; un `Composite` está congelado.
* Envolver un atributo sin reglas es opcional en los libros [IDDD cap. 6]; aquí todo el estado del agregado es value objects, también un booleano `[Fuera de los libros: convención de @archi-code/ddd]`.

## Money

Moneda e importe juntos [PHP: Value Objects]; nunca coma flotante `[Fuera de los libros]`. Céntimos enteros seguros (hasta `Number.MAX_SAFE_INTEGER`) porque el paquete no tiene `bigint` `[Fuera de los libros: convención de @archi-code/ddd]`. Vive en `shared-kernel/money/`, un fichero por clase:

```ts
export class CentsAmount extends AbstractType<number> {
  protected filter(value: unknown): number {
    const cents = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    if (typeof cents !== 'number' || !Number.isSafeInteger(cents) || cents < 0) {
      throw new TypePrimitiveException('amount in cents', value);
    }
    return cents;
  }
}

export class Cents extends Required(CentsAmount) {}

@Validations([{ validator: 'isISO4217' }])
export class MoneyCurrency extends Required(StringType) {
  protected filter(value: unknown): string {
    return super.filter(value).trim().toUpperCase();
  }
}

export class Money extends Composite({ amount: Cents, currency: MoneyCurrency }) {
  add(other: Money): Money {
    if (!this.currency.equals(other.currency)) {
      throw new CurrencyMismatch(this.currency.value, other.currency.value);
    }
    return this.withCents(this.amount.value + other.amount.value);
  }

  times(quantity: Quantity): Money {
    return this.withCents(this.amount.value * quantity.value);
  }

  covers(other: Money): boolean {
    return this.currency.equals(other.currency) && this.amount.value >= other.amount.value;
  }

  isZero(): boolean {
    return this.amount.value === 0;
  }

  private withCents(cents: number): Money {
    return new Money({ amount: new Cents(cents), currency: this.currency });
  }
}
```

* Funciones sin efectos: devuelven un `Money` nuevo [IDDD cap. 6]. `CurrencyMismatch` es un `DomainException` (`MNY001`).
* `times` es exacto; una multiplicación por decimal (`multiplyBy(factor, rounding)`, calculada en `bigint`) exige elegir el redondeo, que nunca queda implícito; para repartir importes, `allocate` reparte el resto `[Fuera de los libros]`.

## Identificadores

Contenedores de identidad inmutables [IDDD cap. 5]:

```ts
export class OrderId extends IdType<'OrderId'> {}
export class OrderReference extends Required(UuidType) {}

export class PaymentId extends IdType<'PaymentId'> {
  static forOrder(order: OrderReference): PaymentId {
    return new PaymentId(UuidType.fromValue(`payment-of-order:${order.value}`));
  }
}

const orderId: OrderId = CustomerId.generate(); // error de compilación por la marca
```

`[Fuera de los libros: convención de @archi-code/ddd]`
* `IdType` acepta cualquier UUID, lo guarda en minúsculas y rechaza el nulo. La marca (`IdType<'OrderId'>`) distingue ids en compilación; ponla siempre (un `IdType` sin marca solo sirve como tipo de cualquier id, `AggregateRoot<IdType>`).
* Un id derivado (uno por agregado de otro contexto) hace que una reacción repetida lo encuentre. El caso de uso calcula el id y lo pasa a `create`; el agregado nunca lo genera. Un agregado de otro contexto se referencia con un `UuidType` propio, nunca con la clase de id del otro contexto.
* Una identidad del usuario o de otro sistema (`CampaignCode`) es un `Required(StringType)` con reglas.

## Rangos y todos conceptuales

Atributos que solo tienen sentido juntos [IDDD cap. 6] (`startDate`/`endDate` sueltos) → `Composite({ start: StartDate, end: EndDate })` con la regla que los combina como `custom` de `@Validations` (su `fn` recibe el composite construido). Sus operaciones (`extendTo(end)`) devuelven un rango nuevo que vuelve a pasar la regla.

## Estados

Tipo estándar [IDDD cap. 6], con el comportamiento en el tipo obligatorio `[Fuera de los libros: convención de @archi-code/ddd]`:

```ts
export enum OrderStatus { PENDING = 'pending', CONFIRMED = 'confirmed', CANCELLED = 'cancelled' }

export class OrderStatusOption extends EnumType<OrderStatus> {
  protected getEnum(): typeof OrderStatus {
    return OrderStatus;
  }
}

export class OrderStatusType extends Required(OrderStatusOption) {
  canBeCancelled(): boolean {
    return this.value !== OrderStatus.CANCELLED;
  }
}
```

Las transiciones viven en el tipo o en el agregado (`isIn(OrderStatus.PENDING)`), no en `if` repartidos. Valores del enum en snake_case; un estado opcional es solo `extends EnumType<E>`. Su primitivo es la opción del enum (`fromPrimitives` sin conversión; desde texto de entrada, con cast).

## Colecciones de valores

Una colección puede ser un valor `[Fuera de los libros]`: `Composite` con campo lista; `ArrayType` solo guarda value objects simples, nunca composites:

```ts
export class OrderLine extends Composite({ sku: Sku, quantity: Quantity, unitPrice: Money }) {
  subtotal(): Money {
    return this.unitPrice.times(this.quantity);
  }
}

@Validations([
  { custom: 'hasLines', fn: (l) => (l as OrderLines).items.length > 0, message: 'An order needs at least one line' },
  {
    custom: 'uniqueSku',
    fn: (l) => new Set((l as OrderLines).items.map((line) => line.sku.value)).size === (l as OrderLines).items.length,
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

Una regla rota lanza `ValidationException` con el nombre de la regla como `code` (`hasLines`); `OrderLines.fromPrimitives` informa de cada campo con su ruta (`items.1.quantity`); monedas distintas lanzan `CurrencyMismatch` en `total()`.

## Integración minimalista

Lo que llega de otro contexto, como valor en el receptor siempre que se pueda (`Moderator` a partir de `User` y `Role`) [IDDD cap. 6]: aquí un `Composite` con nombre. Si debe cambiar localmente, agregado [IDDD cap. 6].

## Tests

Con significado de dominio, no mecánicos [IDDD cap. 6]: suma de la misma moneda, `CurrencyMismatch` entre monedas, inmutabilidad, rechazo de fracciones de céntimo (`ValidationException`).
