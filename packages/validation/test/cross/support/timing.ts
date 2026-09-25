/**
 * Machine-independent complexity checks. Absolute budgets ("≤ 150 ms") fail on slow or busy CI
 * runners; instead the input size is quadrupled and the GROWTH of the time is checked:
 *   - linear      → ~4×   (passes)
 *   - quadratic   → ~16×  (fails)
 *   - catastrophic backtracking → orders of magnitude (fails)
 * Each size is timed RUNS times, INTERLEAVED (small, large, small, …) so CPU contention hits both
 * sizes alike, and the best time of each is kept, so a GC pause or scheduler hiccup does not count.
 * A call that stays under FLOOR_MS even at the large size passes outright: under heavy load a
 * millisecond-long call can be inflated ×10+, while anything quadratic on these sizes takes far
 * longer (the former quadratic rtrim needed 720 ms at 40k characters).
 */
const RUNS = 5;
const FLOOR_MS = 100;
const MAX_RATIO = 8;
const SCALE = 4;

export interface Growth {
  smallMs: number;
  largeMs: number;
  ratio: number;
}

function time(fn: () => void): number {
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
}

/** Times `run(n)` and `run(4n)`, interleaved, keeping the best of RUNS for each. */
export function measureGrowth(run: (n: number) => void, n: number): Growth {
  let smallMs = Infinity;
  let largeMs = Infinity;
  for (let i = 0; i < RUNS; i++) {
    smallMs = Math.min(
      smallMs,
      time(() => run(n)),
    );
    largeMs = Math.min(
      largeMs,
      time(() => run(n * SCALE)),
    );
  }
  return { smallMs, largeMs, ratio: largeMs / Math.max(smallMs, 0.01) };
}

export function isLinear(g: Growth): boolean {
  return g.largeMs < FLOOR_MS || g.ratio < MAX_RATIO;
}

export function describeGrowth(g: Growth): string {
  return `${g.smallMs.toFixed(1)} ms → ${g.largeMs.toFixed(1)} ms (×${g.ratio.toFixed(1)} for ×${SCALE} input)`;
}
