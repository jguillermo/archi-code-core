# Value objects en TypeScript

Código de todo lo que sigue (atributos, `Required`, ids, estados, listas, `Composite`, `Money`, JSON): `ddd-skills/archi-code-ddd/value-objects.md`, apartado Code. Aquí queda el diseño.

## Qué es un valor

Mide, cuantifica o describe; es inmutable, forma un todo conceptual, se reemplaza entero, se compara por valor y sus métodos no tienen efectos secundarios [IDDD cap. 6; PHP: Value Objects]. Envolver un atributo sin reglas es opcional en los libros [IDDD cap. 6]; aquí todo el estado del agregado es value objects, también un booleano `[Fuera de los libros: convención de @archi-code/ddd]`.

## Money

Moneda e importe juntos [PHP: Value Objects]; nunca coma flotante `[Fuera de los libros]`. Céntimos enteros seguros (hasta `Number.MAX_SAFE_INTEGER`) porque el paquete no tiene `bigint` `[Fuera de los libros: convención de @archi-code/ddd]`. Vive en `shared-kernel/money/`.

* Funciones sin efectos: cada operación devuelve un `Money` nuevo [IDDD cap. 6]; sumar monedas distintas es un error de negocio (`CurrencyMismatch`).
* Una multiplicación por decimal (`multiplyBy(factor, rounding)`, calculada en `bigint`) exige elegir el redondeo, que nunca queda implícito; para repartir importes, `allocate` reparte el resto `[Fuera de los libros]`.

## Identificadores

Contenedores de identidad inmutables [IDDD cap. 5]. `[Fuera de los libros: convención de @archi-code/ddd]`:

* Cada id lleva su marca, para que el compilador no tome el id de un agregado por el de otro.
* Un id derivado (uno por agregado de otro contexto) hace que una reacción repetida lo encuentre. El caso de uso calcula el id y lo pasa a `create`; el agregado nunca lo genera. Un agregado de otro contexto se referencia con un tipo propio, nunca con la clase de id del otro contexto.
* Una identidad del usuario o de otro sistema (`CampaignCode`) es un `Required(StringType)` con nombre y reglas.

## Rangos y todos conceptuales

Atributos que solo tienen sentido juntos [IDDD cap. 6] (`startDate`/`endDate` sueltos) → un `Composite` con la regla que los combina sobre el composite construido. Sus operaciones (`extendTo(end)`) devuelven un rango nuevo que vuelve a pasar la regla.

## Estados

Tipo estándar [IDDD cap. 6], con el comportamiento en el tipo obligatorio `[Fuera de los libros: convención de @archi-code/ddd]` (`OrderStatusType.canBeCancelled()`). Las transiciones viven en el tipo o en el agregado (`isIn(OrderStatus.PENDING)`), no en `if` repartidos.

## Colecciones de valores

Una colección puede ser un valor `[Fuera de los libros]`: un `Composite` con campo lista y las reglas de la colección entera (al menos un elemento, sin repetidos). Una regla rota informa con su nombre; un elemento inválido, con su ruta (`items.1.quantity`).

## Piezas del ejemplo de Ventas

Diseño de las piezas de `ddd-skills/ddd-value-objects-entidades/references/ejemplo-ecommerce.md`; su forma es la de los ejemplos de `ddd-skills/archi-code-ddd/value-objects.md` (`Money`, `Sku`, `Quantity`, el estado como `PaymentStatusType`, la lista como `ShipmentContents`):

| Pieza | Campos | Reglas y operaciones |
|---|---|---|
| `Money` | `amount: Cents`, `currency: MoneyCurrency` | `add`, multiplicar por unidades, comparar; `CurrencyMismatch` (`MNY001`) |
| `Quantity`, `Sku` | un atributo | entero positivo; formato del SKU |
| `OrderLine` | `sku`, `quantity`, `unitPrice: Money` | `subtotal()` |
| `OrderLines` | `items: [OrderLine]` | al menos una línea, un SKU por línea; `withLine(line)` devuelve otra colección, `total()` |
| `OrderStatusType` | `pending`, `confirmed`, `cancelled` | `canBeCancelled()` |

## Integración minimalista

Lo que llega de otro contexto, como valor en el receptor siempre que se pueda (`Moderator` a partir de `User` y `Role`) [IDDD cap. 6]: aquí un `Composite` con nombre. Si debe cambiar localmente, agregado [IDDD cap. 6].

## Tests

Con significado de dominio, no mecánicos [IDDD cap. 6]: suma de la misma moneda, `CurrencyMismatch` entre monedas, inmutabilidad, rechazo de fracciones de céntimo (`TypePrimitiveException`).
