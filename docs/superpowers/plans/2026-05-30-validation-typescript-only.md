# validation — TypeScript-only migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar toda la capa Rust/WASM del paquete `@archi-code/validation` y reimplementar las funciones `canBe*` y `to*` en TypeScript puro, sin romper los tests de control en `src/__tests__/`.

**Architecture:** Las funciones `canBe*` (boolean checkers) se implementan directamente en `src/primitives.ts` con lógica TypeScript pura. Las funciones `to*` (conversiones estrictas + `ConvertError`) se implementan en `src/convert.ts`. El objeto `validator` (validator.js-compatible) ya era TypeScript puro y no se toca.

**Tech Stack:** TypeScript 5.x, Jest 29, ts-jest. Sin dependencias externas nuevas.

---

### Task 1: Reescribir `src/primitives.ts` en TypeScript puro

**Files:**
- Modify: `packages/validation/src/primitives.ts`

- [ ] **Step 1: Verificar tests de control existentes**

```bash
cd packages/validation
npx jest src/__tests__/primitives/ --no-coverage 2>&1 | head -30
```

Expected: tests fallan porque `#wasm` no está disponible (o pasan si WASM está compilado). Confirmar cuáles fallan.

- [ ] **Step 2: Reemplazar `src/primitives.ts` con implementación pura TypeScript**

Sobreescribir `packages/validation/src/primitives.ts` con:

```typescript
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

export function canBeString(v: unknown): boolean {
  if (typeof v === 'string') return true;
  if (typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  return false;
}

export function canBeBoolean(v: unknown): boolean {
  if (typeof v === 'boolean') return true;
  if (typeof v === 'number') return v === 0 || v === 1;
  if (typeof v === 'string') return /^\s*(true|false|1|0)\s*$/i.test(v);
  return false;
}

export function canBeInteger(v: unknown): boolean {
  if (typeof v === 'number') return Number.isFinite(v) && Number.isInteger(v);
  if (typeof v === 'string') return /^-?\d+$/.test(v.trim());
  return false;
}

export function canBeFloat(v: unknown): boolean {
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed === '') return false;
    const n = Number(trimmed);
    return !isNaN(n) && isFinite(n);
  }
  return false;
}

export function canBeDate(v: unknown): boolean {
  if (v instanceof Date) return !isNaN(v.getTime());
  if (typeof v === 'string') {
    if (!DATE_FORMAT.test(v)) return false;
    return !isNaN(new Date(v.replace(' ', 'T')).getTime());
  }
  return false;
}

export function canBeJson(v: unknown): boolean {
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return p !== null && typeof p === 'object' && !Array.isArray(p) && Object.keys(p).length > 0;
    } catch {
      return false;
    }
  }
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
    if (Object.keys(v as object).length === 0) return false;
    try {
      JSON.stringify(v);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function canBeArray(v: unknown): boolean {
  if (Array.isArray(v)) return true;
  if (typeof v === 'string') {
    try {
      return Array.isArray(JSON.parse(v));
    } catch {
      return false;
    }
  }
  return false;
}

export function canBeEnum(v: unknown, options: string[]): boolean {
  if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') return false;
  return options.includes(String(v));
}
```

- [ ] **Step 3: Ejecutar tests de primitives — verificar que pasan**

```bash
cd packages/validation
npx jest src/__tests__/primitives/ --no-coverage
```

Expected: todos los tests pasan (8 suites, ~80 tests).

- [ ] **Step 4: Commit**

```bash
git add packages/validation/src/primitives.ts
git commit -m "refactor(validation): rewrite primitives.ts in pure TypeScript"
```

---

### Task 2: Reescribir `src/convert.ts` en TypeScript puro

**Files:**
- Modify: `packages/validation/src/convert.ts`

- [ ] **Step 1: Reemplazar `src/convert.ts` con implementación pura TypeScript**

Sobreescribir `packages/validation/src/convert.ts` con:

```typescript
export class ConvertError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConvertError';
  }
}

export function toString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new ConvertError(`Cannot convert ${v} to string`);
    return String(v);
  }
  throw new ConvertError(`Cannot convert ${typeof v} to string`);
}

export function toInteger(v: unknown): number {
  if (typeof v === 'number') {
    if (!Number.isFinite(v) || !Number.isInteger(v))
      throw new ConvertError(`Cannot convert ${v} to integer`);
    return v;
  }
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (!/^-?\d+$/.test(trimmed))
      throw new ConvertError(`Cannot convert "${v}" to integer`);
    return parseInt(trimmed, 10);
  }
  throw new ConvertError(`Cannot convert ${typeof v} to integer`);
}

export function toFloat(v: unknown): number {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new ConvertError(`Cannot convert ${v} to float`);
    return v;
  }
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed === '') throw new ConvertError(`Cannot convert "" to float`);
    const n = Number(trimmed);
    if (!isFinite(n) || isNaN(n)) throw new ConvertError(`Cannot convert "${v}" to float`);
    return n;
  }
  throw new ConvertError(`Cannot convert ${typeof v} to float`);
}

export function toBoolean(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') {
    if (v === 1) return true;
    if (v === 0) return false;
  }
  if (typeof v === 'string') {
    const lc = v.trim().toLowerCase();
    if (lc === 'true' || lc === '1') return true;
    if (lc === 'false' || lc === '0') return false;
  }
  throw new ConvertError(`Cannot convert to boolean`);
}

export function toDate(v: unknown): Date {
  if (v instanceof Date) {
    if (isNaN(v.getTime())) throw new ConvertError('Invalid Date object');
    return v;
  }
  if (typeof v === 'string') {
    const d = new Date(v);
    if (isNaN(d.getTime())) throw new ConvertError(`Cannot convert "${v}" to date`);
    return d;
  }
  throw new ConvertError(`Cannot convert ${typeof v} to date`);
}

export function toJson(v: unknown): Record<string, unknown> {
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      if (p !== null && typeof p === 'object' && !Array.isArray(p) && Object.keys(p).length > 0)
        return p as Record<string, unknown>;
    } catch {}
    throw new ConvertError(`Cannot convert string to JSON object`);
  }
  if (v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length > 0)
    return v as Record<string, unknown>;
  throw new ConvertError(`Cannot convert ${v === null ? 'null' : typeof v} to JSON object`);
}

export function toArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      if (Array.isArray(p)) return p;
    } catch {}
    throw new ConvertError(`Cannot convert "${v}" to array`);
  }
  throw new ConvertError(`Cannot convert ${typeof v} to array`);
}

export function toEnum(v: unknown, options: string[]): string | number | boolean {
  if (v === null || v === undefined)
    throw new ConvertError(`Cannot convert null/undefined to enum`);
  if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean')
    throw new ConvertError(`Cannot convert ${typeof v} to enum`);
  const str = String(v);
  if (!options.includes(str))
    throw new ConvertError(`"${str}" is not a valid enum option`);
  return v;
}
```

- [ ] **Step 2: Ejecutar tests de convert — verificar que pasan**

```bash
cd packages/validation
npx jest src/__tests__/convert/ --no-coverage
```

Expected: todos los tests de convert pasan (9 suites incluyendo error.spec.ts).

- [ ] **Step 3: Commit**

```bash
git add packages/validation/src/convert.ts
git commit -m "refactor(validation): rewrite convert.ts in pure TypeScript"
```

---

### Task 3: Actualizar `src/index.ts` — eliminar exports de WASM y cast

**Files:**
- Modify: `packages/validation/src/index.ts`

- [ ] **Step 1: Sobreescribir `src/index.ts`**

```typescript
export { default as validator } from './validators';
export * from './primitives';
export * from './convert';
```

- [ ] **Step 2: Verificar que los tests de validator siguen pasando (excluyendo clientSide)**

```bash
cd packages/validation
npx jest src/__tests__/validator/ --no-coverage --testPathIgnorePatterns='clientSide'
```

Expected: pasan los tests de validator (exports, sanitizers, util, validatorcore/, validators/). `clientSide.spec.ts` se excluye explícitamente aquí porque necesita bundles UMD externos que no existen — se excluirá permanentemente del testRegex en Task 4.

- [ ] **Step 3: Commit**

```bash
git add packages/validation/src/index.ts
git commit -m "refactor(validation): remove WASM and cast exports from index"
```

---

### Task 4: Actualizar `package.json` — limpiar configuración WASM

**Files:**
- Modify: `packages/validation/package.json`

- [ ] **Step 1: Aplicar los siguientes cambios en `package.json`**

El archivo resultante debe quedar así (mostrados solo los campos que cambian):

**`keywords`** — quitar wasm, webassembly, rust:
```json
"keywords": ["validation", "validator"]
```

**`scripts`** — quitar setup, build:wasm, build:copy-wasm, benchmark; simplificar build:
```json
"scripts": {
  "prebuild": "rm -rf dist || true",
  "build:cjs": "tsc -p tsconfig.cjs.json",
  "build:esm": "tsc -p tsconfig.esm.json",
  "build": "npm run build:cjs && npm run build:esm",
  "test": "jest",
  "coverage": "jest --coverage",
  "lint": "eslint src --ext .ts",
  "lint:fix": "eslint src --ext .ts --fix",
  "format": "prettier --check \"{src,test}/**/*.{js,jsx,ts,tsx,json,css,scss,md}\"",
  "format:fix": "prettier --write \"{src,test}/**/*.{js,jsx,ts,tsx,json,css,scss,md}\""
}
```

**`imports`** — eliminar el bloque entero (era el routing de `#wasm`).

**`jest`** — dos cambios:
1. Cambiar `testRegex` para excluir `clientSide.spec.ts`
2. Eliminar `moduleNameMapper`

```json
"jest": {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": "^(?!.*clientSide).*\\.spec\\.ts$",
  "transform": {
    "^.+\\.ts$": ["ts-jest", { "diagnostics": false, "tsconfig": { "esModuleInterop": true } }]
  },
  "collectCoverageFrom": ["**/*.(t|j)s"],
  "coverageDirectory": "./../coverage",
  "testEnvironment": "node",
  "collectCoverage": false,
  "injectGlobals": true,
  "coverageThreshold": {
    "global": {
      "branches": 20,
      "functions": 20,
      "lines": 20,
      "statements": 20
    }
  }
}
```

- [ ] **Step 2: Verificar que Jest encuentra los tests correctos**

```bash
cd packages/validation
npx jest --listTests 2>&1 | sort
```

Expected: lista de archivos `.spec.ts` sin ninguno llamado `clientSide.spec.ts`.

- [ ] **Step 3: Commit**

```bash
git add packages/validation/package.json
git commit -m "refactor(validation): remove WASM scripts and config from package.json"
```

---

### Task 5: Actualizar `tsconfig.json` — eliminar paths de `#wasm`

**Files:**
- Modify: `packages/validation/tsconfig.json`

- [ ] **Step 1: Sobreescribir `tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["../../node_modules", "node_modules", "dist", "coverage"]
}
```

- [ ] **Step 2: Verificar que TypeScript compila sin errores**

```bash
cd packages/validation
npx tsc --noEmit
```

Expected: sin errores de compilación. Si hay errores de `#wasm`, significa que algún archivo todavía importa de `#wasm` (verificar que tasks 1-3 se completaron correctamente).

- [ ] **Step 3: Commit**

```bash
git add packages/validation/tsconfig.json
git commit -m "refactor(validation): remove #wasm paths from tsconfig"
```

---

### Task 6: Eliminar artefactos Rust/WASM

**Files:**
- Delete: `packages/validation/rust/`
- Delete: `packages/validation/src/wasm/`
- Delete: `packages/validation/src/cast.ts`
- Delete: `packages/validation/benchmark.js`

- [ ] **Step 1: Verificar que ningún archivo TypeScript restante importa de las rutas a eliminar**

```bash
grep -r "#wasm\|from.*cast\|benchmark\|rust/" packages/validation/src --include="*.ts"
```

Expected: sin output (ningún import restante).

- [ ] **Step 2: Eliminar el directorio `rust/`**

```bash
rm -rf packages/validation/rust
```

- [ ] **Step 3: Eliminar el directorio `src/wasm/`**

```bash
rm -rf packages/validation/src/wasm
```

- [ ] **Step 4: Eliminar `src/cast.ts` y `benchmark.js`**

```bash
rm packages/validation/src/cast.ts
rm packages/validation/benchmark.js
```

- [ ] **Step 5: Verificar que no quedan archivos WASM/Rust**

```bash
find packages/validation -name "*.wasm" -o -name "*.rs" -o -name "Cargo.toml" 2>/dev/null
```

Expected: sin output.

- [ ] **Step 6: Commit**

```bash
git rm -r packages/validation/rust packages/validation/src/wasm
git rm packages/validation/src/cast.ts packages/validation/benchmark.js
git commit -m "chore(validation): delete Rust, WASM artifacts, cast.ts, and benchmark"
```

---

### Task 7: Verificación final — ejecutar suite completa de tests

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Ejecutar todos los tests del paquete**

```bash
cd packages/validation
npm test
```

Expected: todos los tests pasan. Debe mostrar algo como:
```
Test Suites: XX passed, XX total
Tests:       XXX passed, XXX total
```

Sin suites fallidas, sin `clientSide` en la lista de tests ejecutados.

- [ ] **Step 2: Verificar que el build TypeScript compila correctamente**

```bash
cd packages/validation
npm run build
```

Expected: se generan `dist/cjs/` y `dist/esm/` sin errores. No debe intentar ejecutar nada relacionado con WASM.

- [ ] **Step 3: Verificar que los archivos dist exportan correctamente**

```bash
node -e "const v = require('./packages/validation/dist/cjs/index.js'); console.log(Object.keys(v))"
```

Expected: muestra `[ 'validator', 'canBeString', 'canBeBoolean', 'canBeInteger', 'canBeFloat', 'canBeDate', 'canBeJson', 'canBeArray', 'canBeEnum', 'ConvertError', 'toString', 'toInteger', 'toFloat', 'toBoolean', 'toDate', 'toJson', 'toArray', 'toEnum' ]`

- [ ] **Step 4: Commit final si todo pasa**

```bash
git add packages/validation
git commit -m "refactor(validation): complete TypeScript-only migration — remove Rust/WASM"
```

---

## Resumen de invariantes

- `src/__tests__/` — NO se modifica en ningún momento
- `src/validators/` — NO se modifica (ya era TypeScript puro)
- `canBe*` siempre devuelven `boolean`, nunca lanzan
- `to*` lanzan exclusivamente `ConvertError` (no `Error` genérico)
- El mensaje de `ConvertError` siempre incluye el valor inválido (requerido por `error.spec.ts`)
- `clientSide.spec.ts` queda excluido del `testRegex` de Jest (necesita bundles UMD externos que no existen en el proyecto)
