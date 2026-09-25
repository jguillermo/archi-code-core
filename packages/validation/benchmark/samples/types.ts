/**
 * Success/error samples colocados por validador.
 *
 * Cada validador aporta sus propios valores a testear (`valid` / `invalid`) junto con la
 * forma exacta de invocarlo (`run`, que embebe los args extra que necesite ese validador).
 * Los consume el benchmark (`benchmark/run.ts`), que primero verifica valid→true /
 * invalid→false (si falla, no mide) y luego produce dos métricas por validador: ✓ y ✗.
 */
export interface ValidatorSample {
  /** Nombre del validador (clave única, igual al export en src/validators). */
  name: string;
  /** Invocación del validador con sus args. `run(v)` debe ser true para `valid`, false para `invalid`. */
  run: (input: unknown) => boolean;
  /** Valores válidos — rotados en cada llamada del benchmark. Debe haber ≥2 distintos. */
  valid: unknown[];
  /** Valores inválidos — rotados en cada llamada del benchmark. Debe haber ≥1. */
  invalid: unknown[];
}
