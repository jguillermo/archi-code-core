# Ejemplo: Ventas en la tienda online

Solo valor o entidad; los límites se deciden en `ddd-skills/ddd-agregados/GUIA.md`.

| Concepto | Decisión | Razón | Con el paquete |
|---|---|---|---|
| `Money` | Valor | Cuantifica, se reemplaza | `Composite({ amount: Cents, currency: MoneyCurrency })` en `shared-kernel/money/` |
| `Quantity` | Valor | Entero positivo | `Required(NumberType)` + `@Validations` |
| `Sku` | Valor | Producto de otro contexto (integración minimalista) | `Required(StringType)` |
| `OrderLine` | Valor | Se identifica por su `Sku` dentro del pedido | `Composite` |
| `OrderLines` | Valor | Al menos una línea, un SKU por línea | `Composite({ items: [OrderLine] })` |
| `ShippingAddress` | Valor | Describe a dónde va el pedido | `Composite({ street, city, country })` |
| `OrderStatusType` | Tipo estándar | Transiciones en un sitio | `OrderStatusType.ts` |
| `Order` | Entidad | Ciclo de vida e identidad propios | `AggregateRoot<OrderId>` |

Diseño de los valores en `ddd-skills/ddd-value-objects-entidades/references/value-objects-ts.md` y su código en `ddd-skills/archi-code-ddd/value-objects.md`; `Order` en `ddd-skills/ddd-agregados/references/implementacion-ts.md`.

* `Order` delega en sus valores (`OrderLines.total`, `withLine`): entidad como contenedor de valores [IDDD cap. 6]. `addLine` reemplaza `OrderLines` entero, nunca cambia una línea por dentro.
* Referencia al cliente por id (`customerId: CustomerId`), nunca por el objeto.
* Test de ida y vuelta por agregado `[Fuera de los libros: convención de @archi-code/ddd]`; código en `ddd-skills/archi-code-ddd/tests.md`.
