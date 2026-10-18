# Validación

## Tres niveles

Que todos los atributos sean válidos no implica que el objeto lo sea, y que cada objeto sea válido no implica que su composición lo sea [IDDD cap. 5]. Por eso hay tres niveles [IDDD cap. 5; PHP: Entities]:

| Nivel | Qué comprueba | Dónde |
|---|---|---|
| Atributo | Un valor aislado: formato, rango, obligatoriedad | Factoría del value object; asignación protegida en la entidad (autoencapsulación) |
| Objeto completo | Combinaciones de atributos de una entidad | La propia entidad en sus métodos, o un validador separado en el mismo módulo |
| Composición | Varios objetos o agregados juntos | Servicio de dominio que lee lo necesario por repositorio |

IDDD llama a lo del primer nivel más bien **aserciones** que protegen el estado, no "validación" en el sentido de un framework [IDDD cap. 5].

## Objeto completo: ¿dentro o fuera de la entidad?

IDDD advierte que meter toda la validación en la entidad le da demasiadas responsabilidades y que la validación suele cambiar más que la entidad; propone un validador separado (Specification o Strategy) en el mismo módulo, con validación diferida [IDDD cap. 5].

Criterio práctico `[Fuera de los libros]`:
* **Invariantes** (lo que nunca puede ser falso: un pedido sin líneas) → en la entidad o el agregado, siempre. Se tratan en `ddd-agregados`.
* **Reglas de completitud o calidad** que dependen del momento ("para publicar, la ficha necesita al menos tres fotos") → validador separado, invocado cuando toca.

## Patrón de notificación

Para devolver todos los errores en vez de parar en el primero, IDDD y *DDD in PHP* usan un manejador de notificación que recibe los fallos [IDDD cap. 5; PHP: Entities]:

```ts
export interface ValidationNotificationHandler {
  handleError(code: string, detail?: Record<string, unknown>): void;
}

export class ProductListingValidator {
  constructor(private readonly handler: ValidationNotificationHandler) {}

  validate(listing: ProductListing): void {
    if (listing.photos.length < 3) this.handler.handleError('listing.photos.too_few', { min: 3 });
    if (!listing.description.isLongEnough()) this.handler.handleError('listing.description.too_short');
    if (listing.price.isZero()) this.handler.handleError('listing.price.zero');
  }
}
```

## Validación diferida y estados intermedios

Un agregado puede estar en un estado intermedio legítimo en el que no procede validar. Se puede modelar con un estado y publicar un evento cuando la validación ya tiene sentido [IDDD cap. 5].

## Interfaz frente a dominio

* La interfaz valida formato para dar buena experiencia (campo vacío, longitud). Eso no sustituye a la validación del modelo, donde vive el conocimiento profundo [IDDD cap. 4].
* No dupliques reglas de negocio en el esquema del DTO. Si el DTO comprueba "email válido" y `Email.of` también, que el DTO solo compruebe que es un `string` y deje la regla al value object `[Fuera de los libros]`.

## Errores con nombre

`[Fuera de los libros]`
* Una clase de error por regla de negocio (`OrderMustHaveLines`, `CurrencyMismatch`), con un `code` estable para traducir a mensajes de usuario y a códigos HTTP en el adaptador.
* No uses `Error('invalid')` en el dominio.

```ts
export abstract class DomainError extends Error {
  abstract readonly code: string;
}
export class OrderMustHaveLines extends DomainError {
  readonly code = 'order.lines.empty';
  constructor() { super('Un pedido necesita al menos una línea'); }
}
```
