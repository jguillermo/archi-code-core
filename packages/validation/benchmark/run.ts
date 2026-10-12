import { Bench } from 'tinybench';
import { samples } from './samples';
import { formatTable, writeMarkdown, compareNs, DEFAULT_TOLERANCE, type Row } from './report';
import { readBaseline, writeBaseline, type Baseline } from './baseline';

const BENCH_SAMPLES = parseInt(process.env['BENCH_SAMPLES'] ?? '10000', 10);
const BENCH_REPEATS = Math.max(1, parseInt(process.env['BENCH_REPEATS'] ?? '10', 10));
const WARMUP_SAMPLES = Math.max(200, Math.floor(BENCH_SAMPLES / 10));

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function trimmedMean(values: number[]): number {
  if (values.length <= 2) return mean(values);
  const sorted = [...values].sort((a, b) => a - b);
  sorted.pop();
  if (sorted.length >= 3) sorted.shift();
  return mean(sorted);
}

function coefficientOfVariationPct(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  if (m <= 0) return 0;
  const variance = mean(values.map((v) => (v - m) ** 2));
  return (Math.sqrt(variance) / m) * 100;
}

function toNs(ms: number): number {
  return Math.round(ms * 1_000_000);
}

const SHOW_PROGRESS = Boolean(process.stdout.isTTY);
const RETURN_AND_CLEAR_LINE = '\r\x1b[2K';

function renderProgress(done: number, total: number): void {
  const width = 30;
  const ratio = total > 0 ? done / total : 0;
  const filled = Math.round(ratio * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  process.stdout.write(`${RETURN_AND_CLEAR_LINE}  [${bar}] ${Math.round(ratio * 100)}%`);
}

// tinybench 2.x exposes hz/mean/rme; 3.x+ groups them under throughput/latency.
interface BenchResult {
  hz?: number;
  mean?: number;
  rme?: number;
  throughput?: { mean?: number };
  latency?: { mean?: number; rme?: number };
}

async function runBench(
  register: (bench: Bench) => void,
  onCycle: () => void,
): Promise<Map<string, { hz: number; mean: number; rme: number }>> {
  const bench = new Bench({
    // tinybench keeps every sample: timing nanosecond functions by duration exhausts memory.
    time: 0,
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
    const r = task.result as BenchResult | undefined;
    if (!r) continue;
    const hz = r.throughput?.mean ?? r.hz ?? 0;
    const meanMs = r.latency?.mean ?? r.mean ?? 0;
    const rme = r.latency?.rme ?? r.rme ?? 0;
    map.set(task.name, { hz, mean: meanMs, rme });
  }
  return map;
}

// Only a real improvement lowers the reference, so noise never drags it to a lucky minimum.
function nextRef(prev: number | undefined, current: number, rme: number): number {
  if (prev === undefined) return current;
  return compareNs(current, prev, DEFAULT_TOLERANCE, rme) === 'improved' ? current : prev;
}

interface RepeatMeasurements {
  ns: number[];
  hz: number[];
}

function accOf(acc: Map<string, RepeatMeasurements>, name: string): RepeatMeasurements {
  const a = acc.get(name);
  if (!a) throw new Error(`Sin mediciones para ${name}`);
  return a;
}

function accumulate(
  dst: Map<string, RepeatMeasurements>,
  src: Map<string, { hz: number; mean: number; rme: number }>,
): void {
  for (const [name, r] of src) {
    const a = dst.get(name) ?? { ns: [], hz: [] };
    a.ns.push(r.mean);
    a.hz.push(r.hz);
    dst.set(name, a);
  }
}

function show(v: unknown): string {
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}

function checkSamples(): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const s of samples) {
    if (seen.has(s.name)) problems.push(`${s.name}: nombre duplicado`);
    seen.add(s.name);
    if (s.valid.length === 0) problems.push(`${s.name}: no tiene valores valid`);
    if (s.invalid.length === 0) problems.push(`${s.name}: no tiene valores invalid`);
    if (new Set(s.valid).size !== s.valid.length)
      problems.push(`${s.name}: valores valid duplicados`);
    for (const input of s.valid) {
      if (s.run(input) !== true) problems.push(`${s.name}: valid ${show(input)} no devuelve true`);
    }
    for (const input of s.invalid) {
      if (s.run(input) !== false)
        problems.push(`${s.name}: invalid ${show(input)} no devuelve false`);
    }
  }
  return problems;
}

async function main(): Promise<void> {
  const problems = checkSamples();
  if (problems.length > 0) {
    console.error(`Samples incorrectos (${problems.length}) — el benchmark no se ejecuta:`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  console.log(
    `Benchmark: ${samples.length} validadores × 2 rutas (éxito/error), ` +
      `${BENCH_REPEATS} repeticiones × ${BENCH_SAMPLES} muestras (promedio recortado).\n`,
  );

  const okAcc = new Map<string, RepeatMeasurements>();
  const errAcc = new Map<string, RepeatMeasurements>();

  const totalUnits = BENCH_REPEATS * 2 * samples.length;
  let doneUnits = 0;
  const tick = (): void => {
    doneUnits += 1;
    if (SHOW_PROGRESS) renderProgress(doneUnits, totalUnits);
  };

  if (SHOW_PROGRESS) renderProgress(0, totalUnits);

  for (let r = 1; r <= BENCH_REPEATS; r++) {
    accumulate(
      okAcc,
      await runBench((b) => {
        for (const s of samples) {
          let i = 0;
          b.add(s.name, () => s.run(s.valid[i++ % s.valid.length]));
        }
      }, tick),
    );

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

  const prevBaseline = readBaseline();
  const nextBaseline: Baseline = {};

  const rows: Row[] = samples.map((s) => {
    const ok = accOf(okAcc, s.name);
    const err = accOf(errAcc, s.name);
    const okNs = toNs(trimmedMean(ok.ns));
    const okRme = coefficientOfVariationPct(ok.ns);
    const errNs = toNs(trimmedMean(err.ns));
    const errRme = coefficientOfVariationPct(err.ns);
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
