import { writeFileSync } from 'fs';
import { join } from 'path';

export type Row = {
  name: string;
  okOps: number;
  okNs: number;
  okRme: number;
  errOps: number;
  errNs: number;
  errRme: number;
  okCvOps?: number;
  errCvOps?: number;
};

function fmtOps(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

function fmtNs(ms: number): string {
  return Math.round(ms * 1_000_000).toLocaleString('en-US');
}

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

const LEGEND =
  '✓ = input válido (debe retornar true)  |  ✗ = input inválido (debe retornar false)  |  ±% = margen de error estadístico';

/** Builds a fixed-width text table sorted slowest (success) first, fastest last. */
export function formatTable(rows: Row[]): string {
  const sorted = [...rows].sort((a, b) => a.okOps - b.okOps);
  const header = [
    pad('validator', 26),
    pad('✓ ops/seg', 16),
    pad('✓ ns', 10),
    pad('✓±%', 6),
    pad('✓ ratio', 8),
    pad('✗ ops/seg', 16),
    pad('✗ ns', 10),
    pad('✗±%', 6),
    pad('✗ ratio', 8),
  ].join(' ');
  const sep = '-'.repeat(header.length);
  const lines = sorted.map((r) =>
    [
      pad(r.name, 26),
      pad(fmtOps(r.okOps), 16),
      pad(fmtNs(r.okNs), 10),
      pad(r.okRme.toFixed(1), 6),
      pad(r.okCvOps ? (r.okOps / r.okCvOps).toFixed(2) + '×' : '—', 8),
      pad(fmtOps(r.errOps), 16),
      pad(fmtNs(r.errNs), 10),
      pad(r.errRme.toFixed(1), 6),
      pad(r.errCvOps ? (r.errOps / r.errCvOps).toFixed(2) + '×' : '—', 8),
    ].join(' '),
  );
  return [header, sep, ...lines, '', LEGEND].join('\n');
}

/** Writes a markdown version of the report next to the benchmark sources. */
export function writeMarkdown(rows: Row[], meta: { node: string }): string {
  const sorted = [...rows].sort((a, b) => a.okOps - b.okOps);
  const head =
    `# Benchmark results\n\n` +
    `- Node: ${meta.node}\n\n` +
    `Ordenado de más lento a más rápido (por éxito).\n\n` +
    `> **✓** = input válido · **✗** = input inválido · **±%** = margen de error estadístico · **ratio** = speedup vs class-validator\n\n` +
    `| validator | ✓ ops/seg | ✓ ns | ✓±% | ✓ ratio | ✗ ops/seg | ✗ ns | ✗±% | ✗ ratio |\n` +
    `|---|--:|--:|--:|--:|--:|--:|--:|--:|\n`;
  const body = sorted
    .map(
      (r) =>
        `| ${r.name} | ${fmtOps(r.okOps)} | ${fmtNs(r.okNs)} | ${r.okRme.toFixed(1)} | ` +
        `${r.okCvOps ? (r.okOps / r.okCvOps).toFixed(2) + '×' : '—'} | ` +
        `${fmtOps(r.errOps)} | ${fmtNs(r.errNs)} | ${r.errRme.toFixed(1)} | ` +
        `${r.errCvOps ? (r.errOps / r.errCvOps).toFixed(2) + '×' : '—'} |`,
    )
    .join('\n');
  const out = head + body + '\n';
  const path = join(__dirname, 'RESULTS.md');
  writeFileSync(path, out, 'utf8');
  return path;
}
