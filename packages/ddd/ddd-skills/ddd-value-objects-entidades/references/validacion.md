# Validación

## Tres niveles

Que todos los atributos sean válidos no implica que el objeto lo sea, y que cada objeto sea válido no implica que su composición lo sea [IDDD cap. 5]. Por eso hay tres niveles [IDDD cap. 5; PHP: Entities]:

| Nivel | Qué comprueba | Dónde |
|---|---|---|
| Atributo | Un valor aislado: formato, rango, obligatoriedad | Constructor del value object (`Required(...)` y `@Validations`); un `Composite` con reglas `custom` para lo que combina sus campos |
| Objeto completo | Combinaciones de atributos de una entidad | La propia entidad en sus métodos, o un validador separado en el mismo módulo (un servicio de dominio o `Specification`s) |
| Composición | Varios objetos o agregados juntos | Servicio de dominio que recibe lo cargado o lee por `AggregateFinder` |

IDDD llama a lo del primer nivel más bien **aserciones** que protegen el estado, no "validación" en el sentido de un framework [IDDD cap. 5]. Con el paquete, un value object que existe es válido: su constructor convierte, comprueba `Required` y ejecuta todas sus reglas, y si falla alguna lanza una `ValidationException` con todas `[Fuera de los libros: convención de @archi-code/ddd]`. A eso se suma la autorización, que no es validación del modelo: la comprueba el caso de uso (`NotAllowedException`).

## Objeto completo: ¿dentro o fuera de la entidad?

IDDD advierte que meter toda la validación en la entidad le da demasiadas responsabilidades y que la validación suele cambiar más que la entidad; propone un validador separado (Specification o Strategy) en el mismo módulo, con validación diferida [IDDD cap. 5].

Criterio práctico `[Fuera de los libros]`:
* **Invariantes** (lo que nunca puede ser falso: un pedido sin líneas) → en la entidad o el agregado, siempre. Se tratan en `ddd-skills/ddd-agregados/GUIA.md`.
* **Reglas de completitud o calidad** que dependen del momento ("para publicar, la ficha necesita al menos tres fotos") → validador separado, invocado cuando toca.

## Patrón de notificación

Para devolver todos los errores en vez de parar en el primero, IDDD y *DDD in PHP* usan un manejador de notificación que recibe los fallos [IDDD cap. 5; PHP: Entities]. Con el paquete no se escribe ese manejador `[Fuera de los libros: convención de @archi-code/ddd]`:

* **Entrada de un caso de uso:** `ValueObjectBuilder.build({...})` ejecuta todas las factorías y lanza una sola `ValidationException` cuyos `errors` (`ValidationIssue`: `{ field, code, message }`) llevan el campo y el código de cada problema; `ValueObjectBuilder.buildList` nombra los elementos de una lista por su posición (`lines.1.quantity`).

```ts
import { ValueObjectBuilder } from '@archi-code/ddd/application';

const command = ValueObjectBuilder.build({
  customerId: () => new CustomerId(input.customerId),
  email: () => new Email(input.email),
  lines: () => ValueObjectBuilder.buildList(input.lines, (line) => OrderLine.fromPrimitives(line)),
});
// input { customerId: 'x', email: 'ana', lines: [...] } → una ValidationException:
// errors: [
//   { field: 'customerId', code: 'DOM003', message: 'Validation Error: Expected a valid UUID, but received "x".' },
//   { field: 'email', code: 'isEmail', message: 'Email: Value does not satisfy isEmail' },
// ]
```

* **Un objeto ya construido** (la ficha de un producto que se quiere publicar, en el contexto de Catálogo): un servicio de dominio recoge los `ValidationIssue` y lanza una sola `new ValidationException(issues)`.

```ts
import { ValidationException } from '@archi-code/ddd/domain';
import type { ValidationIssue } from '@archi-code/ddd/domain';

export class ListingReadyToPublish {
  check(listing: ProductListing): void {
    const issues: ValidationIssue[] = [];
    if (listing.photos.value < 3) {
      issues.push({ field: 'photos', code: 'tooFewPhotos', message: 'At least 3 photos' });
    }
    if (!listing.description.isLongEnough()) {
      issues.push({ field: 'description', code: 'tooShort', message: 'Describe the product' });
    }
    if (listing.price.isZero()) {
      issues.push({ field: 'price', code: 'zeroPrice', message: 'A listing needs a price' });
    }
    if (issues.length > 0) {
      throw new ValidationException(issues);
    }
  }
}
```

`ProductListing` es un agregado con `photos` (`PhotoCount`), `description` (`ListingDescription`, con su método `isLongEnough()`) y `price` (`Money`). Nunca captures la `ValidationException` de un value object para quedarte con un valor inválido.

## Validación diferida y estados intermedios

Un agregado puede estar en un estado intermedio legítimo en el que no procede validar. Se puede modelar con un estado y publicar un evento cuando la validación ya tiene sentido [IDDD cap. 5].

## Interfaz frente a dominio

* La interfaz valida formato para dar buena experiencia (campo vacío, longitud). Eso no sustituye a la validación del modelo, donde vive el conocimiento profundo [IDDD cap. 4].
* No dupliques reglas de negocio en el esquema del DTO. Si el DTO comprueba "email válido" y `new Email(...)` también, que el DTO solo compruebe que es un `string` y deje la regla al value object `[Fuera de los libros]`. La entrada de un caso de uso llega sin validar a propósito: `toCommand` construye los value objects, así que todos los adaptadores pasan por las mismas reglas.

## Errores con nombre

`[Fuera de los libros]`
* Una clase de error por regla de negocio (`OrderMustHaveLines`, `CurrencyMismatch`), con un código estable para traducir a mensajes de usuario y a códigos HTTP en el adaptador. Con el paquete, una subclase de `DomainException` (de `@archi-code/ddd/domain`) con su código en el segundo argumento.
* No uses `Error('invalid')` en el dominio.

```ts
import { DomainException } from '@archi-code/ddd/domain';

export class OrderMustHaveLines extends DomainException {
  constructor() {
    super('An order needs at least one line', ['ORD002']);
  }
}
```

`error.code` es `'ORD002'`. En la entrada, `ExceptionClassifier.classify(error)` (de `@archi-code/ddd/infrastructure`) da el tipo de fallo sin tablas por excepción: `ExceptionKind.Invalid` para una `ValidationException` o cualquier `DomainException` (422 en HTTP) y `ExceptionKind.Malformed` para un error de conversión u obligatoriedad lanzado solo (400); el punto de entrada cambia el estado de un código cuando el negocio lo pide (`ORD001` → 409).
