import 'reflect-metadata';
import { Bench } from 'tinybench';
import { samples } from '../test/validator/samples';
import { formatTable, writeMarkdown, type Row } from './report';
import { readBaseline, writeBaseline, type Baseline } from './baseline';

// ── Cambia este número para controlar cuántos ciclos se miden por validador. ──
// Menos ciclos = benchmark más rápido pero menos preciso.
// Más ciclos  = más lento pero resultados más estables (±% más bajo).
//
//   50  → ~5 seg   (exploración rápida)
//   200 → ~20 seg  (balance)
//   500 → ~50 seg  (resultados precisos para publicar)
//
// Puede ser sobrescrito via env var: BENCH_CYCLES=500 npm run benchmark
const CYCLES_PER_VALIDATOR = parseInt(process.env['BENCH_CYCLES'] ?? '500', 10);
// ─────────────────────────────────────────────────────────────────────────────

/** Runs a tinybench and returns a name -> result map. */
async function runBench(
  register: (bench: Bench) => void,
): Promise<Map<string, { hz: number; mean: number; rme: number }>> {
  const bench = new Bench({
    time: 0, // deshabilita el mínimo de tiempo — solo cuentan las iteraciones
    warmupTime: 0, // ídem para el warmup
    iterations: CYCLES_PER_VALIDATOR,
    warmupIterations: Math.max(1, Math.floor(CYCLES_PER_VALIDATOR / 10)),
  });
  register(bench);
  await bench.run();
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

/** Menor de dos números tratando undefined como +Infinito (para acumular mínimos históricos). */
function minNs(prev: number | undefined, current: number): number {
  return Math.min(prev ?? Number.POSITIVE_INFINITY, current);
}

async function main(): Promise<void> {
  console.log(
    `Running benchmark (${CYCLES_PER_VALIDATOR} ciclos/validador, ${samples.length} validators × 2 paths)...\n`,
  );

  // Ruta ✓ éxito: se rota sobre los valores válidos.
  const okResults = await runBench((b) => {
    for (const s of samples) {
      let i = 0;
      b.add(s.name, () => s.run(s.valid[i++ % s.valid.length]));
    }
  });

  // Ruta ✗ error: se rota sobre los valores inválidos.
  const errResults = await runBench((b) => {
    for (const s of samples) {
      let i = 0;
      b.add(s.name, () => s.run(s.invalid[i++ % s.invalid.length]));
    }
  });

  // Mejor marca histórica: se lee la referencia previa (para mostrar/colorear) y se
  // recalcula el mínimo (nunca sube) para guardarlo de cara a futuras corridas.
  const prevBaseline = readBaseline();
  const nextBaseline: Baseline = {};

  const rows: Row[] = samples.map((s) => {
    const ok = okResults.get(s.name)!;
    const err = errResults.get(s.name)!;
    const prev = prevBaseline[s.name];
    nextBaseline[s.name] = {
      okNs: minNs(prev?.okNs, ok.mean),
      errNs: minNs(prev?.errNs, err.mean),
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
