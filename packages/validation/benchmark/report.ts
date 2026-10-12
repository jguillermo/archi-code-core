import { writeFileSync } from 'fs';
import { join } from 'path';

export interface Row {
  name: string;
  okOps: number;
  okNs: number;
  okRme: number;
  errOps: number;
  errNs: number;
  errRme: number;
  bestOkNs?: number;
  bestErrNs?: number;
}

export const DEFAULT_TOLERANCE = parseFloat(process.env['BENCH_TOLERANCE'] ?? '0.10');

const ANSI = { red: '\x1b[31m', green: '\x1b[32m', dim: '\x1b[2m', reset: '\x1b[0m' };

export function colorEnabled(): boolean {
  return !process.env['NO_COLOR'] && Boolean(process.stdout.isTTY);
}

export type CompareStatus = 'first' | 'improved' | 'regression' | 'neutral';

export function compareNs(
  now: number,
  best: number | undefined,
  tolerance: number,
  rme = 0,
): CompareStatus {
  if (best === undefined || !Number.isFinite(best) || best <= 0) return 'first';
  const deltaPct = ((now - best) / best) * 100;
  const noiseBandPct = Math.max(tolerance * 100, rme);
  if (deltaPct < -noiseBandPct) return 'improved';
  if (deltaPct > noiseBandPct) return 'regression';
  return 'neutral';
}

function fmtNs(ns: number): string {
  return Math.round(ns).toString();
}

function fmtDelta(now: number, best: number | undefined): string {
  if (best === undefined || !Number.isFinite(best) || best <= 0) return 'base';
  const pct = ((now - best) / best) * 100;
  const rounded = Math.round(pct);
  return `${rounded >= 0 ? '+' : ''}${rounded}%`;
}

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

function paint(padded: string, status: CompareStatus, color: boolean): string {
  if (!color) return padded;
  const code = status === 'regression' ? ANSI.red : status === 'improved' ? ANSI.green : ANSI.dim;
  return code + padded + ANSI.reset;
}

const HEADER_ES = [
  'Tiempo por llamada en nanosegundos (ns) — menos ns = más rápido.',
  '  éxito = tiempo validando un input VÁLIDO   ·   error = tiempo validando un input INVÁLIDO',
  '  Δ = cambio vs tu referencia:  rojo = más lento  ·  verde = más rápido  ·  gris = sin cambio real (ruido)',
].join('\n');

export function formatTable(rows: Row[], opts?: { color?: boolean; tolerance?: number }): string {
  const color = opts?.color ?? colorEnabled();
  const tol = opts?.tolerance ?? DEFAULT_TOLERANCE;
  const sorted = [...rows].sort((a, b) => a.okOps - b.okOps);
  const W = { name: 24, ns: 12, delta: 10 };
  const header = [
    pad('validador', W.name),
    pad('éxito (ns)', W.ns),
    pad('éxito Δ', W.delta),
    pad('error (ns)', W.ns),
    pad('error Δ', W.delta),
  ].join(' ');
  const sep = '-'.repeat(header.length);

  const lines = sorted.map((r) => {
    const okStatus = compareNs(r.okNs, r.bestOkNs, tol, r.okRme);
    const errStatus = compareNs(r.errNs, r.bestErrNs, tol, r.errRme);
    return [
      pad(r.name, W.name),
      paint(pad(fmtNs(r.okNs), W.ns), okStatus, color),
      paint(pad(fmtDelta(r.okNs, r.bestOkNs), W.delta), okStatus, color),
      paint(pad(fmtNs(r.errNs), W.ns), errStatus, color),
      paint(pad(fmtDelta(r.errNs, r.bestErrNs), W.delta), errStatus, color),
    ].join(' ');
  });
  return [HEADER_ES, '', header, sep, ...lines].join('\n');
}

function emoji(status: CompareStatus): string {
  return status === 'regression' ? '🔴' : status === 'improved' ? '🟢' : '⚪';
}

export function writeMarkdown(
  rows: Row[],
  meta: { node: string },
  opts: { tolerance?: number; path?: string } = {},
): string {
  const tolerance = opts.tolerance ?? DEFAULT_TOLERANCE;
  const sorted = [...rows].sort((a, b) => a.okOps - b.okOps);
  const head =
    `# Resultados del benchmark\n\n` +
    `- Node: ${meta.node}\n\n` +
    `Tiempo por llamada en nanosegundos (ns) — **menos ns = más rápido**. Ordenado de más lento a más rápido (por éxito).\n\n` +
    `> **éxito** = tiempo validando un input válido · **error** = tiempo validando un input inválido · ` +
    `**Δ** = cuánto cambió vs tu mejor marca (🔴 más lento · 🟢 mejor/récord · ⚪ igual)\n\n` +
    `| validador | éxito (ns) | éxito Δ | error (ns) | error Δ |\n` +
    `|---|--:|:--|--:|:--|\n`;
  const body = sorted
    .map((r) => {
      const okStatus = compareNs(r.okNs, r.bestOkNs, tolerance, r.okRme);
      const errStatus = compareNs(r.errNs, r.bestErrNs, tolerance, r.errRme);
      return (
        `| ${r.name} | ${fmtNs(r.okNs)} | ${emoji(okStatus)} ${fmtDelta(r.okNs, r.bestOkNs)} | ` +
        `${fmtNs(r.errNs)} | ${emoji(errStatus)} ${fmtDelta(r.errNs, r.bestErrNs)} |`
      );
    })
    .join('\n');
  const out = head + body + '\n';
  const path = opts.path ?? join(__dirname, 'RESULTS.md');
  writeFileSync(path, out, 'utf8');
  return path;
}
