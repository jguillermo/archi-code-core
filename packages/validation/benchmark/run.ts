import 'reflect-metadata';
import { Bench } from 'tinybench';
import { cases, type BenchCase } from './cases';
import { makeDecoratedClass, validateDecorator } from './classes';
import { formatTable, writeMarkdown, type Row } from './report';

// Per-task measurement window (ms). Override with BENCH_TIME env var.
const TIME = Number(process.env.BENCH_TIME ?? 150);

function cvInputOf(c: BenchCase): unknown {
  return 'cvInput' in c ? c.cvInput : c.input;
}

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
    // tinybench: throughput.mean (ops/sec), latency.mean (ms), latency.rme (%).
    // Fall back to legacy fields if present.
    const hz = (r as any).throughput?.mean ?? (r as any).hz ?? 0;
    const meanMs = (r as any).latency?.mean ?? (r as any).mean ?? 0;
    const rme = (r as any).latency?.rme ?? (r as any).rme ?? 0;
    map.set(task.name, { hz, mean: meanMs, rme });
  }
  return map;
}

async function main(): Promise<void> {
  console.log(`Running benchmark (${TIME}ms/task, ${cases.length} validators)...\n`);

  // Raw mode: our fn vs class-validator standalone fn.
  const rawMine = await runBench((b) => {
    for (const c of cases) b.add(`${c.name}`, () => c.mine(c.input));
  });
  const rawCv = await runBench((b) => {
    for (const c of cases) {
      if (!c.cvFn) continue;
      const input = cvInputOf(c);
      b.add(`${c.name}`, () => c.cvFn!(input));
    }
  });

  // Decorator mode: our fn vs validateSync over a decorated class.
  const decoCv = await runBench((b) => {
    for (const c of cases) {
      if (!c.cvDecorator) continue;
      const Klass = makeDecoratedClass(c.cvDecorator);
      const input = cvInputOf(c);
      b.add(`${c.name}`, () => validateDecorator(Klass, input));
    }
  });

  const msToNs = (ms: number) => ms * 1_000_000;

  const rawRows: Row[] = cases.map((c) => {
    const mine = rawMine.get(c.name)!;
    const cv = rawCv.get(c.name);
    return {
      name: c.name,
      mineOps: mine.hz,
      mineNs: msToNs(mine.mean),
      mineRme: mine.rme,
      cvOps: cv ? cv.hz : null,
      cvNs: cv ? msToNs(cv.mean) : null,
      ratio: cv && cv.hz > 0 ? mine.hz / cv.hz : null,
    };
  });

  const decoRows: Row[] = cases.map((c) => {
    const mine = rawMine.get(c.name)!;
    const cv = decoCv.get(c.name);
    return {
      name: c.name,
      mineOps: mine.hz,
      mineNs: msToNs(mine.mean),
      mineRme: mine.rme,
      cvOps: cv ? cv.hz : null,
      cvNs: cv ? msToNs(cv.mean) : null,
      ratio: cv && cv.hz > 0 ? mine.hz / cv.hz : null,
    };
  });

  console.log('=== RAW MODE (our fn vs class-validator standalone fn) ===\n');
  console.log(formatTable(rawRows));
  console.log('\n=== DECORATOR MODE (our fn vs validateSync over @Decorator class) ===\n');
  console.log(formatTable(decoRows));

  const cvVersion = require('class-validator/package.json').version as string;
  const path = writeMarkdown(decoRows, { node: process.version, cv: cvVersion });
  console.log(`\nMarkdown report written to ${path}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
