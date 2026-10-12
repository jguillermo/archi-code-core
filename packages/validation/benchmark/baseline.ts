import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface BaselineEntry {
  okNs: number;
  errNs: number;
}
export type Baseline = Record<string, BaselineEntry>;

// Not baseline.json: run.ts's './baseline' import would resolve to that JSON before this module.
const BASELINE_PATH = join(__dirname, 'best-scores.json');

export function readBaseline(path: string = BASELINE_PATH): Baseline {
  if (process.env['BENCH_RESET']) return {};
  if (!existsSync(path)) return {};
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Baseline) : {};
  } catch {
    return {};
  }
}

export function writeBaseline(baseline: Baseline, path: string = BASELINE_PATH): void {
  const sortedForStableDiffs: Baseline = {};
  for (const name of Object.keys(baseline).sort()) {
    sortedForStableDiffs[name] = baseline[name];
  }
  writeFileSync(path, JSON.stringify(sortedForStableDiffs, null, 2) + '\n', 'utf8');
}

export { BASELINE_PATH };
