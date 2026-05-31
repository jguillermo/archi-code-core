import 'reflect-metadata';
import { cases } from './cases';
import { makeDecoratedClass, validateDecorator } from './classes';

describe('benchmark cases dataset', () => {
  it('has unique names', () => {
    const names = cases.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every case has at least one input', () => {
    for (const c of cases) {
      expect(c.inputs.length).toBeGreaterThan(0);
    }
  });

  it.each(cases.map((c) => [c.name, c] as const))(
    '%s: our library validates ALL sample inputs as true',
    (_name, c) => {
      for (const input of c.inputs) {
        expect(c.mine(input)).toBe(true);
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
