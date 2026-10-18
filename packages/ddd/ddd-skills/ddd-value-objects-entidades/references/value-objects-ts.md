# Value objects en TypeScript

Contenido: 1. Patrón base · 2. Money · 3. Identificadores · 4. Valores de un atributo · 5. Rangos · 6. Tipos estándar y estados · 7. Colecciones de valores · 8. Integración minimalista · 9. Tests

## 1. Patrón base

`[Fuera de los libros: traducción a TypeScript de las características de IDDD cap. 6 y PHP: Value Objects]`

```ts
export abstract class ValueObject<Props extends object> {
  protected readonly props: Readonly<Props>;

  protected constructor(props: Props) {
    this.props = Object.freeze({ ...props });
  }

  equals(other: ValueObject<Props> | null | undefined): boolean {
    if (other == null || other.constructor !== this.constructor) return false;
    return deepEqual(this.props, other.props);
  }
}

/** Igualdad estructural: value objects anidados, fechas, arrays, bigint y objetos planos. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a instanceof ValueObject && b instanceof ValueObject) return a.equals(b);
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && Object.getPrototypeOf(x) === Object.prototype;
}
```

Decisiones:
* Constructor `protected`: solo se crea con factorías estáticas que validan.
* `Object.freeze` protege en tiempo de ejecución; `readonly` en compilación.
* `deepEqual` compara fechas por instante y colecciones elemento a elemento. Con una comparación por referencia, dos `DateRange` con las mismas fechas no serían iguales, y eso rompe la igualdad por valor [IDDD cap. 6].
* Una clase base es opcional. Si el equipo prefiere clases sueltas con su `equals`, también vale. Lo que no es opcional es la inmutabilidad y la igualdad por valor.

## 2. Money

El ejemplo canónico de *DDD in PHP* (moneda e importe juntos) [PHP: Value Objects]. Nunca `number` en coma flotante para dinero `[Fuera de los libros]`: aquí, unidades mínimas en `bigint`.

```ts
export class Currency extends ValueObject<{ code: string }> {
  private static readonly SUPPORTED = new Set(['EUR', 'USD']);
  static of(code: string): Currency {
    const upper = code.toUpperCase();
    if (!Currency.SUPPORTED.has(upper)) throw new UnsupportedCurrency(code);
    return new Currency({ code: upper });
  }
  get code(): string { return this.props.code; }
}

export class Money extends ValueObject<{ minor: bigint; currency: Currency }> {
  static of(amount: string, currency: string): Money {
    if (!/^-?\d+(\.\d{1,2})?$/.test(amount)) throw new InvalidAmount(amount);
    const [int = '0', dec = ''] = amount.split('.');
    const minor = BigInt(int) * 100n + BigInt((dec + '00').slice(0, 2)) * (amount.startsWith('-') ? -1n : 1n);
    return new Money({ minor, currency: Currency.of(currency) });
  }
  static zero(currency: string): Money {
    return new Money({ minor: 0n, currency: Currency.of(currency) });
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money({ minor: this.props.minor + other.props.minor, currency: this.props.currency });
  }
  /** Precio por cantidad: factor entero, sin redondeo. */
  multiply(times: number): Money {
    if (!Number.isInteger(times)) throw new InvalidMultiplier(times);
    return new Money({ minor: this.props.minor * BigInt(times), currency: this.props.currency });
  }

  /**
   * Descuentos, impuestos, prorrateos: factor decimal en texto ("0.21", "0.85") y redondeo explícito.
   * El modo de redondeo es una decisión de negocio (o legal); por defecto, al par más cercano.
   */
  multiplyBy(factor: string, rounding: Rounding = 'HALF_EVEN'): Money {
    if (!/^\d+(\.\d{1,6})?$/.test(factor)) throw new InvalidMultiplier(factor);
    const [int = '0', dec = ''] = factor.split('.');
    const scaled = BigInt(int + dec.padEnd(6, '0'));          // factor × 10^6
    const minor = roundDiv(this.props.minor * scaled, 1_000_000n, rounding);
    return new Money({ minor, currency: this.props.currency });
  }

  percentage(percent: string, rounding: Rounding = 'HALF_EVEN'): Money {
    if (!/^\d+(\.\d{1,4})?$/.test(percent)) throw new InvalidMultiplier(percent);
    const [int = '0', dec = ''] = percent.split('.');
    const asFactor = (BigInt(int + dec.padEnd(4, '0'))).toString().padStart(7, '0'); // percent/100 con 6 decimales
    return this.multiplyBy(`${asFactor.slice(0, -6)}.${asFactor.slice(-6)}`, rounding);
  }
  isGreaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.props.minor >= other.props.minor;
  }

  toString(): string {
    const sign = this.props.minor < 0n ? '-' : '';
    const abs = this.props.minor < 0n ? -this.props.minor : this.props.minor;
    return `${sign}${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')} ${this.props.currency.code}`;
  }

  private assertSameCurrency(other: Money): void {
    if (!this.props.currency.equals(other.props.currency)) throw new CurrencyMismatch(this, other);
  }
}

export type Rounding = 'HALF_EVEN' | 'HALF_UP';

function roundDiv(n: bigint, d: bigint, mode: Rounding): bigint {
  const q = n / d;                      // BigInt trunca hacia cero
  const r = n % d;
  if (r === 0n) return q;
  const sign = n < 0n ? -1n : 1n;
  const twice = 2n * (r < 0n ? -r : r);
  if (twice > d) return q + sign;
  if (twice < d) return q;
  return mode === 'HALF_UP' || q % 2n !== 0n ? q + sign : q;   // empate exacto
}
```

Por qué dos métodos: `multiply` es exacto (precio por cantidad) y `multiplyBy` obliga a decidir el redondeo, que en dinero nunca debe quedar implícito `[Fuera de los libros]`. Si el dominio reparte importes (pagos fraccionados), añade un `allocate` que reparta el resto de céntimos en lugar de redondear cada parte.

Todas las operaciones son funciones sin efectos secundarios: devuelven un `Money` nuevo [IDDD cap. 6].

## 3. Identificadores

Los value objects son buenos contenedores de identidad: inmutables, estables y con el comportamiento de identidad centralizado [IDDD cap. 5].

```ts
export class OrderId extends ValueObject<{ value: string }> {
  static of(value: string): OrderId {
    if (!/^ord-[0-9a-f-]{36}$/.test(value)) throw new InvalidOrderId(value);
    return new OrderId({ value });
  }
  get value(): string { return this.props.value; }
}
```

Un tipo por identificador (`OrderId`, `CustomerId`) impide pasar un id de cliente donde se espera uno de pedido. Alternativa ligera con tipos marcados `[Fuera de los libros]`, útil si el identificador no tiene comportamiento:

```ts
export type CustomerId = string & { readonly __brand: 'CustomerId' };
export const CustomerId = (v: string): CustomerId => {
  if (!v.startsWith('cus-')) throw new InvalidCustomerId(v);
  return v as CustomerId;
};
```

## 4. Valores de un atributo

¿Merece la pena envolver un único atributo? Si tiene reglas o comportamiento (formato, normalización, comparación), sí. Un booleano o un número autocontenido sin comportamiento puede quedarse como primitivo; envolver de más es un error menor y se corrige refactorizando [IDDD cap. 6].

```ts
export class Email extends ValueObject<{ value: string }> {
  static of(raw: string): Email {
    const value = raw.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new InvalidEmail(raw);
    return new Email({ value });
  }
  get domain(): string { return this.props.value.split('@')[1]; }
  get value(): string { return this.props.value; }
}
```

## 5. Rangos y todos conceptuales

Atributos que solo tienen sentido juntos forman un todo conceptual [IDDD cap. 6]. Si una entidad tiene `startDate` y `endDate` sueltos, falta un value object.

```ts
export class DateRange extends ValueObject<{ start: Date; end: Date }> {
  static of(start: Date, end: Date): DateRange {
    if (end.getTime() < start.getTime()) throw new InvalidDateRange(start, end);
    return new DateRange({ start: new Date(start), end: new Date(end) });
  }
  contains(d: Date): boolean {
    return d >= this.props.start && d <= this.props.end;
  }
  overlaps(other: DateRange): boolean {
    return this.props.start <= other.props.end && other.props.start <= this.props.end;
  }
  extendTo(newEnd: Date): DateRange {
    return DateRange.of(this.props.start, newEnd); // reemplazo, no mutación
  }
}
```

Copia las fechas al construir: `Date` es mutable en JavaScript y rompería la inmutabilidad `[Fuera de los libros]`.

## 6. Tipos estándar y estados

Los tipos estándar describen el tipo de algo (moneda, tipo de cliente, estado) [IDDD cap. 6]. IDDD los implementa como enum con comportamiento (patrón State). En TypeScript:

```ts
export class OrderStatus extends ValueObject<{ code: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'SHIPPED' }> {
  static readonly Pending = new OrderStatus({ code: 'PENDING' });
  static readonly Confirmed = new OrderStatus({ code: 'CONFIRMED' });
  static readonly Cancelled = new OrderStatus({ code: 'CANCELLED' });
  static readonly Shipped = new OrderStatus({ code: 'SHIPPED' });

  canBeConfirmed(): boolean { return this.props.code === 'PENDING'; }
  canBeCancelled(): boolean { return this.props.code === 'PENDING' || this.props.code === 'CONFIRMED'; }
  allowsLineChanges(): boolean { return this.props.code === 'PENDING'; }
  get code() { return this.props.code; }
}
```

Las reglas de transición viven en el tipo, no en `if` repartidos. El estado de disponibilidad de IDDD (`ADD_ON_NOT_ENABLED`, `NOT_REQUESTED`, `REQUESTED`, `READY`) es un ejemplo de este patrón aplicado a integración [IDDD cap. 3].

## 7. Colecciones de valores

Una colección de valores también puede ser un valor con comportamiento propio `[Fuera de los libros]`:

```ts
export class OrderLines {
  private constructor(private readonly items: readonly OrderLine[]) {}
  static of(items: OrderLine[]): OrderLines {
    if (items.length === 0) throw new OrderMustHaveLines();
    const skus = new Set(items.map((l) => l.sku.value));
    if (skus.size !== items.length) throw new DuplicatedSkuInOrder();
    return new OrderLines([...items]);
  }
  total(): Money {
    return this.items.reduce((acc, l) => acc.add(l.subtotal()), Money.zero(this.items[0].unitPrice.currency.code));
  }
  withQuantity(sku: Sku, qty: Quantity): OrderLines {
    return OrderLines.of(this.items.map((l) => (l.sku.equals(sku) ? l.withQuantity(qty) : l)));
  }
  toArray(): readonly OrderLine[] { return this.items; }
}
```

## 8. Integración minimalista

Cuando entra información de otro contexto, modélala como value object en el contexto receptor siempre que se pueda: menos atributos de los que hacerse cargo y ninguna obligación de mantenerlos sincronizados. En IDDD, un `Moderator` de Colaboración es un valor creado a partir de `User` y `Role` de otro contexto, con pocos atributos y el rol expresado en el nombre de la clase [IDDD cap. 6]. Si el estado remoto debe seguir cambiando localmente, entonces sí, un agregado [IDDD cap. 6].

## 9. Tests

Los tests de value objects deben tener significado de dominio, no ser mecánicos [IDDD cap. 6]:

```ts
it('suma importes de la misma moneda', () => {
  expect(Money.of('8.50', 'EUR').add(Money.of('8.50', 'EUR')).equals(Money.of('17.00', 'EUR'))).toBe(true);
});
it('no permite sumar euros y dólares', () => {
  expect(() => Money.of('1.00', 'EUR').add(Money.of('1.00', 'USD'))).toThrow(CurrencyMismatch);
});
it('es inmutable', () => {
  const precio = Money.of('8.50', 'EUR');
  precio.multiply(2);
  expect(precio.equals(Money.of('8.50', 'EUR'))).toBe(true);
});
```
