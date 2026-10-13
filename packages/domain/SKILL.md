---
name: archi-code-domain
description: Reglas, patrones y errores comunes para escribir código TypeScript con @archi-code/domain (DDD de archi-code - value objects inmutables, Required(...), AggregateRoot con eventos de dominio, EventBase y excepciones con código). Úsala cuando haya que crear o modificar value objects, declarar validaciones con @Validations, modelar agregados y eventos, lanzar o definir excepciones de dominio, o siempre que el código importe @archi-code/domain.
---

# archi-code-domain

`@archi-code/domain` es el paquete de Domain-Driven Design de archi-code para TypeScript: value objects
que convierten, validan y son inmutables, agregados con eventos de dominio y excepciones con código.

## API completa

Antes de usar una clase, función, opción o tipo que no aparezca en esta skill, lee
`node_modules/@archi-code/domain/README.md`: corresponde a la versión instalada. No supongas firmas,
opciones ni exports. Si el paquete no está instalado: `npm install @archi-code/domain` (y
`npm install @archi-code/validation` si se declaran validaciones con `@Validations`).

Si esa ruta no existe (monorepo con workspaces, pnpm…), localiza el paquete con
`node -p "require.resolve('@archi-code/domain/package.json')"` y lee el `README.md` de esa
carpeta.

## Skills relacionadas

Si están instaladas en el proyecto, úsalas junto a esta:

- `archi-code-validation`: validadores disponibles, sus opciones y reglas de `@Validations`.
- `archi-code-ephemeradb`: repositorios en memoria para tests de agregados.
- `archi-code-test`: comparar JSON y crear object mothers en los tests.

## Importación

```ts
import {
  AggregateRoot,
  DomainException,
  EventBase,
  IdType,
  NumberType,
  Required,
  StringType,
  UpdatedAt,
  ValidationException,
} from '@archi-code/domain';
import type { PrimitiveTypes } from '@archi-code/domain';
import { Validations } from '@archi-code/validation';
```

```js
const { Required, StringType } = require('@archi-code/domain');
```

## Reglas

- Los value objects son **opcionales por defecto** (`value: T | null`). `Required(XType)` los hace
  obligatorios: el constructor exige `T` y, si recibe un vacío (`null`, `undefined` o string en
  blanco), lanza `RequiredValueException` con el nombre de la clase. `Required(...)` también declara
  la validación `isRequired`.
- Un VO de dominio es siempre una subclase con nombre (`class Email extends ...`): el nombre aparece en
  los mensajes de error.
- La construcción solo convierte (o lanza `TypePrimitiveException` si no puede). Las reglas de
  `@Validations` se comprueban al llamar a `validate()`, que no guarda estado, nunca lanza y devuelve
  `{ ok, value, errors }`. Un VO opcional vacío es válido sin ejecutar validaciones.
- `@Validations` se importa de `@archi-code/validation`; los parámetros de un validador van en un único
  objeto `properties`. Las subclases heredan las validaciones y una con el mismo nombre reemplaza a la
  del padre.
- Los valores son **inmutables**: para cambiar un valor se sustituye el VO entero. `toString` es un
  **getter** (`vo.toString`).
- Un tipo propio extiende `AbstractType<T>` e implementa solo `protected filter(value: unknown): T`
  (recibe la entrada ya no vacía; devuelve el valor o lanza `TypePrimitiveException`). Si basta con
  restringir un tipo existente, extiéndelo y usa `@Validations`.
- Agregados: `record(event)` es `protected` (solo el propio agregado registra eventos);
  `pullDomainEvents()` devuelve los eventos en orden y vacía la lista. Llámalo después de persistir,
  para publicar. `EventBase` solo exige `eventName(): string`.
- `PrimitiveTypes<T>` solo ve los miembros **públicos** no método (quita el `_` inicial): expón los VO
  con getters públicos o propiedades públicas `readonly`.
- Dónde lanzar cada excepción:
  - Dominio (agregados, VO, reglas de negocio): `DomainException` o una subclase propia con su código;
    `ValidationException` tras un `validate()` fallido; `AggregateNotFoundException` cuando el
    repositorio no encuentra el agregado.
  - Casos de uso: `ApplicationException`.
  - Adaptadores (BD, red…): `InfrastructureException` / `InternalErrorException`.
  - `TypePrimitiveException` y `RequiredValueException` las lanzan los VO; lánzalas tú solo dentro de
    `filter` de un tipo propio.

## Patrones recomendados

Opcional por defecto, obligatorio con `Required(XType)`:

```ts
class Nickname extends StringType {} // value: string | null; constructor acepta string | null | nada
class Name extends Required(StringType) {} // value: string; constructor exige string
class FullName extends Name {} // sigue siendo obligatorio
```

Validaciones con `@Validations` y fallo explícito con `ValidationException`:

```ts
import { Validations } from '@archi-code/validation';

@Validations([{ validator: 'isEmail' }])
class Email extends Required(StringType) {}

@Validations([
  { validator: 'isInt', properties: { min: 0 } },
  { custom: 'isEven', fn: (v) => Number(v) % 2 === 0, message: 'Must be even' },
])
class Quantity extends NumberType {}

new Email('x').validate();
// { ok: false, value: 'x', errors: [{ validator: 'isEmail', message: 'Value does not satisfy isEmail' }] }
```

```ts
const result = email.validate();
if (!result.ok) {
  throw new ValidationException(result.errors.map((error) => error.message));
}
```

Agregado con eventos de dominio:

```ts
class UserRenamed extends EventBase {
  constructor(
    readonly userId: string,
    readonly name: string,
  ) {
    super();
  }

  eventName(): string {
    return 'user.renamed';
  }
}

class User extends AggregateRoot {
  private constructor(
    private readonly _id: IdType,
    private _name: Name,
    private readonly _updatedAt: UpdatedAt,
  ) {
    super();
  }

  static create(id: string, name: string): User {
    return new User(new IdType(id), new Name(name), UpdatedAt.now());
  }

  get id(): IdType {
    return this._id;
  }

  get name(): Name {
    return this._name;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  rename(name: string): void {
    this._name = new Name(name);
    this._updatedAt.setNow();
    this.record(new UserRenamed(this._id.value, name));
  }

  toPrimitives(): PrimitiveTypes<User> {
    return { id: this.id.value, name: this.name.value, updatedAt: this.updatedAt.value };
  }
}
```

Excepción de dominio propia con su código:

```ts
class OrderCancelledException extends DomainException {
  constructor(orderId: string) {
    super(`Order ${orderId} is cancelled`, ['ORD001']);
  }
}
```

## Qué no hacer

- No inventes API: no hay `ExceptionCode` exportado, ni `equals()`, ni `toPrimitives()` en la base, ni
  `ValueObject`, `Entity` o `Id` genéricos. Ante la duda, consulta el README instalado.
- `vo.toString()` → error: `toString` es un getter (`vo.toString`). Por lo mismo, `` `${vo}` `` y
  `String(vo)` lanzan `TypeError: Cannot convert object to primitive value`; usa `vo.toString` o
  `vo.value`.
- `JSON.stringify(vo)` da `{"_value":...}`: serializa con `vo.value` o con `PrimitiveTypes`.
- Esperar que el constructor falle por una regla de `@Validations`: solo falla por conversión o por
  vacío en `Required`. Llama a `validate()`.
- Pasar valores sin convertir con su tipo estático (`new NumberType('1.5')`): error de tipos; la
  conversión es para entradas `any`/`unknown`.
- Usar `Required(StringType)` directamente como tipo de propiedad en vez de una subclase con nombre.
- Intentar mutar `vo.value` (fechas, objetos JSON, arrays): están congelados; los setters de fecha
  lanzan `TypeError: Cannot call setFullYear: the date is immutable`. En `ArrayType` usa
  `addItem`/`setItem`/`removeItem`; en `UpdatedAt`, `setNow()`.
- Llamar a `setNow()` en `CreatedAt`: no existe, solo en `UpdatedAt`.
- `JsonType` con `{}` o con un array: lanza `TypePrimitiveException` (debe ser un objeto no vacío).
- `IdType` con `00000000-0000-0000-0000-000000000000` o `ffffffff-ffff-ffff-ffff-ffffffffffff`:
  lanza `TypePrimitiveException`.
- Declarar los VO de un agregado como `private` sin getters y esperar que `PrimitiveTypes` los vea.
- Llamar a `record()` desde fuera del agregado (es `protected`) u olvidar `super()` en el
  constructor de un agregado o evento.
- Importar `@Validations` desde `@archi-code/domain`: se importa de `@archi-code/validation`.
