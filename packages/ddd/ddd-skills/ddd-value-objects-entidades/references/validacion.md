# Validación

## Tres niveles

Atributos válidos no hacen válido al objeto, ni objetos válidos su composición [IDDD cap. 5; PHP: Entities]:

| Nivel | Dónde |
|---|---|
| Atributo | Constructor del value object (`Required`, `@Validations`); reglas `custom` de un `Composite` |
| Objeto completo | La entidad, o un validador aparte en el mismo módulo (servicio de dominio, `Specification`), con validación diferida |
| Composición | Servicio de dominio con lo cargado, o que lee con el repositorio abstracto (`findById`) recibido por constructor |

El primer nivel son aserciones que protegen el estado [IDDD cap. 5]. La autorización no es validación: la comprueba el caso de uso (`NotAllowedException`) `[Fuera de los libros: convención de @archi-code/ddd]`.

* **Invariantes** (nunca falsas) → en el agregado; ver `ddd-skills/ddd-agregados/GUIA.md`. **Reglas de completitud** que dependen del momento → validador aparte [IDDD cap. 5] `[Fuera de los libros]`.
* Un estado intermedio legítimo se modela como estado y, cuando la validación tiene sentido, se publica un evento [IDDD cap. 5].

## Todos los errores a la vez

Los libros usan un manejador de notificación [IDDD cap. 5; PHP: Entities]; aquí `[Fuera de los libros: convención de @archi-code/ddd]`:

* Entrada de un caso de uso: `ValueObjectBuilder.build({...})` ejecuta todas las factorías y lanza una `ValidationException` con `errors` `{ field, code, message }`; `buildList` nombra cada elemento por posición (`lines.1.quantity`).

```ts
const command = ValueObjectBuilder.build({
  customerId: () => new CustomerId(input.customerId),
  email: () => new Email(input.email),
  lines: () => ValueObjectBuilder.buildList(input.lines, (line) => OrderLine.fromPrimitives(line)),
});
```

* Objeto ya construido: un servicio de dominio junta `ValidationIssue`s y lanza `new ValidationException(issues)`.
* Nunca captures la `ValidationException` de un value object para quedarte un valor inválido.

## Interfaz frente a dominio

* La interfaz valida formato; las reglas viven en el modelo [IDDD cap. 4].
* No dupliques reglas en el DTO: solo el tipo `[Fuera de los libros]`. La entrada del caso de uso llega sin validar a propósito: `toCommand` construye los value objects y así todos los adaptadores pasan por las mismas reglas.

## Errores con nombre

`[Fuera de los libros]` Una clase por regla con código estable; nunca `Error('invalid')`. Aquí, subclase de `DomainException` en `domain/exception/`, sin sufijo `Exception`, código en el segundo argumento con prefijo de contexto (`SAL`, `PAY`, `MNY`) y el siguiente número libre `[Fuera de los libros: convención de @archi-code/ddd]`:

```ts
export class OrderMustHaveLines extends DomainException {
  constructor() {
    super('An order needs at least one line', ['SAL005']);
  }
}
```

`ExceptionClassifier.classify` da `Invalid` (422) para `ValidationException` y `DomainException`, y `Malformed` (400) para un error de conversión u obligatoriedad suelto; el punto de entrada puede remapear un código (`SAL001` → 409).
