import 'reflect-metadata';
import { Bench } from 'tinybench';
import { cases } from './cases';
import { formatTable, writeMarkdown, type Row } from './report';

// Per-task measurement window (ms). Override with BENCH_TIME env var.
const TIME = Number(process.env.BENCH_TIME ?? 150);

/** Runs a tinybench and returns a name -> result map. */
async function runBench(
  register: (bench: Bench) => void,
): Promise<Map<string, { hz: number; mean: number; rme: number }>> {
  const bench = new Bench({ time: TIME });
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
  console.log(`Running benchmark (${TIME}ms/task, ${cases.length} validators × 2 paths)...\n`);

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
