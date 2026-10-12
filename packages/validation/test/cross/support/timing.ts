// Growth, not absolute time: fixed budgets fail on busy CI; interleaved best-of-RUNS absorbs GC.
const RUNS = 5;
const FAST_ENOUGH_MS = 100;
const MAX_LINEAR_RATIO = 8;
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
  return g.largeMs < FAST_ENOUGH_MS || g.ratio < MAX_LINEAR_RATIO;
}

export function describeGrowth(g: Growth): string {
  return `${g.smallMs.toFixed(1)} ms → ${g.largeMs.toFixed(1)} ms (×${g.ratio.toFixed(1)} for ×${SCALE} input)`;
}
