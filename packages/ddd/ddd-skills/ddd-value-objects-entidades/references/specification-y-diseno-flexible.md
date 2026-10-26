# Specification y diseño flexible (Supple Design)

Contenido: 1. Diseño flexible · 2. Specification · 3. Specification para consultar · 4. Errores frecuentes

## 1. Diseño flexible

Conjunto de patrones de Evans para que el modelo sea fácil de usar y de cambiar. IDDD aplica varios de ellos de forma explícita; los que no aparecen en las fuentes del proyecto se marcan `[Fuera de los libros: Evans, Domain-Driven Design, 2003]`.

### Intention Revealing Interfaces

Los nombres de clases y métodos dicen **qué** consiguen, en el lenguaje ubicuo, no **cómo**. IDDD lo ilustra con `Tenant.activate()` y `deactivate()` en lugar de `setActive(boolean)`: varios setters para una sola petición vuelven ambigua la intención y complican publicar un único evento con significado [IDDD cap. 5, citando a Evans]. IDDD defiende también nombres fluidos (`valuePercentage()` frente a `getValuePercentage()`) [IDDD cap. 6].

```ts
order.setStatus('cancelled');
price.amount.value * 21 / 100;
```

```ts
order.cancel(new CancellationReason('customer request'), clock);
price.percentage('21');
```

El primero revela cómo; el segundo, la intención (`CancellationReason` es un `Required(StringType)` con nombre y `percentage` el de `Money` en `ddd-skills/ddd-value-objects-entidades/references/value-objects-ts.md`).

### Side-Effect-Free Functions

Las operaciones que devuelven un resultado no cambian estado observable. En los value objects todos los métodos lo son, porque son inmutables [IDDD cap. 6]. Pasa solo valores como argumentos, no entidades: así se puede demostrar que no hay efectos secundarios [IDDD cap. 6]. Aplica también a entidades: separa consultas (devuelven algo, no cambian nada) de comandos (cambian estado, no devuelven datos de negocio).

### Assertions

`[Fuera de los libros: Evans 2003]`. Cuando una operación sí tiene efectos, haz explícitos sus resultados y las invariantes que mantiene: en los tests (tests de aceptación con lenguaje del negocio) y en guardas del código. IDDD trata las guardas de autoencapsulación como aserciones que protegen el estado [IDDD cap. 5].

### Conceptual Contours

`[Fuera de los libros: Evans 2003]`. Divide los objetos y operaciones siguiendo las líneas naturales del dominio, de modo que los cambios habituales del negocio afecten a una sola pieza. Señal práctica: si cada cambio de regla toca muchas clases a la vez, los contornos están mal trazados. Es la misma intuición que lleva a los "todos conceptuales" de los value objects [IDDD cap. 6].

### Standalone Classes

`[Fuera de los libros: Evans 2003]`. Reduce las dependencias de cada clase al mínimo imprescindible. Los value objects que solo dependen de su propio tipo y de sus atributos son el caso ideal, y IDDD recomienda exactamente eso [IDDD cap. 6].

### Closure of Operations

`[Fuera de los libros: Evans 2003]`. Cuando sea natural, una operación devuelve el mismo tipo que recibe: `Money.add(Money): Money`, `DateRange.extendTo(EndDate): DateRange`, `Specification.and(Specification): Specification`. Permite combinar operaciones sin introducir conceptos nuevos.

## 2. Specification

Un objeto que responde si otro objeto cumple un criterio del negocio. Evans y Fowler lo describen; IDDD lo propone como forma de implementar validadores de objetos completos [IDDD cap. 5, citando a Evans y Fowler] y *DDD in PHP* lo usa para consultar repositorios [PHP: Repositories; PHP: Factories].

Tres usos clásicos `[Fuera de los libros: Evans 2003]`:
1. **Validar:** ¿este objeto cumple la regla?
2. **Seleccionar:** ¿qué objetos de una colección la cumplen?
3. **Construir a la carta:** crear algo que cumpla la regla.

Cuándo merece la pena: la regla tiene nombre en el lenguaje ("cliente moroso", "pedido apto para envío urgente"), se usa en varios sitios o se combina con otras. Si es una condición de una línea usada una vez, un método del agregado basta.

No se escribe la base ni las combinaciones: `Specification<T>` viene de `@archi-code/ddd/domain`. Declara `isSatisfiedBy` como abstracto y da `and`, `or` y `not`, que devuelven otra `Specification<T>` (clausura de operaciones: se pueden seguir encadenando) y cortan en cuanto la respuesta está decidida. `and` y `or` aceptan cualquier `SatisfiedBy<T>` (un objeto con `isSatisfiedBy`), que es la interfaz `Specification` de los libros [IDDD cap. 5].

Reglas de negocio con nombre:

```ts
import { Specification } from '@archi-code/ddd/domain';

export interface StockSnapshot {
  covers(sku: Sku, quantity: Quantity): boolean;
}

export class EligibleForExpressShipping extends Specification<Order> {
  constructor(private readonly centralStock: StockSnapshot) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return (
      order.shippingAddress.country.value === 'ES' &&
      order.lines.items.every((line) => this.centralStock.covers(line.sku, line.quantity))
    );
  }
}

export class OrderAbove extends Specification<Order> {
  constructor(private readonly threshold: Money) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.total().covers(this.threshold);
  }
}

const freeExpress = new EligibleForExpressShipping(stock).and(
  new OrderAbove(Money.fromPrimitives({ amount: 5000, currency: 'EUR' })),
);
freeExpress.isSatisfiedBy(order);
```

`Order`, `Money`, `Sku` y `Quantity` son los de `ddd-skills/ddd-agregados/references/implementacion-ts.md`. La especificación recibe datos de otros agregados ya cargados (`StockSnapshot`), no repositorios: misma regla que para los agregados [IDDD cap. 10].

## 3. Specification para consultar

*DDD in PHP* propone sustituir los métodos `find...` que crecen sin fin en los repositorios por un método `query(specification)` [PHP: Repositories; PHP: Factories]. Aquí no se hace: el repositorio solo obtiene y persiste, sin lógica ni consultas de negocio `[Fuera de los libros: convención de @archi-code/ddd]`. Una selección con nombre del negocio ("pedidos pendientes desde hace más de un día") es una consulta de lectura: una interfaz en `application/`, implementada en infraestructura directamente sobre la base de datos, que devuelve ids o DTOs.

```ts
export interface StaleOrders {
  ids(pendingSince: Date, limit: number): Promise<OrderId[]>;
}
```

La interfaz vive en `application/` y su implementación (`PgStaleOrders`, una consulta SQL; los filtros pueden escribirse con `@archi-code/criteria`) en infraestructura. Quien la usa (un programador de tareas, por ejemplo) ejecuta un caso de uso por cada id, y ese caso de uso carga el pedido con `OrderRepository` (`findById`).

La Specification se queda para validar, seleccionar sobre datos ya cargados o construir.

Úsalo con mesura `[Fuera de los libros]`: si acabas construyendo un lenguaje de consultas genérico, has reinventado el ORM. Para pantallas, mejor consultas de lectura (`ddd-skills/ddd-repositorios-persistencia/GUIA.md`).

## 4. Errores frecuentes

* Especificaciones genéricas sin nombre de negocio (`FieldEqualsSpecification`).
* Especificaciones que cargan datos por su cuenta (inyectan repositorios).
* Usar Specification para invariantes del agregado: la invariante se protege dentro del agregado, siempre; la especificación sirve para validar, seleccionar o construir.
* Interfaces que revelan intención en el nombre pero no en el comportamiento: `confirm()` que en realidad también envía correos.
