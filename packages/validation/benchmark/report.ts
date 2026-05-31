import { writeFileSync } from 'fs';
import { join } from 'path';

export type Row = {
  name: string;
  ops: number;
  msPerCall: number; // milliseconds per call
  rme: number;       // relative margin of error, %
};

function fmtOps(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** Converts ms to ns and formats as an integer. */
function fmtNs(ms: number): string {
  return Math.round(ms * 1_000_000).toLocaleString('en-US');
}

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

const LEGEND = '±% = margen de error estadístico de la medición (cuanto menor, más estable el resultado)';

/** Builds a fixed-width text table sorted slowest first, fastest last. */
export function formatTable(rows: Row[]): string {
  const sorted = [...rows].sort((a, b) => a.ops - b.ops);
  const header = [
    pad('validator', 26),
    pad('ops/seg', 16),
    pad('ns/llamada', 12),
    pad('±%', 6),
  ].join(' ');
  const sep = '-'.repeat(header.length);
  const lines = sorted.map((r) =>
    [
      pad(r.name, 26),
      pad(fmtOps(r.ops), 16),
      pad(fmtNs(r.msPerCall), 12),
      pad(r.rme.toFixed(1), 6),
    ].join(' '),
  );
  return [header, sep, ...lines, '', LEGEND].join('\n');
}

/** Writes a markdown version of the report next to the benchmark sources. */
export function writeMarkdown(rows: Row[], meta: { node: string }): string {
  const sorted = [...rows].sort((a, b) => a.ops - b.ops);
  const head =
    `# Benchmark results\n\n` +
    `- Node: ${meta.node}\n\n` +
    `Ordenado de más lento a más rápido.\n\n` +
    `> **±%** = margen de error estadístico de la medición. Cuanto menor, más estable el resultado.\n\n` +
    `| validator | ops/seg | ns/llamada | ±% |\n` +
    `|---|--:|--:|--:|\n`;
  const body = sorted
    .map((r) => `| ${r.name} | ${fmtOps(r.ops)} | ${fmtNs(r.msPerCall)} | ${r.rme.toFixed(1)} |`)
    .join('\n');
  const out = head + body + '\n';
  const path = join(__dirname, 'RESULTS.md');
  writeFileSync(path, out, 'utf8');
  return path;
}
