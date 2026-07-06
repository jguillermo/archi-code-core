# validation benchmark

Mide el rendimiento de cada validador `is*` de `@archi-code/validation` en dos rutas
—input **✓ válido** e input **✗ inválido**— y las compara contra la **mejor marca
histórica** de la máquina, para saber de un vistazo si un cambio mejora o empeora.

## Cómo se corre

```bash
npm install -w packages/validation   # una vez, para tinybench
npm run benchmark -w packages/validation
```

Número de ciclos medidos por validador (default 500):

```bash
BENCH_CYCLES=50 npm run benchmark -w packages/validation    # rápido, menos preciso
BENCH_CYCLES=500 npm run benchmark -w packages/validation   # preciso, más lento
```

## De dónde salen los valores a testear

Cada validador aporta sus propios valores **success** y **error** en un archivo colocado
en el árbol de tests: `test/validator/samples/<validador>.samples.ts`. Cada uno exporta un
`ValidatorSample` con:

- `name` — nombre del validador,
- `run(input)` — cómo invocarlo (con sus args, p. ej. `isHash(v, 'md5')`),
- `valid` / `invalid` — los valores a medir.

El benchmark los lee desde `test/validator/samples/index.ts`. El spec-contrato
`test/validator/samples.contract.spec.ts` (parte de `npm test`) verifica que todo `valid`
retorne `true` y todo `invalid` retorne `false`, garantizando que las mediciones son
correctas.

## Mejor marca histórica (best) y colores

- En cada corrida se guarda el **tiempo mínimo** (mejor marca) de cada validador para éxito
  y error en `benchmark/best-scores.json` (**local**, ignorado por git — los tiempos dependen
  del hardware). El baseline **solo baja**: nunca sube.
- La tabla muestra 4 datos por validador: el tiempo **éxito (ns)**, su **Δ**, el tiempo
  **error (ns)** y su **Δ**. El tiempo se colorea y el **Δ** indica cuánto cambió vs tu mejor
  marca (la mejor marca se guarda internamente, no se muestra como columna):
  - 🔴 **rojo** = el actual es peor que el récord por más de la tolerancia (regresión).
  - 🟢 **verde** = nuevo récord (igual o más rápido que el mejor); se guarda como nueva marca.
  - ⚪ gris = peor que el récord pero dentro de la tolerancia (ruido de medición).
- `ns` = nanosegundos por llamada. **Menos ns = más rápido.**

Tolerancia (default 10 %), para no marcar rojo por el ruido de tinybench:

```bash
BENCH_TOLERANCE=0.05 npm run benchmark -w packages/validation   # 5%
```

Empezar de cero (ignora/reescribe la mejor marca guardada):

```bash
BENCH_RESET=1 npm run benchmark -w packages/validation
```

Desactivar colores (salida en texto plano; también automático si la salida no es una TTY):

```bash
NO_COLOR=1 npm run benchmark -w packages/validation
```

## Salida

- Tabla en consola ordenada de más lento a más rápido (por éxito): `validador` / `éxito (ns)`
  / `éxito Δ` / `error (ns)` / `error Δ`, con una explicación en español arriba.
- `benchmark/RESULTS.md` con la misma información y los indicadores 🔴 / 🟢 / ⚪.
