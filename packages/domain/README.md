# @archi-code/domain

Piezas para Domain-Driven Design en TypeScript: value objects que convierten, validan y son
inmutables; un marcador obligatorio/opcional que el sistema de tipos hace cumplir; agregados con
eventos de dominio y excepciones de dominio tipadas con código. Las conversiones y validaciones
vienen de [`@archi-code/validation`](https://www.npmjs.com/package/@archi-code/validation). El
paquete se publica con builds CJS y ESM.

## Instalación

```bash
npm install @archi-code/domain
```

- Node.js `>=24` (campo `engines`).
- Dependencias de runtime, que npm instala solas: `@archi-code/validation` y `uuid`.
- Para declarar validaciones con `@Validations` instala también `@archi-code/validation` como
  dependencia directa de tu proyecto (de ahí importas el decorador):

  ```bash
  npm install @archi-code/validation
  ```

### Decoradores en TypeScript

`@Validations` funciona con los dos modos de decoradores de TypeScript:

- **Estándar** (TypeScript 5+ sin `experimentalDecorators`): no necesita configuración.
- **Legacy**: `"experimentalDecorators": true` en `tsconfig.json`.

No necesita `emitDecoratorMetadata` ni `reflect-metadata`. Si no declaras validaciones, no hace
falta ningún ajuste de decoradores.

## Importación

```ts
// ESM
import { AggregateRoot, EventBase, IdType, Required, StringType } from '@archi-code/domain';
```

```js
// CommonJS
const { AggregateRoot, EventBase, IdType, Required, StringType } = require('@archi-code/domain');
```

Los tipos (`PrimitiveTypes`, `RequiredType`…) se importan con `import type`.

## Value objects

Cada value object envuelve un valor de un tipo y convierte la entrada al construirse:

| Clase             | Valor     | Acepta                                                                                      |
| ----------------- | --------- | ------------------------------------------------------------------------------------------- |
| `StringType`      | `string`  | strings, números finitos y booleanos                                                        |
| `NumberType`      | `number`  | números finitos y strings decimales (`'1.5'`, `' 2 '`, `'1e3'`)                             |
| `BooleanType`     | `boolean` | booleanos, `1`/`0` y `'true'`/`'false'`/`'1'`/`'0'` (sin distinguir mayúsculas)             |
| `DateType`        | `Date`    | instancias `Date` válidas y strings ISO 8601 (sin zona = UTC)                               |
| `UuidType`        | `string`  | strings UUID                                                                                |
| `EnumType<T>`     | `T`       | una opción del enum que devuelve `getEnum()` (abstracta)                                    |
| `JsonType<T>`     | `T`       | objetos JSON no vacíos y strings que contienen uno                                          |
| `ArrayType<Item>` | `Item[]`  | arrays (o strings con un array JSON); cada elemento lo construye `createItem()` (abstracta) |
| `CreatedAt`       | `Date`    | como `DateType`, obligatorio; `CreatedAt.now()`                                             |
| `UpdatedAt`       | `Date`    | como `DateType`, obligatorio; `UpdatedAt.now()` y `setNow()`                                |
| `IdType`          | `string`  | como `UuidType`, obligatorio y rechaza el UUID nil y el máximo                              |

El constructor está tipado con el tipo del valor (`new NumberType(1.5)`). La conversión actúa en
tiempo de ejecución sobre datos que llegan sin tipo, como un body JSON:

```ts
import { BooleanType, DateType, NumberType, StringType } from '@archi-code/domain';

const body = JSON.parse(
  '{"price":"1.5","code":12,"active":"TRUE","at":"2024-01-31T10:00:00+02:00"}',
);

new NumberType(body.price).value; // 1.5
new StringType(body.code).value; // '12'
new BooleanType(body.active).value; // true
new DateType(body.at).toString; // '2024-01-31T08:00:00.000Z'
new DateType('2018-03-23' as any).toString; // '2018-03-23T00:00:00.000Z'
```

Un valor que no se puede convertir lanza `TypePrimitiveException`:

```ts
new NumberType('abc' as any);
// TypePrimitiveException: Validation Error: Expected a valid Number, but received "abc".
new NumberType(Infinity);
// TypePrimitiveException: Validation Error: Expected a valid Number, but received Infinity.
new BooleanType('yes' as any);
// TypePrimitiveException: Validation Error: Expected a valid Boolean, but received "yes".
new DateType('31/01/2024' as any);
// TypePrimitiveException: Validation Error: Expected a valid Date, but received "31/01/2024".
```

### Lo que expone cada value object

| Miembro      | Tipo                  | Descripción                                                                    |
| ------------ | --------------------- | ------------------------------------------------------------------------------ |
| `value`      | `T \| null` (o `T`)   | El valor convertido; `T` si el tipo es obligatorio (`Required`)                |
| `isNull`     | `boolean`             | `true` si no hay valor                                                         |
| `toString`   | `string` (getter)     | Texto del valor; `''` si es `null`. `DateType` da ISO 8601, `JsonType` el JSON |
| `validate()` | `ValidationResult<T>` | Ejecuta las validaciones declaradas con `@Validations`                         |

`toString` es un **getter**, no un método: se usa `vo.toString`, no `vo.toString()`.

```ts
new NumberType(3.5).toString; // '3.5'
new NumberType().toString; // ''
new StringType('   ').value; // null (los strings en blanco cuentan como vacíos)
new StringType(null).isNull; // true
```

### Opcional por defecto, obligatorio con `Required(...)`

Un value object es opcional: acepta el valor, `null` o nada, y guarda `T | null`. Envuélvelo con
`Required(...)` para hacerlo obligatorio: el constructor pide exactamente `T`, `value` queda tipado
como `T` y un valor vacío lanza `RequiredValueException` al construir.

```ts
import { Required, StringType } from '@archi-code/domain';

class Name extends Required(StringType) {}
class Nickname extends StringType {}

const name: string = new Name('Ana').value; // 'Ana'
const nickname: string | null = new Nickname().value; // null

new Name(null); // error de tipos y, en ejecución:
// RequiredValueException: Validation Error: Name is required, but received null.
new Name('  ');
// RequiredValueException: Validation Error: Name is required, but received "  ".
```

`null`, `undefined` y los strings en blanco cuentan como vacíos en todos los tipos. Una subclase de
un value object obligatorio también es obligatoria (`class FullName extends Name {}`).
`Required(...)` acepta cualquier subclase de `AbstractType`, también las tuyas y las abstractas
(`Required(StatusType)`, `Required(Tags)`).

`Required(...)` declara además la validación `isRequired`, así que `validate()` de un tipo
obligatorio también la incluye.

### Validaciones

Las validaciones se declaran con `@Validations` de `@archi-code/validation` (los validadores
`is*` de ese paquete o validaciones `custom` con su propia función). `validate()` no lanza:
devuelve `{ ok, value, errors }` congelado. Un value object opcional y vacío es válido sin
ejecutar sus validaciones.

```ts
import { Validations } from '@archi-code/validation';
import { NumberType, Required, StringType } from '@archi-code/domain';

@Validations([{ validator: 'isEmail' }])
class Email extends Required(StringType) {}

new Email('x').validate();
// { ok: false, value: 'x', errors: [{ validator: 'isEmail', message: 'Value does not satisfy isEmail' }] }
new Email('ana@example.com').validate();
// { ok: true, value: 'ana@example.com', errors: [] }

@Validations([{ validator: 'isLength', properties: { min: 3, max: 20 } }])
class Username extends StringType {}

new Username().validate(); // { ok: true, value: null, errors: [] }
new Username('ab').validate();
// { ok: false, value: 'ab', errors: [{ validator: 'isLength', message: 'Value does not satisfy isLength' }] }

@Validations([
  { validator: 'isInt', properties: { min: 0 } },
  { custom: 'isEven', fn: (v) => Number(v) % 2 === 0, message: 'Must be even' },
])
class Quantity extends NumberType {}

new Quantity(3).validate();
// { ok: false, value: 3, errors: [{ custom: 'isEven', message: 'Must be even' }] }
```

Una subclase hereda las validaciones de su padre; si declara la misma validación, la reemplaza.
Los nombres de validadores y sus `properties` están en la documentación de
`@archi-code/validation`.

Para convertir errores de validación en una excepción usa `ValidationException`:

```ts
const result = new Email('x').validate();
if (!result.ok) {
  throw new ValidationException(result.errors.map((error) => error.message));
  // ValidationException: Validation failed, Value does not satisfy isEmail
}
```

### Inmutabilidad

Los valores no cambian después de construirse:

- `DateType` (y `CreatedAt`/`UpdatedAt`) guarda una fecha cuyos setters lanzan:

  ```ts
  new DateType(new Date('2024-01-31T10:00:00Z')).value!.setFullYear(2000);
  // TypeError: Cannot call setFullYear: the date is immutable
  ```

- `JsonType` y `ArrayType` guardan copias congeladas en profundidad (`Object.isFrozen(vo.value)`
  es `true`).
- `ArrayType` solo cambia sus elementos con `addItem`, `setItem` y `removeItem`, que sustituyen el
  array por otro congelado. `UpdatedAt.setNow()` sustituye la fecha.

### `UuidType` e `IdType`

```ts
import { IdType, UuidType } from '@archi-code/domain';

UuidType.random(); // UUID v4 aleatorio
UuidType.fromValue('ana@example.com'); // '4badeee4-791f-51e2-a027-2c59bc6f8144' (v5, determinista)
UuidType.fromValue('ana@example.com', '6ba7b811-9dad-11d1-80b4-00c04fd430c8'); // v5 con otro namespace

new UuidType('abc');
// TypePrimitiveException: Validation Error: Expected a valid UUID, but received "abc".

const id = new IdType(IdType.random()); // obligatorio
new IdType('00000000-0000-0000-0000-000000000000');
// TypePrimitiveException: Validation Error: Expected a valid Id, but received "00000000-0000-0000-0000-000000000000".
```

`fromValue(value, namespace?)` usa por defecto el namespace DNS
(`6ba7b810-9dad-11d1-80b4-00c04fd430c8`).

### `CreatedAt` y `UpdatedAt`

Fechas obligatorias:

```ts
import { CreatedAt, UpdatedAt } from '@archi-code/domain';

const createdAt = CreatedAt.now();
const updatedAt = UpdatedAt.now();
updatedAt.setNow(); // sustituye la fecha por la actual (solo UpdatedAt)
createdAt.value; // Date
```

### `EnumType`

Clase abstracta: implementa `getEnum()` devolviendo el enum. Acepta exactamente una de sus
opciones (sin convertir: `'1'` no vale para un enum numérico).

```ts
import { EnumType } from '@archi-code/domain';

enum Status {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
}

class StatusType extends EnumType<Status> {
  protected getEnum(): typeof Status {
    return Status;
  }
}

new StatusType(Status.ACTIVE).value; // 'active'
new StatusType('ACTIVE' as Status);
// TypePrimitiveException: Validation Error: Expected one of [active, blocked], but received "ACTIVE".

enum Level {
  LOW = 1,
  HIGH = 2,
}

class LevelType extends EnumType<Level> {
  protected getEnum(): typeof Level {
    return Level;
  }
}

new LevelType(Level.HIGH).value; // 2
new LevelType('1' as any);
// TypePrimitiveException: Validation Error: Expected one of [1, 2], but received "1".
```

### `JsonType`

Guarda un objeto JSON no vacío (copia congelada). `T` debe extender `JsonTypeValue`
(`Record<string, any>`).

```ts
import { JsonType } from '@archi-code/domain';
import type { JsonTypeValue } from '@archi-code/domain';

interface Address extends JsonTypeValue {
  city: string;
  zip: string;
}

class AddressType extends JsonType<Address> {}

const address = new AddressType({ city: 'Huelva', zip: '21001' });
address.value; // { city: 'Huelva', zip: '21001' }
address.toString; // '{"city":"Huelva","zip":"21001"}'
new AddressType('{"city":"Huelva","zip":"21001"}' as any).value; // { city: 'Huelva', zip: '21001' }

new JsonType({});
// TypePrimitiveException: Validation Error: Expected a valid Json, but received {}.
new JsonType([1] as any);
// TypePrimitiveException: Validation Error: Expected a valid Json, but received [1].
```

### `ArrayType`

Clase abstracta: implementa `createItem(value)` devolviendo el value object de cada elemento. El
array guarda los valores ya convertidos por cada elemento; `items` reconstruye los value objects.

```ts
import { Validations } from '@archi-code/validation';
import { ArrayType, Required, StringType } from '@archi-code/domain';

@Validations([{ validator: 'isLength', properties: { min: 2 } }])
class Tag extends Required(StringType) {}

class Tags extends ArrayType<Tag> {
  protected createItem(value: unknown): Tag {
    return new Tag(value as string);
  }
}

const tags = new Tags(['ddd', 'ts']);
tags.value; // ['ddd', 'ts']
tags.items; // [Tag, Tag]
tags.hasItem('ts'); // true
tags.addItem('node'); // ['ddd', 'ts', 'node']
tags.setItem('ddd'); // añade solo si no está: ['ddd', 'ts', 'node']
tags.removeItem('ts'); // ['ddd', 'node']
tags.toString; // 'ddd, node'

new Tags('["a1","b2"]' as any).value; // ['a1', 'b2']
new Tags(['ok', '']);
// RequiredValueException: Validation Error: Tag is required, but received "".
new Tags('abc' as any);
// TypePrimitiveException: Validation Error: Expected a valid Array, but received "abc".
```

`validate()` de un `ArrayType` añade los errores de cada elemento con su posición:

```ts
new Tags(['ok', 'x']).validate();
// { ok: false, value: ['ok', 'x'], errors: [{ validator: 'isLength', message: 'Item 2: Value does not satisfy isLength' }] }
```

### Value objects propios con `AbstractType`

Para un tipo nuevo extiende `AbstractType<T>` e implementa `filter(value)`: recibe la entrada ya
no vacía, devuelve el valor convertido y lanza `TypePrimitiveException` si no es válido. El vacío
(`null`, `undefined`, blancos) y `Required(...)` los resuelve la clase base.

```ts
import { AbstractType, Required, TypePrimitiveException } from '@archi-code/domain';

class Percentage extends AbstractType<number> {
  protected filter(value: unknown): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      throw new TypePrimitiveException('Percentage', value);
    }
    return n;
  }
}

new Percentage(40).value; // 40
new Percentage(140);
// TypePrimitiveException: Validation Error: Expected a valid Percentage, but received 140.

class Discount extends Required(Percentage) {}
```

Para restringir un tipo existente basta con extenderlo y declarar `@Validations`, como `Email`.

## Agregados y eventos de dominio

- `EventBase`: clase abstracta de los eventos; implementa `eventName(): string`.
- `AggregateRoot`: clase abstracta de los agregados. `record(event)` (protegido) guarda un evento y
  `pullDomainEvents()` devuelve los guardados en orden y vacía la lista.

```ts
import { AggregateRoot, EventBase, IdType } from '@archi-code/domain';

class UserCreated extends EventBase {
  constructor(readonly userId: string) {
    super();
  }

  eventName(): string {
    return 'user.created';
  }
}

class User extends AggregateRoot {
  constructor(readonly id: IdType) {
    super();
    this.record(new UserCreated(id.value));
  }
}

const user = new User(new IdType(IdType.random()));
user.pullDomainEvents(); // [UserCreated]
user.pullDomainEvents(); // []
```

## Tipos primitivos

Tipos para pasar de un agregado (o cualquier clase con value objects) a sus valores planos:

| Tipo                       | Resultado                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `PrimitiveType<T>`         | El valor de un value object (`T['value']`); enums como `string`/`number`; arrays elemento a elemento   |
| `PrimitiveTypes<T>`        | Objeto con cada propiedad pública no método de `T` como `PrimitiveType`, sin el `_` inicial del nombre |
| `DataTypes<T>`             | `Partial<PrimitiveTypes<T>>`                                                                           |
| `Properties<T>`            | Las propiedades públicas de `T` que no son métodos                                                     |
| `PropertiesData<T>`        | `Required<Properties<T>>`                                                                              |
| `MutablePropertiesData<T>` | `PropertiesData<T>` sin `readonly`                                                                     |
| `Methods<T>`               | Unión de los nombres de los métodos de `T`                                                             |
| `MethodsAndProperties<T>`  | `{ [key in keyof T]: T[key] }`                                                                         |
| `RequiredType<C>`          | Tipo de la clase que devuelve `Required(C)`                                                            |
| `JsonTypeValue`            | `Record<string, any>`                                                                                  |

`PrimitiveTypes` solo ve miembros **públicos** (`keyof`): las propiedades `private` o `protected`
no aparecen. Expón los value objects con propiedades públicas `readonly` o con getters (ver el
ejemplo completo).

```ts
import type { DataTypes, PrimitiveTypes } from '@archi-code/domain';

class Person {
  constructor(
    readonly _name: Name,
    readonly nickname: Nickname,
  ) {}
}

type PersonPrimitives = PrimitiveTypes<Person>; // { name: string; nickname: string | null }
type PersonData = DataTypes<Person>; // { name?: string; nickname?: string | null }
```

## Excepciones

Todas extienden `AbstractException` (que extiende `Error`) y tienen:

| Miembro       | Descripción                                                                             |
| ------------- | --------------------------------------------------------------------------------------- |
| `name`        | Nombre de la clase                                                                      |
| `message`     | Mensaje                                                                                 |
| `code`        | El último código de la cadena (`'DOM002'`, o el tuyo si lo pasas)                       |
| `description` | Todos los códigos legibles: `'Domain Exception (DOM000), Aggregate Not Found (DOM002)'` |
| `timestamp`   | `Date` de creación                                                                      |
| `print()`     | `'[<description>]: <message>, <timestamp>'`                                             |
| `toJSON()`    | `{ name, message, code, description, timestamp }` (`timestamp` en ISO 8601)             |

| Clase                        | Extiende                  | Constructor                                | Códigos              | Mensaje                                                                    |
| ---------------------------- | ------------------------- | ------------------------------------------ | -------------------- | -------------------------------------------------------------------------- |
| `DomainException`            | `AbstractException`       | `(message, exceptionCodes = [])`           | `DOM000` + los tuyos | `message`                                                                  |
| `ValidationException`        | `DomainException`         | `(errors: string[])`                       | `DOM000`, `DOM001`   | `Validation failed, <errors separados por ", ">`                           |
| `AggregateNotFoundException` | `DomainException`         | `(entity: string, id: string)`             | `DOM000`, `DOM002`   | `<entity> with ID <id> not found.`                                         |
| `TypePrimitiveException`     | `DomainException`         | `(expectedType, receivedValue, template?)` | `DOM000`, `DOM003`   | `Validation Error: Expected a valid <expectedType>, but received <valor>.` |
| `RequiredValueException`     | `DomainException`         | `(typeName, receivedValue)`                | `DOM000`, `DOM004`   | `Validation Error: <typeName> is required, but received <valor>.`          |
| `ApplicationException`       | `AbstractException`       | `(message, exceptionCodes = [])`           | `APP000` + los tuyos | `message`                                                                  |
| `InfrastructureException`    | `AbstractException`       | `(message, exceptionCodes = [])`           | `INF000` + los tuyos | `message`                                                                  |
| `InternalErrorException`     | `InfrastructureException` | `(message)`                                | `INF000`, `INF001`   | `Failed, internal error: <message>`                                        |

`TypePrimitiveException` y `RequiredValueException` son las que lanzan los value objects; el
`template` de `TypePrimitiveException` sustituye a `'Expected a valid '`.

```ts
import {
  AggregateNotFoundException,
  DomainException,
  InternalErrorException,
} from '@archi-code/domain';

const notFound = new AggregateNotFoundException('User', '42');
notFound.message; // 'User with ID 42 not found.'
notFound.code; // 'DOM002'
notFound.description; // 'Domain Exception (DOM000), Aggregate Not Found (DOM002)'
notFound instanceof DomainException; // true

new InternalErrorException('timeout').toJSON();
// {
//   name: 'InternalErrorException',
//   message: 'Failed, internal error: timeout',
//   code: 'INF001',
//   description: 'Infrastructure Exception (INF000), Internal Error (INF001)',
//   timestamp: '2026-10-13T11:52:00.428Z'
// }
```

Excepciones propias: extiende la de su capa y pasa tus códigos. En `description` un código propio
aparece con el nombre de la clase:

```ts
class OrderCancelledException extends DomainException {
  constructor(orderId: string) {
    super(`Order ${orderId} is cancelled`, ['ORD001']);
  }
}

const error = new OrderCancelledException('7');
error.code; // 'ORD001'
error.description; // 'Domain Exception (DOM000), OrderCancelledException (ORD001)'
```

## Ejemplo completo

```ts
import { Validations } from '@archi-code/validation';
import {
  AggregateRoot,
  CreatedAt,
  EventBase,
  IdType,
  Required,
  StringType,
  UpdatedAt,
  ValidationException,
} from '@archi-code/domain';
import type { PrimitiveTypes } from '@archi-code/domain';

class Name extends Required(StringType) {}

@Validations([{ validator: 'isEmail' }])
class Email extends Required(StringType) {}

class UserCreated extends EventBase {
  constructor(
    readonly userId: string,
    readonly email: string,
  ) {
    super();
  }

  eventName(): string {
    return 'user.created';
  }
}

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
    private readonly _email: Email,
    private readonly _createdAt: CreatedAt,
    private readonly _updatedAt: UpdatedAt,
  ) {
    super();
  }

  static create(id: string, name: string, email: string): User {
    const emailValue = new Email(email);
    const result = emailValue.validate();
    if (!result.ok) {
      throw new ValidationException(result.errors.map((error) => error.message));
    }
    const user = new User(
      new IdType(id),
      new Name(name),
      emailValue,
      CreatedAt.now(),
      UpdatedAt.now(),
    );
    user.record(new UserCreated(id, email));
    return user;
  }

  get id(): IdType {
    return this._id;
  }

  get name(): Name {
    return this._name;
  }

  get email(): Email {
    return this._email;
  }

  get createdAt(): CreatedAt {
    return this._createdAt;
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
    return {
      id: this.id.value,
      name: this.name.value,
      email: this.email.value,
      createdAt: this.createdAt.value,
      updatedAt: this.updatedAt.value,
    };
  }
}

const user = User.create(IdType.random(), 'Ana', 'ana@example.com');
user.rename('Ana María');

user.pullDomainEvents().map((event) => event.eventName()); // ['user.created', 'user.renamed']
user.pullDomainEvents(); // []
user.toPrimitives(); // { id, name: 'Ana María', email: 'ana@example.com', createdAt, updatedAt }

User.create(IdType.random(), 'Ana', 'x');
// ValidationException: Validation failed, Value does not satisfy isEmail
```

## Exports

| Export                                                                                                                            | Tipo                  |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `AbstractType`                                                                                                                    | clase abstracta       |
| `StringType`, `NumberType`, `BooleanType`, `DateType`, `UuidType`, `JsonType`                                                     | clases                |
| `EnumType`, `ArrayType`                                                                                                           | clases abstractas     |
| `CreatedAt`, `UpdatedAt`, `IdType`                                                                                                | clases (obligatorias) |
| `Required`                                                                                                                        | función               |
| `AggregateRoot`, `EventBase`                                                                                                      | clases abstractas     |
| `AbstractException`                                                                                                               | clase abstracta       |
| `DomainException`, `ApplicationException`, `InfrastructureException`                                                              | clases                |
| `ValidationException`, `AggregateNotFoundException`, `TypePrimitiveException`, `RequiredValueException`, `InternalErrorException` | clases                |
| `RequiredType`, `JsonTypeValue`, `PrimitiveType`, `PrimitiveTypes`, `DataTypes`                                                   | tipos                 |
| `Properties`, `PropertiesData`, `MutablePropertiesData`, `Methods`, `MethodsAndProperties`                                        | tipos                 |

## Skill para asistentes de IA

El paquete incluye `SKILL.md`, una skill de Claude Code con las reglas, los patrones y los errores
comunes de `@archi-code/domain`. Para la API completa remite a este README dentro de
`node_modules/@archi-code/domain`, así que sigue valiendo al actualizar el paquete. Para instalarla en
tu proyecto:

```bash
mkdir -p .claude/skills/archi-code-domain
cp node_modules/@archi-code/domain/SKILL.md .claude/skills/archi-code-domain/SKILL.md
```

### Cómo se usa

Invócala con una petición:

```text
/archi-code-domain crea un value object Email obligatorio que valide el formato
```

O pide la tarea sin nombrarla y Claude la carga sola porque encaja con su descripción:

```text
Añade al agregado User un método changeEmail que registre un evento EmailChanged
```

También sirve para revisar código que ya usa el paquete:

```text
/archi-code-domain revisa src/domain y corrige lo que incumpla las reglas del paquete
```

Con la skill cargada, Claude sigue sus reglas, evita los errores de su lista "Qué no hacer" y, antes de
usar algo que la skill no muestra, lee este README en `node_modules`.

### Mantenerla al día

- La copia no se actualiza sola: después de actualizar `@archi-code/domain`, vuelve a ejecutar el `cp`
  de arriba.
- Sube `.claude/skills/archi-code-domain/` al repositorio para que todo el equipo la use.

## Licencia

MIT
