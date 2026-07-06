import 'reflect-metadata';
import { Bench } from 'tinybench';
import { samples } from '../test/validator/samples';
import { formatTable, writeMarkdown, compareNs, DEFAULT_TOLERANCE, type Row } from './report';
import { readBaseline, writeBaseline, type Baseline } from './baseline';

// ── Muestras por validador y repeticiones de la medición. ────────────────────
// Se mide un número FIJO de muestras (no por tiempo): tinybench guarda cada muestra en
// memoria, así que medir "por tiempo" sobre funciones de nanosegundos genera millones de
// muestras y agota la RAM. Un número fijo mantiene la memoria acotada.
//
// Además, la medición completa se repite BENCH_REPEATS veces y el valor final de cada
// validador es el PROMEDIO RECORTADO de esas repeticiones (se descarta la más lenta —y la más
// rápida si hay ≥4—), para que una corrida con mala suerte (GC, throttling) no defina el
// resultado. Más muestras y más repeticiones = más estable pero más lento.
//
//   BENCH_SAMPLES=10000 BENCH_REPEATS=10  → estable (por defecto, ~10 s)
//   BENCH_REPEATS=3 BENCH_SAMPLES=5000    → rápido para iterar
const BENCH_SAMPLES = parseInt(process.env['BENCH_SAMPLES'] ?? '10000', 10);
const BENCH_REPEATS = Math.max(1, parseInt(process.env['BENCH_REPEATS'] ?? '10', 10));
const WARMUP_SAMPLES = Math.max(200, Math.floor(BENCH_SAMPLES / 10));
// ─────────────────────────────────────────────────────────────────────────────

/** Promedio simple de un arreglo (0 si está vacío). */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Promedio recortado: descarta el valor más alto (y el más bajo si hay ≥4) y promedia el
 * resto. Con ≤2 valores promedia todos. Evita que una repetición atípica sesgue el resultado.
 */
function trimmedMean(values: number[]): number {
  if (values.length <= 2) return mean(values);
  const sorted = [...values].sort((a, b) => a - b);
  sorted.pop(); // descarta el más lento (mayor)
  if (sorted.length >= 3) sorted.shift(); // y el más rápido (menor) si quedaban ≥4
  return mean(sorted);
}

/**
 * Coeficiente de variación (%) entre las repeticiones: desviación estándar / media × 100.
 * Es el ruido REAL medido de ese validador (cuánto varía su tiempo de corrida a corrida). Se
 * usa como banda: un cambio menor que este ruido no se marca como mejora/regresión.
 */
function cvPct(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  if (m <= 0) return 0;
  const variance = mean(values.map((v) => (v - m) ** 2));
  return (Math.sqrt(variance) / m) * 100;
}

/** ¿Renderizar barra de progreso animada? Solo si la salida es una terminal. */
const SHOW_PROGRESS = Boolean(process.stdout.isTTY);

/** Dibuja UNA sola barra de progreso corta (0-100% del trabajo total) en la misma línea. */
function renderProgress(done: number, total: number): void {
  const width = 30;
  const ratio = total > 0 ? done / total : 0;
  const filled = Math.round(ratio * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  // \x1b[2K limpia toda la línea; \r vuelve al inicio. Línea corta → nunca se envuelve.
  process.stdout.write(`\r\x1b[2K  [${bar}] ${Math.round(ratio * 100)}%`);
}

/**
 * Runs a tinybench y devuelve un mapa nombre -> resultado. `onCycle` se llama una vez por
 * validador al terminar de medirse (para avanzar la barra de progreso global).
 */
async function runBench(
  register: (bench: Bench) => void,
  onCycle: () => void,
): Promise<Map<string, { hz: number; mean: number; rme: number }>> {
  const bench = new Bench({
    time: 0, // desactiva el modo por tiempo — se usa un número fijo de iteraciones (memoria acotada)
    warmupTime: 0,
    iterations: BENCH_SAMPLES,
    warmupIterations: WARMUP_SAMPLES,
  });
  register(bench);

  const handler = (): void => onCycle();
  bench.addEventListener('cycle', handler);
  await bench.run();
  bench.removeEventListener('cycle', handler);

  const map = new Map<string, { hz: number; mean: number; rme: number }>();
  for (const task of bench.tasks) {
    const r = task.result;
    if (!r) continue;
    const hz = (r as any).throughput?.mean ?? (r as any).hz ?? 0;
    const meanMs = (r as any).latency?.mean ?? (r as any).mean ?? 0;
    const rme = (r as any).latency?.rme ?? (r as any).rme ?? 0;
    map.set(task.name, { hz, mean: meanMs, rme });
  }
  return map;
}

/**
 * Nueva referencia para un validador. La referencia SOLO se mueve ante un cambio real:
 * - primera vez → guarda el actual;
 * - mejora real (más rápido más allá del ruido) → baja la referencia al actual;
 * - regresión o ruido → mantiene la referencia previa (así el rojo persiste hasta que
 *   realmente mejores, y el ruido no arrastra la referencia hacia un mínimo "con suerte").
 */
function nextRef(prev: number | undefined, current: number, rme: number): number {
  if (prev === undefined) return current;
  return compareNs(current, prev, DEFAULT_TOLERANCE, rme) === 'improved' ? current : prev;
}

/** Acumula las mediciones de cada repetición por validador, para promediarlas al final. */
type Acc = { ns: number[]; hz: number[] };

function accumulate(
  dst: Map<string, Acc>,
  src: Map<string, { hz: number; mean: number; rme: number }>,
): void {
  for (const [name, r] of src) {
    const a = dst.get(name) ?? { ns: [], hz: [] };
    a.ns.push(r.mean);
    a.hz.push(r.hz);
    dst.set(name, a);
  }
}

async function main(): Promise<void> {
  console.log(
    `Benchmark: ${samples.length} validadores × 2 rutas (éxito/error), ` +
      `${BENCH_REPEATS} repeticiones × ${BENCH_SAMPLES} muestras (promedio recortado).\n`,
  );

  const okAcc = new Map<string, Acc>();
  const errAcc = new Map<string, Acc>();

  // UNA sola barra de progreso para TODO el trabajo: reps × 2 rutas × validadores.
  const totalUnits = BENCH_REPEATS * 2 * samples.length;
  let doneUnits = 0;
  const tick = (): void => {
    doneUnits += 1;
    if (SHOW_PROGRESS) renderProgress(doneUnits, totalUnits);
  };

  if (SHOW_PROGRESS) renderProgress(0, totalUnits);

  for (let r = 1; r <= BENCH_REPEATS; r++) {
    // Ruta ✓ éxito: se rota sobre los valores válidos.
    accumulate(
      okAcc,
      await runBench((b) => {
        for (const s of samples) {
          let i = 0;
          b.add(s.name, () => s.run(s.valid[i++ % s.valid.length]));
        }
      }, tick),
    );

    // Ruta ✗ error: se rota sobre los valores inválidos.
    accumulate(
      errAcc,
      await runBench((b) => {
        for (const s of samples) {
          let i = 0;
          b.add(s.name, () => s.run(s.invalid[i++ % s.invalid.length]));
        }
      }, tick),
    );
  }
  if (SHOW_PROGRESS) process.stdout.write('\n');

  // Valor final por validador = promedio recortado de las repeticiones. Se lee la referencia
  // previa (para mostrar/colorear) y se recalcula (vía nextRef) para guardarla.
  const prevBaseline = readBaseline();
  const nextBaseline: Baseline = {};

  const rows: Row[] = samples.map((s) => {
    const ok = okAcc.get(s.name)!;
    const err = errAcc.get(s.name)!;
    const okNs = trimmedMean(ok.ns);
    const okRme = cvPct(ok.ns); // ruido real = dispersión entre repeticiones
    const errNs = trimmedMean(err.ns);
    const errRme = cvPct(err.ns);
    const prev = prevBaseline[s.name];
    nextBaseline[s.name] = {
      okNs: nextRef(prev?.okNs, okNs, okRme),
      errNs: nextRef(prev?.errNs, errNs, errRme),
    };
    return {
      name: s.name,
      okOps: trimmedMean(ok.hz),
      okNs,
      okRme,
      errOps: trimmedMean(err.hz),
      errNs,
      errRme,
      bestOkNs: prev?.okNs,
      bestErrNs: prev?.errNs,
    };
  });

  console.log(formatTable(rows));

  writeBaseline(nextBaseline);
  const path = writeMarkdown(rows, { node: process.version });
  console.log(`\nMarkdown report written to ${path}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
