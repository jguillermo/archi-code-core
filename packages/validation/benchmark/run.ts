import 'reflect-metadata';
import { Bench } from 'tinybench';
import { samples } from '../test/validator/samples';
import { formatTable, writeMarkdown, compareNs, DEFAULT_TOLERANCE, type Row } from './report';
import { readBaseline, writeBaseline, type Baseline } from './baseline';

// ── Número de muestras (iteraciones) medidas por validador. ──────────────────
// Se mide un número FIJO de veces (no por tiempo): tinybench guarda cada muestra en
// memoria, así que medir "por tiempo" sobre funciones de nanosegundos genera millones
// de muestras y agota la RAM. Un número fijo mantiene la memoria acotada.
// Más muestras = promedio más estable y ±% más bajo (dos corridas dan casi lo mismo),
// pero tarda más. Configurable con BENCH_SAMPLES.
//
//   5000   → rápido, algo de ruido
//   30000  → estable (por defecto)
//   100000 → muy estable, más lento
const BENCH_SAMPLES = parseInt(process.env['BENCH_SAMPLES'] ?? '30000', 10);
const WARMUP_SAMPLES = Math.max(200, Math.floor(BENCH_SAMPLES / 10));
// ─────────────────────────────────────────────────────────────────────────────

/** ¿Renderizar barra de progreso animada? Solo si la salida es una terminal. */
const SHOW_PROGRESS = Boolean(process.stdout.isTTY);

/** Dibuja una barra de progreso en la MISMA línea (se sobrescribe con \r). */
function renderProgress(label: string, done: number, total: number, current: string): void {
  const width = 24;
  const filled = Math.round((done / total) * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  const line = `  ${label} [${bar}] ${done}/${total}  ${current}`;
  // Se rellena con espacios para borrar el nombre anterior (más largo) y \r vuelve al inicio.
  process.stdout.write('\r' + line.padEnd(72) + '\r' + line.padEnd(72));
}

/** Runs a tinybench and returns a name -> result map, con barra de progreso por validador. */
async function runBench(
  register: (bench: Bench) => void,
  label: string,
): Promise<Map<string, { hz: number; mean: number; rme: number }>> {
  const bench = new Bench({
    time: 0, // desactiva el modo por tiempo — se usa un número fijo de iteraciones (memoria acotada)
    warmupTime: 0,
    iterations: BENCH_SAMPLES,
    warmupIterations: WARMUP_SAMPLES,
  });
  register(bench);

  const total = bench.tasks.length;
  let done = 0;
  // El evento 'cycle' del bench se dispara UNA vez por validador al terminar de medirse.
  const onCycle = (e: any): void => {
    done += 1;
    if (SHOW_PROGRESS) renderProgress(label, done, total, e?.task?.name ?? '');
  };
  bench.addEventListener('cycle', onCycle);
  if (SHOW_PROGRESS) renderProgress(label, 0, total, 'iniciando…');
  else console.log(`  ${label}: midiendo ${total} validadores (${BENCH_SAMPLES} muestras c/u)…`);

  await bench.run();
  bench.removeEventListener('cycle', onCycle);
  if (SHOW_PROGRESS) process.stdout.write('\n');

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

async function main(): Promise<void> {
  console.log(
    `Benchmark: ${samples.length} validadores × 2 rutas (éxito/error), ${BENCH_SAMPLES} muestras c/u.\n`,
  );

  // Ruta ✓ éxito: se rota sobre los valores válidos.
  const okResults = await runBench((b) => {
    for (const s of samples) {
      let i = 0;
      b.add(s.name, () => s.run(s.valid[i++ % s.valid.length]));
    }
  }, 'éxito ✓');

  // Ruta ✗ error: se rota sobre los valores inválidos.
  const errResults = await runBench((b) => {
    for (const s of samples) {
      let i = 0;
      b.add(s.name, () => s.run(s.invalid[i++ % s.invalid.length]));
    }
  }, 'error ✗');

  // Mejor marca histórica: se lee la referencia previa (para mostrar/colorear) y se
  // recalcula el mínimo (nunca sube) para guardarlo de cara a futuras corridas.
  const prevBaseline = readBaseline();
  const nextBaseline: Baseline = {};

  const rows: Row[] = samples.map((s) => {
    const ok = okResults.get(s.name)!;
    const err = errResults.get(s.name)!;
    const prev = prevBaseline[s.name];
    nextBaseline[s.name] = {
      okNs: nextRef(prev?.okNs, ok.mean, ok.rme),
      errNs: nextRef(prev?.errNs, err.mean, err.rme),
    };
    return {
      name: s.name,
      okOps: ok.hz,
      okNs: ok.mean,
      okRme: ok.rme,
      errOps: err.hz,
      errNs: err.mean,
      errRme: err.rme,
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
