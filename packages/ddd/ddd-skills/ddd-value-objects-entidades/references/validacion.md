# Validación

## Tres niveles

Atributos válidos no hacen válido al objeto, ni objetos válidos su composición [IDDD cap. 5; PHP: Entities]:

| Nivel | Dónde |
|---|---|
| Atributo | Constructor del value object; reglas sobre varios campos de un `Composite` |
| Objeto completo | La entidad (un método del agregado), o una `Specification` aparte en el mismo módulo, con validación diferida; nunca un servicio de dominio: la regla de un solo agregado es del agregado `[Fuera de los libros: convención de @archi-code/ddd]` |
| Composición | Servicio de dominio con lo cargado, o que lee con el repositorio abstracto (`findById`) recibido por constructor |

El primer nivel son aserciones que protegen el estado [IDDD cap. 5]. La autorización no es validación: la comprueba el caso de uso (`NotAllowedException`) `[Fuera de los libros: convención de @archi-code/ddd]`. Código de cada nivel: `ddd-skills/archi-code-ddd/value-objects.md`, `ddd-skills/archi-code-ddd/aggregates.md` y `ddd-skills/archi-code-ddd/domain-services.md`.

* **Invariantes** (nunca falsas) → en el agregado; ver `ddd-skills/ddd-agregados/GUIA.md`. **Reglas de completitud** que dependen del momento → validador aparte [IDDD cap. 5] `[Fuera de los libros]`.
* Un estado intermedio legítimo se modela como estado y, cuando la validación tiene sentido, se publica un evento [IDDD cap. 5].

## Todos los errores a la vez

Los libros usan un manejador de notificación [IDDD cap. 5; PHP: Entities]; aquí `[Fuera de los libros: convención de @archi-code/ddd]`:

* Entrada de un caso de uso: `ValueObjectBuilder.build` informa de todos los campos a la vez, cada uno con su ruta. Código: `ddd-skills/archi-code-ddd/value-objects.md`, apartado Code.
* Objeto ya construido: un servicio de dominio junta `ValidationIssue`s y lanza `new ValidationException(issues)`.
* Nunca captures la `ValidationException` de un value object para quedarte un valor inválido.

## Interfaz frente a dominio

* La interfaz valida formato; las reglas viven en el modelo [IDDD cap. 4].
* No dupliques reglas en el DTO: solo el tipo `[Fuera de los libros]`. La entrada del caso de uso llega sin validar a propósito: el caso de uso construye los value objects y así todos los adaptadores pasan por las mismas reglas.

## Errores con nombre

`[Fuera de los libros]` Una clase por regla con código estable; nunca `Error('invalid')`. Forma y códigos: `ddd-skills/archi-code-ddd/events-and-errors.md`; su traducción a estados del protocolo: `ddd-skills/archi-code-ddd/composition-and-entry-points.md`.
