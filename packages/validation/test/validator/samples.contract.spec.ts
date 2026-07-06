import { samples } from './samples';

/**
 * Contrato de los samples colocados por validador.
 *
 * Garantiza que los valores que consume el benchmark son correctos: cada `valid` realmente
 * valida (true) y cada `invalid` realmente falla (false). Reemplaza a los invariantes que
 * antes vivían en benchmark/cases.spec.ts, ahora sobre la fuente única `samples`.
 */
describe('validator samples dataset', () => {
  it('has unique names', () => {
    const names = samples.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every sample has at least one valid and one invalid input', () => {
    for (const s of samples) {
      expect(s.valid.length).toBeGreaterThan(0);
      expect(s.invalid.length).toBeGreaterThan(0);
    }
  });

  // Los valores válidos deben ser distintos entre sí (la rotación del benchmark cubre inputs
  // diferentes para dificultar el cacheo del JIT). Algunos validadores como isEmpty tienen un
  // único valor válido posible ('') — se acepta, pero nunca duplicados.
  it('valid inputs are distinct (no duplicates)', () => {
    for (const s of samples) {
      const unique = new Set(s.valid);
      expect(unique.size).toBe(s.valid.length);
    }
  });

  it.each(samples.map((s) => [s.name, s] as const))(
    '%s: run() returns TRUE for all valid inputs',
    (_name, s) => {
      for (const input of s.valid) {
        expect(s.run(input)).toBe(true);
      }
    },
  );

  it.each(samples.map((s) => [s.name, s] as const))(
    '%s: run() returns FALSE for all invalid inputs',
    (_name, s) => {
      for (const input of s.invalid) {
        expect(s.run(input)).toBe(false);
      }
    },
  );
});
