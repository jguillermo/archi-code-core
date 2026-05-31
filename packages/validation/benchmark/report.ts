import { writeFileSync } from 'fs';
import { join } from 'path';

export type Row = {
  name: string;
  mineOps: number;
  mineNs: number;
  mineRme: number; // relative margin of error, %
  cvOps: number | null;
  cvNs: number | null;
  ratio: number | null; // mineOps / cvOps; >1 means ours is faster
};

function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

/** Builds a fixed-width text table sorted by our ops/sec, fastest first. */
export function formatTable(rows: Row[]): string {
  const sorted = [...rows].sort((a, b) => b.mineOps - a.mineOps);
  const header = [
    pad('validator', 24),
    pad('ours ops/sec', 16),
    pad('ours ns/op', 12),
    pad('±%', 7),
    pad('cv ops/sec', 16),
    pad('ratio', 8),
  ].join(' ');
  const sep = '-'.repeat(header.length);
  const lines = sorted.map((r) =>
    [
      pad(r.name, 24),
      pad(fmt(r.mineOps), 16),
      pad(fmt(r.mineNs), 12),
      pad(r.mineRme.toFixed(1), 7),
      pad(r.cvOps == null ? '—' : fmt(r.cvOps), 16),
      pad(r.ratio == null ? '—' : `${r.ratio.toFixed(2)}x`, 8),
    ].join(' '),
  );
  return [header, sep, ...lines].join('\n');
}

/** Writes a markdown version of the report next to the benchmark sources. */
export function writeMarkdown(rows: Row[], meta: { node: string; cv: string }): string {
  const sorted = [...rows].sort((a, b) => b.mineOps - a.mineOps);
  const head =
    `# Benchmark results\n\n` +
    `- Node: ${meta.node}\n- class-validator: ${meta.cv}\n\n` +
    `Ratio = ours ops/sec ÷ class-validator ops/sec (decorator mode). >1 means ours is faster.\n\n` +
    `| validator | ours ops/sec | ours ns/op | ±% | cv ops/sec | ratio |\n` +
    `|---|--:|--:|--:|--:|--:|\n`;
  const body = sorted
    .map(
      (r) =>
        `| ${r.name} | ${fmt(r.mineOps)} | ${fmt(r.mineNs)} | ${r.mineRme.toFixed(1)} | ` +
        `${r.cvOps == null ? '—' : fmt(r.cvOps)} | ${r.ratio == null ? '—' : `${r.ratio.toFixed(2)}x`} |`,
    )
    .join('\n');
  const out = head + body + '\n';
  const path = join(__dirname, 'RESULTS.md');
  writeFileSync(path, out, 'utf8');
  return path;
}
