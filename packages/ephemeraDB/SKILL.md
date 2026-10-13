---
name: archi-code-ephemeradb
description: Almacén asíncrono en memoria de entidades con id string (EphemeraDb) de @archi-code/ephemeradb, para repositorios falsos en tests y prototipos. Úsala cuando haya que importar @archi-code/ephemeradb, usar EphemeraDb, escribir un repositorio en memoria o un doble/fake de repositorio para tests, o sustituir una base de datos real por una en memoria.
---

# archi-code-ephemeradb

La clase `EphemeraDb`, un almacén en memoria con API asíncrona para repositorios falsos en tests y
prototipos. Normalmente se instala como dependencia de desarrollo.

## API completa

Antes de usar un método, opción o tipo que no aparezca en esta skill, lee
`node_modules/@archi-code/ephemeradb/README.md`: corresponde a la versión instalada. No supongas
firmas ni opciones. Si el paquete no está instalado: `npm install @archi-code/ephemeradb`.

Si esa ruta no existe (monorepo con workspaces, pnpm…), localiza el paquete con
`node -p "require.resolve('@archi-code/ephemeradb/package.json')"` y lee el `README.md` de esa
carpeta.

## Skills relacionadas

Si están instaladas en el proyecto, úsalas junto a esta:

- `archi-code-domain`: agregados que guarda el repositorio (guarda sus primitivos).
- `archi-code-test`: comparar los datos guardados con `JsonCompare`.

## Importación

```ts
import { EphemeraDb } from '@archi-code/ephemeradb';
```

CJS: `const { EphemeraDb } = require('@archi-code/ephemeradb');`

No hay export por defecto ni subrutas.

## Reglas

- `EphemeraDb<T extends { id: string }>`: constructor sin argumentos; cada instancia tiene sus
  propios datos.
- `persist` es un upsert: reemplaza en su misma posición la entidad con el mismo `id`.
- Ninguna operación lanza ni rechaza.

## Patrones recomendados

Repositorio en memoria que implementa el puerto del dominio:

```ts
class InMemoryUserRepository implements UserRepository {
  private readonly db = new EphemeraDb<User>();

  save(user: User): Promise<void> {
    return this.db.persist(user);
  }

  byId(id: string): Promise<User | null> {
    return this.db.findById(id);
  }
}
```

En tests, una instancia nueva por test (`beforeEach`) o `await db.clear()`, para que no compartan
estado. Siempre `await` en cada llamada.

Si la entidad no tiene un `id` string plano (por ejemplo un agregado con un value object), guarda un
DTO/primitivos `{ id: string; ... }` y reconstruye la entidad al leer.

## Qué no hacer

- `T` debe tener `id: string`; `{ id: number }` o sin `id` no compila. No hay generación de ids:
  el `id` lo pone quien llama.
- Guarda referencias, no copias: mutar un objeto tras `persist` cambia lo almacenado, y
  `findById` devuelve el mismo objeto. Si el test necesita aislamiento, usa
  `structuredClone(item)` al guardar y al leer en tu repositorio.
- `findAll()` devuelve una copia del array (no de los objetos), en orden de inserción.
- No supongas `find(predicate)`, `findBy`, `update`, `delete`, `count`, `save`, `get`, `set`, `has`,
  TTL ni persistencia en disco: compruébalo en el README instalado. Para filtrar:
  `(await db.findAll()).filter(...)`.
- `findById` devuelve `null`, no `undefined`. `remove` de un id inexistente devuelve `false`, no
  lanza.
- Los métodos son asíncronos: sin `await` obtienes una `Promise`, no el valor.
- No usar como base de datos de producción: es memoria del proceso y se pierde al terminar.
