import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Referencia (tiempo) por validador, para las dos rutas: ✓ éxito y ✗ error.
 * Los tiempos se guardan en NANOSEGUNDOS ENTEROS. La referencia solo se mueve ante un cambio
 * real (ver `nextRef` en run.ts): baja en mejoras reales, se mantiene si no. Se usa para
 * marcar en rojo las regresiones y en verde las mejoras.
 */
export type BaselineEntry = { okNs: number; errNs: number };
export type Baseline = Record<string, BaselineEntry>;

// Nombre distinto de `baseline.*` a propósito: si se llamara baseline.json, el import
// `from './baseline'` en run.ts resolvería el JSON antes que este módulo .ts (Node prueba
// la extensión .json antes que la .ts de ts-node), rompiendo la carga.
const BASELINE_PATH = join(__dirname, 'best-scores.json');

/** Lee la mejor marca guardada. Devuelve {} si el archivo no existe, está corrupto o se pidió reset. */
export function readBaseline(path: string = BASELINE_PATH): Baseline {
  // BENCH_RESET=1 → empezar de cero (ignora el baseline existente).
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

/** Persiste la mejor marca (ordenada por nombre para diffs estables). */
export function writeBaseline(baseline: Baseline, path: string = BASELINE_PATH): void {
  const sorted: Baseline = {};
  for (const name of Object.keys(baseline).sort()) {
    sorted[name] = baseline[name];
  }
  writeFileSync(path, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}

export { BASELINE_PATH };
