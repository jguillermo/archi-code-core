# validation benchmark

Mide el rendimiento de cada validador `is*` de `@archi-code/validation` en dos rutas
—input **✓ válido** e input **✗ inválido**— y las compara contra la **mejor marca
histórica** de la máquina, para saber de un vistazo si un cambio mejora o empeora.

## Cómo se corre

```bash
npm install -w packages/validation   # una vez, para tinybench
npm run benchmark -w packages/validation
```

La medición completa se **repite varias veces** (`BENCH_REPEATS`, default **10**) y el valor
final de cada validador es el **promedio recortado** de esas repeticiones: se descarta la más
lenta (y la más rápida si hay ≥4) y se promedia el resto. Así una corrida con mala suerte (GC,
throttling) no define el resultado. Cada repetición mide `BENCH_SAMPLES` muestras (default
**10000**). Total ≈ 10 s.

```bash
npm run benchmark -w packages/validation                              # 10 reps × 10000 (default)
BENCH_REPEATS=3 BENCH_SAMPLES=5000 npm run benchmark -w ...           # rápido para iterar
BENCH_REPEATS=20 npm run benchmark -w ...                             # aún más estable, más lento
```

> Se mide por número fijo de muestras (no por tiempo) a propósito: tinybench guarda cada
> muestra en memoria, y medir "por tiempo" sobre funciones de nanosegundos genera millones de
> muestras y agota la RAM. Un microbenchmark siempre tiene algo de ruido (GC, JIT,
> turbo/throttle del CPU); por eso además de promediar repeticiones, el color es "consciente
> del ruido" (ver abajo): un cambio dentro del margen de error **no** se marca.
>
> Mientras corre verás **una sola barra de progreso** (0-100% de todo el trabajo):
> `[██████████░░░░░░░░░░] 42%`.

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

## Referencia y colores

- En cada corrida se guarda una **referencia** por validador (éxito y error) en
  `benchmark/best-scores.json` (**local**, ignorado por git — los tiempos dependen del
  hardware). La referencia **solo se mueve ante un cambio real**: baja cuando de verdad
  mejoras (más allá del ruido) y se mantiene en caso de regresión o ruido. Así no se arrastra
  hacia un mínimo "con suerte" ni genera colores falsos.
- La tabla muestra 4 datos por validador: el tiempo **éxito (ns)**, su **Δ**, el tiempo
  **error (ns)** y su **Δ**. El **Δ** indica cuánto cambió vs tu referencia:
  - 🔴 **rojo** = más lento que la referencia (regresión real).
  - 🟢 **verde** = más rápido que la referencia (mejora real); baja la referencia.
  - ⚪ gris = sin cambio real (dentro del ruido/tolerancia).
- `ns` = nanosegundos por llamada. **Menos ns = más rápido.**

**Comparación consciente del ruido (en ambos sentidos):** solo se marca rojo/verde si el
cambio supera **tanto** la tolerancia fija **como** el margen de error (±%) de esa medición.
Así el ruido estadístico no se marca como cambio. Correr dos veces el mismo código debería
dar casi todo gris.

Tolerancia fija (default 10 %):

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
