# Persistir value objects

El modelo de datos se subordina al de dominio: claves, integridad referencial e índices no dictan el modelo; la analítica, mejor sobre su propio modelo [IDDD cap. 6]. ¿Entidad "porque tiene tabla"? Si describe, tiene características de valor y no exige identidad → value object [IDDD cap. 6].

| Opción [IDDD cap. 6; PHP: Value Objects] | Cuándo |
|---|---|
| Columnas en la fila del padre | Un valor; por defecto |
| JSON en una columna | Colecciones pequeñas que no se consultan (`jsonb`); cuidado con tamaño y consulta |
| Tabla propia o de unión | Colecciones grandes o consultadas; en el modelo sigue siendo valor |
| Código del enum | Estados |

## Con @archi-code/ddd

`[Fuera de los libros: convención de @archi-code/ddd]`
* Sin mappers ni decoradores de ORM: el repositorio llama a `order.toPrimitives()` y `Order.fromPrimitives(...)`; la versión va junto a los primitivos, nunca dentro, y la recuerda el repositorio en su `WeakMap`.
* Los primitivos ya dan la forma: valor simple → su valor, `Composite` → objeto, lista → lista, `EnumType` → su opción.
* Un almacén de documentos guarda los primitivos tal cual; con tablas, el repositorio los reparte en columnas:

```ts
function rowOf(order: Order, version: number): OrderRow {
  const p = order.toPrimitives();
  return {
    id: p.id,
    ship_city: p.shippingAddress.city,
    lines: p.lines.items,
    status: p.status,
    version: version + 1,
  };
}
```

* Al cargar, `fromPrimitives` valida: un dato corrupto falla al cargar (`ValidationException`), sin repetir reglas de creación ni registrar eventos. Un test de ida y vuelta del agregado prueba que no se pierde ningún campo.
* Con `pg`, el parámetro `jsonb` se pasa con `JSON.stringify`. Con Prisma o Drizzle el esquema es de infraestructura. Versión y consulta condicionada: `ddd-skills/ddd-repositorios-persistencia/GUIA.md`.
