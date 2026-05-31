import 'reflect-metadata';
import { IsEmail } from 'class-validator';
import { makeDecoratedClass, validateDecorator } from './classes';

describe('classes helper', () => {
  it('builds a class from a decorator factory that validates a good value', () => {
    const Klass = makeDecoratedClass(() => IsEmail());
    expect(validateDecorator(Klass, 'foo@bar.com')).toBe(true);
  });

  it('reports invalid values as not passing', () => {
    const Klass = makeDecoratedClass(() => IsEmail());
    expect(validateDecorator(Klass, 'not-an-email')).toBe(false);
  });
});
