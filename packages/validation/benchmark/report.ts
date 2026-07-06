import { writeFileSync } from 'fs';
import { join } from 'path';

export type Row = {
  name: string;
  okOps: number;
  /** Tiempo de la ruta ✓ en nanosegundos (entero). */
  okNs: number;
  okRme: number;
  errOps: number;
  /** Tiempo de la ruta ✗ en nanosegundos (entero). */
  errNs: number;
  errRme: number;
  /** Referencia (ns entero) de la ruta ✓ ANTES de esta corrida; undefined si es la primera vez. */
  bestOkNs?: number;
  /** Referencia (ns entero) de la ruta ✗ ANTES de esta corrida; undefined si es la primera vez. */
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

export type CompareStatus = 'first' | 'improved' | 'regression' | 'neutral';

/**
 * Compara el tiempo actual contra la referencia guardada, de forma SIMÉTRICA y consciente
 * del ruido: un cambio solo cuenta (verde/rojo) si supera la "banda" = max(tolerancia fija,
 * margen de error de la medición). Dentro de la banda = ruido → gris. Esto evita el churn de
 * colores al correr dos veces el mismo código.
 * - 'first'      → no hay referencia previa (primera vez). Gris.
 * - 'improved'   → más rápido que la referencia por más que el ruido. Verde.
 * - 'regression' → más lento que la referencia por más que el ruido. Rojo.
 * - 'neutral'    → dentro del ruido/tolerancia (sin cambio real). Gris.
 */
export function compareNs(
  now: number,
  best: number | undefined,
  tolerance: number,
  rme = 0,
): CompareStatus {
  if (best === undefined || !Number.isFinite(best) || best <= 0) return 'first';
  const deltaPct = ((now - best) / best) * 100;
  const band = Math.max(tolerance * 100, rme);
  if (deltaPct < -band) return 'improved';
  if (deltaPct > band) return 'regression';
  return 'neutral';
}

function fmtNs(ns: number): string {
  return Math.round(ns).toString();
}

/** Δ% del actual respecto a la referencia (negativo = mejora). 'base' si no hay marca previa. */
function fmtDelta(now: number, best: number | undefined): string {
  if (best === undefined || !Number.isFinite(best) || best <= 0) return 'base';
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
  const code = status === 'regression' ? ANSI.red : status === 'improved' ? ANSI.green : ANSI.dim;
  return code + padded + ANSI.reset;
}

/** Explicación en español que se imprime ARRIBA de la tabla. */
const HEADER_ES = [
  'Tiempo por llamada en nanosegundos (ns) — menos ns = más rápido.',
  '  éxito = tiempo validando un input VÁLIDO   ·   error = tiempo validando un input INVÁLIDO',
  '  Δ = cambio vs tu referencia:  rojo = más lento  ·  verde = más rápido  ·  gris = sin cambio real (ruido)',
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

/** Emoji de estado para la salida markdown (no soporta ANSI). */
function emoji(status: CompareStatus): string {
  return status === 'regression' ? '🔴' : status === 'improved' ? '🟢' : '⚪';
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
