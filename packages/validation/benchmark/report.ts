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
  /** Mejor marca histórica (ms) de la ruta ✓ ANTES de esta corrida; undefined si es la primera vez. */
  bestOkNs?: number;
  /** Mejor marca histórica (ms) de la ruta ✗ ANTES de esta corrida; undefined si es la primera vez. */
  bestErrNs?: number;
};

/** Tolerancia por defecto: solo se marca rojo si el actual supera al mejor por más de este %. */
export const DEFAULT_TOLERANCE = parseFloat(process.env['BENCH_TOLERANCE'] ?? '0.10');

// ── Colores ANSI ────────────────────────────────────────────────────────────
const ANSI = { red: '\x1b[31m', green: '\x1b[32m', dim: '\x1b[2m', reset: '\x1b[0m' };

/** ¿Se debe colorear? Desactivado con NO_COLOR o cuando la salida no es una TTY. */
export function colorEnabled(): boolean {
  return !process.env['NO_COLOR'] && Boolean(process.stdout.isTTY);
}

export type CompareStatus = 'new' | 'regression' | 'neutral';

/**
 * Compara el tiempo actual contra la mejor marca histórica.
 * - 'new'        → sin marca previa o el actual es un nuevo récord (≤ mejor). Se pinta verde.
 * - 'regression' → el actual supera al mejor por más de `tolerance`. Se pinta rojo.
 * - 'neutral'    → peor que el mejor pero dentro de la tolerancia (ruido). Se atenúa.
 */
export function compareNs(now: number, best: number | undefined, tolerance: number): CompareStatus {
  if (best === undefined || !Number.isFinite(best) || best <= 0) return 'new';
  if (now <= best) return 'new';
  if (now > best * (1 + tolerance)) return 'regression';
  return 'neutral';
}

function fmtNs(ms: number): string {
  return Math.round(ms * 1_000_000).toString();
}

/** Δ% del actual respecto al mejor (negativo = mejora). '—' si no hay marca previa. */
function fmtDelta(now: number, best: number | undefined): string {
  if (best === undefined || !Number.isFinite(best) || best <= 0) return 'new';
  const pct = ((now - best) / best) * 100;
  const rounded = Math.round(pct);
  return `${rounded >= 0 ? '+' : ''}${rounded}%`;
}

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

/** Aplica color DESPUÉS del pad (los códigos ANSI no cuentan como ancho visible). */
function paint(padded: string, status: CompareStatus, color: boolean): string {
  if (!color) return padded;
  const code = status === 'regression' ? ANSI.red : status === 'new' ? ANSI.green : ANSI.dim;
  return code + padded + ANSI.reset;
}

/** Explicación en español que se imprime ARRIBA de la tabla. */
const HEADER_ES = [
  'Tiempo por llamada en nanosegundos (ns) — menos ns = más rápido.',
  '  éxito = tiempo validando un input VÁLIDO   ·   error = tiempo validando un input INVÁLIDO',
  '  Δ = cuánto cambió vs tu mejor marca:  rojo = más lento (peor)  ·  verde = mejor / nuevo récord  ·  gris = igual',
].join('\n');

/** Builds a fixed-width text table sorted slowest (success) first, fastest last. */
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
    const okStatus = compareNs(r.okNs, r.bestOkNs, tol);
    const errStatus = compareNs(r.errNs, r.bestErrNs, tol);
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

/** Emoji de estado para la salida markdown (no soporta ANSI). */
function emoji(status: CompareStatus): string {
  return status === 'regression' ? '🔴' : status === 'new' ? '🟢' : '⚪';
}

/** Writes a markdown version of the report next to the benchmark sources. */
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
      const okStatus = compareNs(r.okNs, r.bestOkNs, tolerance);
      const errStatus = compareNs(r.errNs, r.bestErrNs, tolerance);
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
