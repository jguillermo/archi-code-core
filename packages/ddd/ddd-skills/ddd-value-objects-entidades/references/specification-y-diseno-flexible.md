# Specification y diseño flexible (Supple Design)

Contenido: 1. Diseño flexible · 2. Specification · 3. Specification para consultar · 4. Errores frecuentes

## 1. Diseño flexible

Conjunto de patrones de Evans para que el modelo sea fácil de usar y de cambiar. IDDD aplica varios de ellos de forma explícita; los que no aparecen en las fuentes del proyecto se marcan `[Fuera de los libros: Evans, Domain-Driven Design, 2003]`.

### Intention Revealing Interfaces

Los nombres de clases y métodos dicen **qué** consiguen, en el lenguaje ubicuo, no **cómo**. IDDD lo ilustra con `Tenant.activate()` y `deactivate()` en lugar de `setActive(boolean)`: varios setters para una sola petición vuelven ambigua la intención y complican publicar un único evento con significado [IDDD cap. 5, citando a Evans]. IDDD defiende también nombres fluidos (`valuePercentage()` frente a `getValuePercentage()`) [IDDD cap. 6].

```ts
// Revela cómo                       // Revela intención
order.setStatus('CANCELLED');        order.cancel(CancellationReason.customerRequest());
money.getMinor() * 21 / 100;         money.percentage('21');
```

### Side-Effect-Free Functions

Las operaciones que devuelven un resultado no cambian estado observable. En los value objects todos los métodos lo son, porque son inmutables [IDDD cap. 6]. Pasa solo valores como argumentos, no entidades: así se puede demostrar que no hay efectos secundarios [IDDD cap. 6]. Aplica también a entidades: separa consultas (devuelven algo, no cambian nada) de comandos (cambian estado, no devuelven datos de negocio).

### Assertions

`[Fuera de los libros: Evans 2003]`. Cuando una operación sí tiene efectos, haz explícitos sus resultados y las invariantes que mantiene: en los tests (tests de aceptación con lenguaje del negocio, ver `ddd-skills/ddd-descubrimiento-dominio/GUIA.md`) y en guardas del código. IDDD trata las guardas de autoencapsulación como aserciones que protegen el estado [IDDD cap. 5].

### Conceptual Contours

`[Fuera de los libros: Evans 2003]`. Divide los objetos y operaciones siguiendo las líneas naturales del dominio, de modo que los cambios habituales del negocio afecten a una sola pieza. Señal práctica: si cada cambio de regla toca muchas clases a la vez, los contornos están mal trazados. Es la misma intuición que lleva a los "todos conceptuales" de los value objects [IDDD cap. 6].

### Standalone Classes

`[Fuera de los libros: Evans 2003]`. Reduce las dependencias de cada clase al mínimo imprescindible. Los value objects que solo dependen de su propio tipo y de sus atributos son el caso ideal, y IDDD recomienda exactamente eso [IDDD cap. 6].

### Closure of Operations

`[Fuera de los libros: Evans 2003]`. Cuando sea natural, una operación devuelve el mismo tipo que recibe: `Money.add(Money): Money`, `DateRange.extendTo(Date): DateRange`, `Specification.and(Specification): Specification`. Permite combinar operaciones sin introducir conceptos nuevos.

## 2. Specification

Un objeto que responde si otro objeto cumple un criterio del negocio. Evans y Fowler lo describen; IDDD lo propone como forma de implementar validadores de objetos completos [IDDD cap. 5, citando a Evans y Fowler] y *DDD in PHP* lo usa para consultar repositorios [PHP: Repositories; PHP: Factories].

Tres usos clásicos `[Fuera de los libros: Evans 2003]`:
1. **Validar:** ¿este objeto cumple la regla?
2. **Seleccionar:** ¿qué objetos de una colección la cumplen?
3. **Construir a la carta:** crear algo que cumpla la regla.

Cuándo merece la pena: la regla tiene nombre en el lenguaje ("cliente moroso", "pedido apto para envío urgente"), se usa en varios sitios o se combina con otras. Si es una condición de una línea usada una vez, un método del agregado basta.

```ts
export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
}

export abstract class CompositeSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;
  // Devuelven CompositeSpecification (clausura de operaciones): se pueden seguir encadenando.
  and(other: Specification<T>): CompositeSpecification<T> { return new AndSpec(this, other); }
  or(other: Specification<T>): CompositeSpecification<T> { return new OrSpec(this, other); }
  not(): CompositeSpecification<T> { return new NotSpec(this); }
}

class AndSpec<T> extends CompositeSpecification<T> {
  constructor(private readonly a: Specification<T>, private readonly b: Specification<T>) { super(); }
  isSatisfiedBy(c: T) { return this.a.isSatisfiedBy(c) && this.b.isSatisfiedBy(c); }
}
class OrSpec<T> extends CompositeSpecification<T> {
  constructor(private readonly a: Specification<T>, private readonly b: Specification<T>) { super(); }
  isSatisfiedBy(c: T) { return this.a.isSatisfiedBy(c) || this.b.isSatisfiedBy(c); }
}
class NotSpec<T> extends CompositeSpecification<T> {
  constructor(private readonly s: Specification<T>) { super(); }
  isSatisfiedBy(c: T) { return !this.s.isSatisfiedBy(c); }
}
```

Reglas de negocio con nombre:

```ts
/** Apto para envío urgente: destino peninsular y todas las líneas con stock en el almacén central. */
export class EligibleForExpressShipping extends CompositeSpecification<Order> {
  constructor(private readonly centralStock: StockSnapshot) { super(); }
  isSatisfiedBy(order: Order): boolean {
    return order.destinationZone().equals(Zone.Peninsula)
      && order.lines().every((l) => this.centralStock.covers(l.sku, l.quantity));
  }
}

export class OrderAbove extends CompositeSpecification<Order> {
  constructor(private readonly threshold: Money) { super(); }
  isSatisfiedBy(order: Order) { return order.total().isGreaterThanOrEqual(this.threshold); }
}

// Combinación con lenguaje del negocio
const freeExpress = new EligibleForExpressShipping(stock).and(new OrderAbove(Money.of('50.00', 'EUR')));
```

La especificación recibe datos de otros agregados ya cargados (`StockSnapshot`), no repositorios: misma regla que para los agregados [IDDD cap. 10].

## 3. Specification para consultar

*DDD in PHP* propone sustituir los métodos `find...` que crecen sin fin en los repositorios por un método `query(specification)`. Para no acoplar el servicio a una implementación concreta (SQL o memoria), las especificaciones se crean con una fábrica abstracta cuya implementación depende de la infraestructura [PHP: Repositories; PHP: Factories].

```ts
// Dominio
export interface OrderSpecificationFactory {
  pendingOlderThan(moment: Date): OrderQuerySpecification;
}
export interface OrderRepository {
  query(spec: OrderQuerySpecification, limit: number): Promise<Order[]>;
}
// Infraestructura: PgOrderSpecificationFactory produce especificaciones que saben generar SQL;
// InMemoryOrderSpecificationFactory, especificaciones que filtran en memoria.
```

Úsalo con mesura `[Fuera de los libros]`: si acabas construyendo un lenguaje de consultas genérico, has reinventado el ORM. Para pantallas, mejor consultas de lectura (`ddd-skills/ddd-repositorios-persistencia/GUIA.md`).

## 4. Errores frecuentes

* Especificaciones genéricas sin nombre de negocio (`FieldEqualsSpecification`).
* Especificaciones que cargan datos por su cuenta (inyectan repositorios).
* Usar Specification para invariantes del agregado: la invariante se protege dentro del agregado, siempre; la especificación sirve para validar, seleccionar o construir.
* Interfaces que revelan intención en el nombre pero no en el comportamiento: `confirm()` que en realidad también envía correos.
