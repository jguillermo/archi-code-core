# @archi-code/ephemeradb

Almacén asíncrono en memoria de entidades con `id`, pensado para dobles de repositorio en tests y
prototipos. Todas sus operaciones devuelven `Promise`, como un repositorio real, así que puedes
sustituir uno por otro sin cambiar el código que lo usa. Sin dependencias en tiempo de ejecución; el
paquete incluye builds CJS y ESM.

## Instalación

```bash
npm install --save-dev @archi-code/ephemeradb
```

Usa `--save-dev` si solo lo necesitas en tests. Requiere Node.js 24 o superior.

## Importación

ESM / TypeScript:

```ts
import { EphemeraDb } from '@archi-code/ephemeradb';
```

CommonJS:

```js
const { EphemeraDb } = require('@archi-code/ephemeradb');

const db = new EphemeraDb();
db.persist({ id: '1', name: 'Ana' })
  .then(() => db.findById('1'))
  .then((user) => console.log(user)); // { id: '1', name: 'Ana' }
```

## `EphemeraDb<T extends { id: string }>`

Cada instancia es un almacén independiente. El tipo de las entidades debe tener un `id` de tipo
`string`; con otro tipo de `id` TypeScript no compila:

```ts
new EphemeraDb<{ id: number }>();
// error TS2344: Type '{ id: number; }' does not satisfy the constraint '{ id: string; }'.
```

### Guardar: `persist(item)`

Inserta la entidad o, si ya existe otra con el mismo `id`, la reemplaza en su misma posición
(_upsert_). Devuelve `Promise<void>`.

```ts
interface User {
  id: string;
  name: string;
}

const db = new EphemeraDb<User>();

await db.persist({ id: '1', name: 'Ana' });
await db.persist({ id: '2', name: 'Luis' });
await db.persist({ id: '1', name: 'Ana María' });

await db.findAll();
// [{ id: '1', name: 'Ana María' }, { id: '2', name: 'Luis' }]
```

### Buscar por id: `findById(id)`

Devuelve `Promise<T | null>`: la entidad, o `null` si no existe.

```ts
await db.findById('1'); // { id: '1', name: 'Ana María' }
await db.findById('99'); // null
```

### Listar: `findAll()`

Devuelve `Promise<T[]>` con todas las entidades en orden de inserción. El array es una copia: añadir o
quitar elementos de él no cambia el almacén.

```ts
const all = await db.findAll();
all.pop();
(await db.findAll()).length; // 2
```

### Borrar: `remove(id)`

Devuelve `Promise<boolean>`: `true` si había una entidad con ese `id` y se borró, `false` si no
existía.

```ts
await db.remove('2'); // true
await db.remove('2'); // false
```

### Vaciar: `clear()`

Borra todas las entidades. Devuelve `Promise<void>`.

```ts
await db.clear();
await db.findAll(); // []
```

## Referencias, no copias

El almacén guarda las referencias que recibe y `findById`/`findAll` devuelven esos mismos objetos.
Si modificas un objeto después de guardarlo, el almacén ve el cambio:

```ts
const user = { id: 'r', name: 'Eva' };
await db.persist(user);
user.name = 'cambiado';

await db.findById('r'); // { id: 'r', name: 'cambiado' }
```

Si necesitas aislamiento (por ejemplo, para comprobar que tu código llama a `persist`), guarda y
devuelve copias en tu repositorio (`structuredClone(item)`).

## Ejemplo: repositorio en memoria

```ts
interface UserRepository {
  save(user: User): Promise<void>;
  byId(id: string): Promise<User | null>;
}

class InMemoryUserRepository implements UserRepository {
  private readonly db = new EphemeraDb<User>();

  save(user: User): Promise<void> {
    return this.db.persist(user);
  }

  byId(id: string): Promise<User | null> {
    return this.db.findById(id);
  }
}

const repository = new InMemoryUserRepository();
await repository.save({ id: 'x', name: 'X' });
await repository.byId('x'); // { id: 'x', name: 'X' }
```

Crea una instancia nueva (o llama a `clear()`) en cada test para que no compartan datos.

## Errores

Ninguna operación lanza ni rechaza: buscar o borrar un `id` inexistente devuelve `null` / `false`.

## Resumen de exports

| Export       | Tipo  | Métodos                                                                                                                                                 |
| ------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EphemeraDb` | clase | `persist(item): Promise<void>`, `findById(id): Promise<T \| null>`, `findAll(): Promise<T[]>`, `remove(id): Promise<boolean>`, `clear(): Promise<void>` |

## Skill para asistentes de IA

El paquete incluye `SKILL.md`, una skill de Claude Code con las reglas, los patrones recomendados y
los errores habituales. Para la API completa remite a este README dentro de `node_modules`, así que
sigue valiendo al actualizar el paquete. Para instalarla en tu proyecto:

```bash
mkdir -p .claude/skills/archi-code-ephemeradb
cp node_modules/@archi-code/ephemeradb/SKILL.md .claude/skills/archi-code-ephemeradb/SKILL.md
```

### Cómo se usa

Invócala con una petición:

```text
/archi-code-ephemeradb crea un InMemoryOrderRepository para los tests del caso de uso CreateOrder
```

O pide la tarea sin nombrarla y Claude la carga sola porque encaja con su descripción:

```text
Sustituye el repositorio MongoDB por uno en memoria en los tests de integración
```

También sirve para revisar código que ya usa el paquete:

```text
/archi-code-ephemeradb revisa los tests y evita que compartan estado entre ellos
```

Con la skill cargada, Claude sigue sus reglas, evita los errores de su lista "Qué no hacer" y, antes de
usar algo que la skill no muestra, lee este README en `node_modules`.

### Mantenerla al día

- La copia no se actualiza sola: después de actualizar `@archi-code/ephemeradb`, vuelve a ejecutar el `cp`
  de arriba.
- Sube `.claude/skills/archi-code-ephemeradb/` al repositorio para que todo el equipo la use.

## Licencia

MIT
