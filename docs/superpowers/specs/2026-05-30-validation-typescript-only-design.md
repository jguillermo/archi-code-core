# Spec: validation — migración TypeScript-only (sin Rust/WASM)

**Fecha:** 2026-05-30  
**Paquete:** `packages/validation` (`@archi-code/validation`)  
**Rama:** `archicode-validation`

---

## Contexto

El paquete `validation` fue diseñado con un núcleo Rust compilado a WebAssembly (`wasm-pack`) para las funciones `canBe*`, `to*` y `cast_*`. Se elimina toda la capa Rust/WASM y se reemplaza con TypeScript puro, manteniendo exactamente la misma API pública que los tests de control exigen.

---

## Alcance

### Se elimina completamente
- `packages/validation/rust/` — fuente Rust y Cargo
- `packages/validation/src/wasm/` — artefactos WASM compilados y tipos generados
- `packages/validation/src/cast.ts` — funciones cast que envolvían WASM (y su `CastError`)
- `packages/validation/benchmark.js` — benchmark que dependía de WASM

### Se modifica
- `src/primitives.ts` — reescribir `canBe*` en TypeScript puro
- `src/convert.ts` — reescribir `to*` + `ConvertError` en TypeScript puro
- `src/index.ts` — quitar exports de `#wasm` y de `cast`
- `tsconfig.json` — quitar `paths` de `#wasm`
- `package.json` — limpiar scripts WASM, `imports` field, `moduleNameMapper`, `testRegex`, `keywords`, script `build`

### No se toca
- `src/validators/` — ya es TypeScript puro
- `src/__tests__/` — tests de control, no modificar

---

## API pública resultante

```ts
// from src/index.ts
export { default as validator } from './validators';
export * from './primitives';  // canBe* functions
export * from './convert';     // to* functions + ConvertError
```

`HashAlgorithm` y `CastError` dejan de exportarse (no hay test que los verifique).

---

## Implementación de `src/primitives.ts`

Todas las funciones devuelven `boolean`. Lógica exacta según los tests de control:

### `canBeString(v: unknown): boolean`
- `true`: `typeof v === 'string'` | `typeof v === 'boolean'` | (`typeof v === 'number'` && `Number.isFinite(v)`)
- `false`: NaN, ±Infinity, null, undefined, object, array, Date, Symbol, Function

### `canBeBoolean(v: unknown): boolean`
- `true`: `typeof v === 'boolean'` | number `0` o `1` | string que matchee `/^\s*(true|false|1|0)\s*$/i`
- `false`: strings random, números ≠ 0/1, null, undefined, Date, Symbol, object, array

### `canBeInteger(v: unknown): boolean`
- `true`: `typeof v === 'number'` finito y entero (`Number.isInteger`) | string entera tras trim (`/^-?\d+$/`)
- `false`: floats, strings con decimal, booleans, null, undefined, object, array

### `canBeFloat(v: unknown): boolean`
- `true`: `typeof v === 'number'` finito | string numérica válida (parseFloat no produce NaN)
- `false`: NaN, ±Infinity, strings no numéricas, booleans, null, undefined, object

### `canBeDate(v: unknown): boolean`
- `true`: `v instanceof Date` con `!isNaN(v.getTime())` | string de fecha ISO 8601 válida (acepta separador `T` o espacio, valida rangos de mes/día/hora/min/seg)
- `false`: timestamps numéricos, strings no-fecha, booleans, null, undefined, object, array

### `canBeJson(v: unknown): boolean`
- `true`: objeto plano no nulo, no vacío (`Object.keys(v).length > 0`) y cuyo `JSON.stringify` no lanza | string que parsea con `JSON.parse` a un objeto plano no vacío
- `false`: objeto vacío `{}`, array, null, undefined, number, boolean, string no-JSON, JSON array string `'[1,2,3]'`, JSON primitivo `'"hello"'`/`'42'`, objeto con `toJSON` que lanza

### `canBeArray(v: unknown): boolean`
- `true`: `Array.isArray(v)` | string que parsea con `JSON.parse` a un array
- `false`: objeto plano, strings no-JSON, números, booleans, null, undefined, Map, Set, Date

### `canBeEnum(v: unknown, options: string[]): boolean`
- `true`: `typeof v` es `string | number | boolean` && `String(v)` está en `options` (exact match)
- `false`: null, undefined, object, Date, Symbol, Function; o valor no encontrado en options

---

## Implementación de `src/convert.ts`

Todas las funciones lanzan `ConvertError` ante input inválido.

### `ConvertError`
```ts
export class ConvertError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConvertError';
  }
}
```

### Reglas de conversión

| Función | Input válido → Output | Lanza `ConvertError` |
|---|---|---|
| `toString(v)` | string→string, boolean→`"true"/"false"`, finite number→`String(n)` | NaN, ±Infinity, null, undefined, object, array |
| `toInteger(v)` | number entero→number, string entera (trim)→number | float, boolean, string no-entera, null, undefined |
| `toFloat(v)` | number finito→number, string numérica→number | NaN, ±Infinity, string no-numérica, boolean, null, undefined |
| `toBoolean(v)` | boolean→boolean, `"true"/"1"`→true, `"false"/"0"`→false | strings distintas, numbers, null, undefined |
| `toDate(v)` | `Date` válido→Date, string ISO→`new Date(str)` | string inválida, number, boolean, null, undefined |
| `toJson(v)` | objeto plano no-vacío→object as-is, JSON string de objeto no-vacío→parsed | objeto vacío `{}`, array, null, undefined, number, boolean, JSON array string, string no-JSON |
| `toArray(v)` | `Array`→array as-is, JSON string de array→parsed array | objeto plano, string no-JSON, number, boolean, null, undefined |
| `toEnum(v, options)` | `String(v)` ∈ options → devuelve `v` original | v no en options, null, undefined |

---

## Cambios en `src/index.ts`

```ts
// Resultado final:
export { default as validator } from './validators';
export * from './primitives';
export * from './convert';
```

Líneas eliminadas:
```ts
// export type { HashAlgorithm } from './wasm/types/archi_validation';
// export { CastError } from './cast';
```

---

## Cambios en `tsconfig.json`

Eliminar el bloque `paths`:
```json
// ELIMINAR:
"paths": {
  "#wasm": ["./src/wasm/types/archi_validation"]
}
```

---

## Cambios en `package.json`

1. **Eliminar bloque `imports`** (routing de `#wasm`)
2. **Eliminar `moduleNameMapper`** en Jest config
3. **Cambiar `testRegex`** de `.*\\.spec\\.ts$` a `^(?!.*clientSide).*\\.spec\\.ts$`
4. **Simplificar `build`**: `"npm run build:cjs && npm run build:esm"`
5. **Eliminar scripts**: `setup`, `build:wasm`, `build:copy-wasm`, `benchmark`
6. **Limpiar `keywords`**: eliminar `wasm`, `webassembly`, `rust`

---

## Invariantes

- `src/__tests__/` no se modifica en ningún caso.
- Los imports de `#wasm` desaparecen completamente del código TypeScript.
- La API pública de `validator` (el objeto default export de `src/validators/`) no cambia.
- `canBe*` siempre devuelven `boolean`, nunca lanzan.
- `to*` siempre lanzan `ConvertError` (nunca otro tipo de error).
