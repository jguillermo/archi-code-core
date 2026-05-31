import 'reflect-metadata';
import { Bench } from 'tinybench';
import { cases } from './cases';
import { formatTable, writeMarkdown, type Row } from './report';

// ── Cambia este número para controlar cuántos ciclos se miden por validador. ──
// Menos ciclos = benchmark más rápido pero menos preciso.
// Más ciclos  = más lento pero resultados más estables (±% más bajo).
//
//   50  → ~5 seg   (exploración rápida)
//   200 → ~20 seg  (balance)
//   500 → ~50 seg  (resultados precisos para publicar)
const CYCLES_PER_VALIDATOR = 200;
// ─────────────────────────────────────────────────────────────────────────────

/** Runs a tinybench and returns a name -> result map. */
async function runBench(
  register: (bench: Bench) => void,
): Promise<Map<string, { hz: number; mean: number; rme: number }>> {
  const bench = new Bench({
    time: 0,            // deshabilita el mínimo de tiempo — solo cuentan las iteraciones
    warmupTime: 0,      // ídem para el warmup
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

async function main(): Promise<void> {
  console.log(`Running benchmark (${CYCLES_PER_VALIDATOR} ciclos/validador, ${cases.length} validators × 2 paths)...\n`);

  const okResults = await runBench((b) => {
    for (const c of cases) {
      let i = 0;
      b.add(c.name, () => c.mine(c.inputs[i++ % c.inputs.length]));
    }
  });

  const errResults = await runBench((b) => {
    for (const c of cases) {
      let i = 0;
      b.add(c.name, () => c.mine(c.errorInputs[i++ % c.errorInputs.length]));
    }
  });

  const rows: Row[] = cases.map((c) => {
    const ok = okResults.get(c.name)!;
    const err = errResults.get(c.name)!;
    return {
      name: c.name,
      okOps: ok.hz,
      okNs: ok.mean,
      okRme: ok.rme,
      errOps: err.hz,
      errNs: err.mean,
      errRme: err.rme,
    };
  });

  console.log(formatTable(rows));

  const path = writeMarkdown(rows, { node: process.version });
  console.log(`\nMarkdown report written to ${path}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
