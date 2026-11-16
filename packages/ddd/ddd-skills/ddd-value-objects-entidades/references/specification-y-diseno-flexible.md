# Specification y diseño flexible

## Diseño flexible

* **Interfaces que revelan intención:** el nombre dice qué, no cómo: `order.cancel(requester, reason)`, no `order.setStatus('cancelled')`; nombres fluidos [IDDD cap. 5 y 6].
* **Funciones sin efectos secundarios:** los métodos de un value object lo son; recibe valores, no entidades; separa consultas de comandos [IDDD cap. 6].
* **Aserciones:** resultados e invariantes explícitos en tests y guardas [IDDD cap. 5] `[Fuera de los libros: Evans, Domain-Driven Design, 2003]`.
* **Contornos conceptuales:** si cada cambio de regla toca muchas clases, los límites están mal [IDDD cap. 6] `[Fuera de los libros: Evans 2003]`.
* **Clases autónomas:** mínimas dependencias [IDDD cap. 6] `[Fuera de los libros: Evans 2003]`.
* **Clausura de operaciones:** `Money.add(Money): Money`, `Specification.and(...)` `[Fuera de los libros: Evans 2003]`.

## Specification

Responde si un objeto cumple un criterio del negocio [IDDD cap. 5; PHP: Repositories]; sirve para validar, seleccionar o construir `[Fuera de los libros: Evans 2003]`. Úsala si la regla tiene nombre, se repite o se combina; si no, un método del agregado.

`Specification<T>` viene de `@archi-code/ddd/domain`: `isSatisfiedBy` abstracto y `and`/`or`/`not`, que devuelven otra `Specification<T>` y cortan en cuanto la respuesta está decidida (`and`/`or` aceptan cualquier `SatisfiedBy<T>`, la interfaz de los libros) `[Fuera de los libros: convención de @archi-code/ddd]`.

```ts
export class OrderAbove extends Specification<Order> {
  constructor(private readonly threshold: Money) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.total().covers(this.threshold);
  }
}

const freeExpress = new EligibleForExpressShipping(stockSnapshot).and(new OrderAbove(fiftyEuros));
```

Recibe datos ya cargados (`stockSnapshot`), nunca repositorios [IDDD cap. 10].

## Consultar

*DDD in PHP* consulta repositorios con `query(specification)` [PHP: Repositories]. Aquí no hay métodos de consulta de negocio: una selección con nombre es un `Criteria` para `search` cuando un caso de uso cambia esos agregados, o un read model cuando solo se muestra `[Fuera de los libros: convención de @archi-code/ddd]`:

```ts
const { items } = await this.orders.search(
  Criteria.create<Order>({ where: { status: new OrderStatusType(OrderStatus.PENDING) }, limit: 100 }),
);
```

Ver `ddd-skills/archi-code-ddd/criteria.md` y `ddd-skills/ddd-repositorios-persistencia/GUIA.md`. La Specification queda para validar, seleccionar sobre datos ya cargados o construir. Un lenguaje de consultas genérico es reinventar el ORM `[Fuera de los libros]`.

## Errores frecuentes

* Especificaciones sin nombre de negocio (`FieldEqualsSpecification`) o que cargan datos.
* Specification para invariantes: estas se protegen en el agregado.
* Nombres que revelan intención pero ocultan efectos (`confirm()` que envía correos).
