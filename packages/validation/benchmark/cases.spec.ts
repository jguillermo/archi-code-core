import 'reflect-metadata';
import { cases } from './cases';
import { makeDecoratedClass, validateDecorator } from './classes';

describe('benchmark cases dataset', () => {
  it('has unique names', () => {
    const names = cases.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every case has at least one valid and one invalid input', () => {
    for (const c of cases) {
      expect(c.inputs.length).toBeGreaterThan(0);
      expect(c.errorInputs.length).toBeGreaterThan(0);
    }
  });

  it('each case has at least 2 distinct valid inputs', () => {
    for (const c of cases) {
      const unique = new Set(c.inputs);
      expect(unique.size).toBeGreaterThanOrEqual(2);
    }
  });

  it.each(cases.map((c) => [c.name, c] as const))(
    '%s: mine() returns TRUE for all valid inputs',
    (_name, c) => {
      for (const input of c.inputs) {
        expect(c.mine(input)).toBe(true);
      }
    },
  );

  it.each(cases.map((c) => [c.name, c] as const))(
    '%s: mine() returns FALSE for all error inputs',
    (_name, c) => {
      for (const input of c.errorInputs) {
        expect(c.mine(input)).toBe(false);
      }
    },
  );

  it.each(cases.filter((c) => c.cvFn).map((c) => [c.name, c] as const))(
    '%s: class-validator standalone fn validates its sample input as true',
    (_name, c) => {
      const cvInput = 'cvInput' in c ? c.cvInput : c.inputs[0];
      expect(c.cvFn!(cvInput)).toBe(true);
    },
  );

  it.each(cases.filter((c) => c.cvDecorator).map((c) => [c.name, c] as const))(
    '%s: class-validator decorator validates its sample input as true',
    (_name, c) => {
      const cvInput = 'cvInput' in c ? c.cvInput : c.inputs[0];
      const Klass = makeDecoratedClass(c.cvDecorator!);
      expect(validateDecorator(Klass, cvInput)).toBe(true);
    },
  );
});
