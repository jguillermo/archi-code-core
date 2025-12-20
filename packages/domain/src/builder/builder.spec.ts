import { describe, expect, it } from '@jest/globals';
import { Builder } from './builder';

class TestClass {
  public propertyA?: string;
  public propertyB?: number;
  public propertyC?: boolean;
}

class ComplexClass {
  data?: { key: string; value: number };
  items?: string[];
}

class CustomConstructorClass {
  public initialized: boolean;

  constructor() {
    this.initialized = true;
  }
}

class EmptyClass {}

class ReadonlyClass {
  readonly propertyA = 'immutable';
}

describe('Builder', () => {
  it('should create an instance of the class with default values', () => {
    const defaults = { propertyA: 'defaultA', propertyB: 123 };
    const instance = Builder(TestClass, defaults).build();

    expect(instance).toBeInstanceOf(TestClass);
    expect(instance.propertyA).toBe('defaultA');
    expect(instance.propertyB).toBe(123);
    expect(instance.propertyC).toBeUndefined(); // Unset properties should remain undefined
  });

  it('should allow overriding default values with setter methods', () => {
    const defaults = { propertyA: 'defaultA' };
    const instance = Builder(TestClass, defaults).propertyA('newA').propertyB(456).build();

    expect(instance.propertyA).toBe('newA'); // Overrides the default value
    expect(instance.propertyB).toBe(456); // New value set
    expect(instance.propertyC).toBeUndefined(); // Unset properties remain undefined
  });

  it('should apply override values during build', () => {
    const defaults = { propertyA: 'defaultA', propertyB: 123 };
    const overrides = { propertyA: 'overriddenA', propertyC: true };
    const instance = Builder(TestClass, defaults, overrides).build();

    expect(instance.propertyA).toBe('overriddenA'); // Overridden value
    expect(instance.propertyB).toBe(123); // Default value preserved
    expect(instance.propertyC).toBe(true); // New override value
  });

  it('should handle setting values dynamically', () => {
    const instance = Builder(TestClass).propertyA('dynamicA').propertyB(789).propertyC(false).build();

    expect(instance.propertyA).toBe('dynamicA');
    expect(instance.propertyB).toBe(789);
    expect(instance.propertyC).toBe(false);
  });

  it('should handle empty defaults and overrides', () => {
    const instance = Builder(TestClass).build();

    expect(instance).toBeInstanceOf(TestClass);
    expect(instance.propertyA).toBeUndefined();
    expect(instance.propertyB).toBeUndefined();
    expect(instance.propertyC).toBeUndefined();
  });

  it('should allow dynamic overriding of previously set values', () => {
    const builder = Builder(TestClass).propertyA('initialA').propertyB(123);

    builder.propertyA('overriddenA');

    const instance = builder.build();
    expect(instance.propertyA).toBe('overriddenA'); // Valor sobrescrito
    expect(instance.propertyB).toBe(123); // Valor original
  });

  it('should not modify the overrides object', () => {
    const overrides = { propertyA: 'overriddenA' };
    const builder = Builder(TestClass, undefined, overrides);

    builder.propertyA('newA'); // Intenta sobrescribir dinámicamente
    const instance = builder.build();

    expect(overrides.propertyA).toBe('overriddenA'); // Overrides permanece igual
    expect(instance.propertyA).toBe('overriddenA'); // Prioridad del override
  });

  it('should allow creating multiple instances with different configurations', () => {
    const builder = Builder(TestClass).propertyA('commonA').propertyB(100);

    const instance1 = builder.propertyC(true).build();
    const instance2 = builder.propertyC(false).build();

    expect(instance1.propertyA).toBe('commonA');
    expect(instance1.propertyB).toBe(100);
    expect(instance1.propertyC).toBe(true);

    expect(instance2.propertyA).toBe('commonA');
    expect(instance2.propertyB).toBe(100);
    expect(instance2.propertyC).toBe(false);
  });

  it('should handle properties with complex values', () => {
    const instance = Builder(ComplexClass).data({ key: 'test', value: 42 }).items(['item1', 'item2']).build();

    expect(instance.data).toEqual({ key: 'test', value: 42 });
    expect(instance.items).toEqual(['item1', 'item2']);
  });

  it('should correctly handle falsy values', () => {
    const instance = Builder(TestClass).propertyA('').propertyB(0).propertyC(false).build();

    expect(instance.propertyA).toBe(''); // Falsy string
    expect(instance.propertyB).toBe(0); // Falsy number
    expect(instance.propertyC).toBe(false); // Falsy boolean
  });
  it('should not affect the builder after modifying the built object', () => {
    const builder = Builder(TestClass).propertyA('valueA').propertyB(123);
    const instance = builder.build();

    instance.propertyA = 'modifiedA';
    const newInstance = builder.build();

    expect(instance.propertyA).toBe('modifiedA'); // Modificación en la instancia
    expect(newInstance.propertyA).toBe('valueA'); // Nueva construcción no afectada
    expect(newInstance.propertyB).toBe(123); // Valores originales intactos
  });

  it('should keep builders independent of each other', () => {
    const builder1 = Builder(TestClass).propertyA('builder1A');
    const builder2 = Builder(TestClass).propertyA('builder2A');

    const instance1 = builder1.build();
    const instance2 = builder2.build();

    expect(instance1.propertyA).toBe('builder1A');
    expect(instance2.propertyA).toBe('builder2A');
  });

  it('should work with classes that have custom constructors', () => {
    const instance = Builder(CustomConstructorClass).build();

    expect(instance).toBeInstanceOf(CustomConstructorClass);
    expect(instance.initialized).toBe(true);
  });

  it('should only override specified properties in overrides', () => {
    const defaults = { propertyA: 'defaultA', propertyB: 123, propertyC: true };
    const overrides = { propertyB: 456 }; // Solo modifica propertyB
    const instance = Builder(TestClass, defaults, overrides).build();

    expect(instance.propertyA).toBe('defaultA'); // No afectado
    expect(instance.propertyB).toBe(456); // Sobrescrito
    expect(instance.propertyC).toBe(true); // No afectado
  });

  it('should respect the last value set for a property', () => {
    const instance = Builder(TestClass).propertyA('value1').propertyA('value2').build();

    expect(instance.propertyA).toBe('value2'); // Último valor sobrescribe los anteriores
  });

  it('should work with classes that have no properties', () => {
    const instance = Builder(EmptyClass).build();

    expect(instance).toBeInstanceOf(EmptyClass);
  });

  it('should produce a valid instance even if no properties are set', () => {
    const instance = Builder(TestClass).build();

    expect(instance).toBeInstanceOf(TestClass);
    expect(instance.propertyA).toBeUndefined();
    expect(instance.propertyB).toBeUndefined();
    expect(instance.propertyC).toBeUndefined();
  });

  it('should handle undefined and null values correctly', () => {
    const instance = Builder(TestClass)
      .propertyA(undefined)
      .propertyB(null as any)
      .build();

    expect(instance.propertyA).toBeUndefined(); // undefined se mantiene
    expect(instance.propertyB).toBeNull(); // null se mantiene
  });

  it('should throw an error if cls is not a valid class', () => {
    expect(() => Builder(undefined as any)).toThrow(); // Falla porque no es una clase válida
  });

  it('should initialize readonly property with the correct value', () => {
    const instance = Builder(ReadonlyClass).build();

    // Asegura que el valor inicial sea correcto
    expect(instance.propertyA).toBe('immutable');
  });
  it('should allow modifying readonly properties after build (JavaScript ignores readonly)', () => {
    const instance = Builder(ReadonlyClass).build();

    // Intentar sobrescribir en runtime no debería afectar el valor readonly
    (instance as any).propertyA = 'newValue';

    // Asegúrate de que el valor no cambia
    expect(instance.propertyA).toBe('newValue');
  });
});
