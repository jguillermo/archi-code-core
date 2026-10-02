import { describe, expect, it, jest } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { Validations } from '@archi-code/validation';
import type { ValidationResult } from '@archi-code/validation';
import { JsonType } from './json-type';
import type { JsonTypeValue } from './json-type';
import { AbstractType, Required } from './abstract-type';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';
import { RequiredValueException } from '../exceptions/domain/required-value.exception';

interface Settings {
  theme: string;
  size?: number;
}

class SettingsType extends JsonType<Settings> {}
class RequiredSettings extends Required(SettingsType) {}

const convertibleInputs: [unknown, Settings][] = [
  [{ theme: 'dark' }, { theme: 'dark' }],
  [
    { theme: 'dark', size: 2 },
    { theme: 'dark', size: 2 },
  ],
  ['{"theme":"dark"}', { theme: 'dark' }],
  [' {"theme":"dark","size":2} ', { theme: 'dark', size: 2 }],
];

const emptyInputs: [string, unknown][] = [
  ['null', null],
  ['undefined', undefined],
  ['an empty string', ''],
  ['only spaces', '   '],
];

const notConvertibleInputs: [unknown, string][] = [
  [{}, '{}'],
  ['{}', '"{}"'],
  [[{ theme: 'dark' }], '[{"theme":"dark"}]'],
  ['[1]', '"[1]"'],
  ['not json', '"not json"'],
  ['1', '"1"'],
  [1, '1'],
  [true, 'true'],
  [new Date('2020-01-01T00:00:00.000Z'), 'Date(2020-01-01T00:00:00.000Z)'],
];

function primitiveError(received: string): string {
  return `Validation Error: Expected a valid Json, but received ${received}.`;
}

function requiredError(received: string): string {
  return `Validation Error: RequiredSettings is required, but received ${received}.`;
}

function darkSettings() {
  const isDark = jest.fn((value: unknown) => (value as Settings).theme === 'dark');

  @Validations([{ custom: 'isDark', fn: isDark }])
  class OptionalDark extends SettingsType {}

  @Validations([{ custom: 'isDark', fn: isDark }])
  class RequiredDark extends Required(SettingsType) {}

  return { OptionalDark, RequiredDark, isDark };
}

const isDarkError = { custom: 'isDark', message: 'Value does not satisfy isDark' };

describe('JsonType (optional)', () => {
  describe('typing', () => {
    it('is an AbstractType of its object that takes it, null or nothing and holds it or null', () => {
      expectTypeOf<SettingsType>().toMatchTypeOf<AbstractType<Settings>>();
      expectTypeOf<ConstructorParameters<typeof SettingsType>>().toEqualTypeOf<
        [value?: Settings | null]
      >();
      expectTypeOf<SettingsType['value']>().toEqualTypeOf<Settings | null>();
      expectTypeOf<SettingsType['validate']>().toEqualTypeOf<
        () => ValidationResult<Settings | null>
      >();
    });

    it('defaults to a plain JSON object', () => {
      expectTypeOf<JsonType['value']>().toEqualTypeOf<JsonTypeValue | null>();
    });

    it('its value cannot be used as a plain object', () => {
      // @ts-expect-error an optional value may be null
      const settings: Settings = new SettingsType({ theme: 'dark' }).value;
      expect(settings).toEqual({ theme: 'dark' });
    });
  });

  describe('conversion', () => {
    it.each(convertibleInputs)('%p → %p', (input, expected) => {
      expect(new SettingsType(input as Settings).value).toEqual(expected);
    });

    it('keeps the given object by reference', () => {
      const settings = { theme: 'dark' };
      expect(new SettingsType(settings).value).toBe(settings);
    });

    it.each(emptyInputs)('%s → null', (_, input) => {
      expect(new SettingsType(input as Settings).value).toBeNull();
    });

    it('no value → null', () => {
      expect(new SettingsType().value).toBeNull();
    });

    it.each(notConvertibleInputs)('%p throws TypePrimitiveException', (input, received) => {
      const create = () => new SettingsType(input as Settings);
      expect(create).toThrow(TypePrimitiveException);
      expect(create).toThrow(primitiveError(received));
    });
  });

  describe('validate', () => {
    it.each(convertibleInputs)('%p is valid as %p', (input, expected) => {
      expect(new SettingsType(input as Settings).validate()).toEqual({
        ok: true,
        value: expected,
        errors: [],
      });
    });

    it.each(emptyInputs)('%s is valid as null', (_, input) => {
      expect(new SettingsType(input as Settings).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
    });

    it('runs its validations on a value', () => {
      const { OptionalDark } = darkSettings();
      expect(new OptionalDark({ theme: 'dark' }).validate().ok).toBe(true);
      expect(new OptionalDark({ theme: 'light' }).validate().errors).toEqual([isDarkError]);
    });

    it.each(emptyInputs)('%s is valid without running its validations', (_, input) => {
      const { OptionalDark, isDark } = darkSettings();
      expect(new OptionalDark(input as Settings).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
      expect(isDark).not.toHaveBeenCalled();
    });
  });

  describe('isNull / toString', () => {
    it.each([
      ['a value', new SettingsType({ theme: 'dark' }), false, '{"theme":"dark"}'],
      ['an empty value', new SettingsType(null), true, ''],
    ])('%s → isNull %s, toString %p', (_, instance, isNull, text) => {
      expect(instance.isNull).toBe(isNull);
      expect(instance.toString).toBe(text);
    });
  });
});

describe('Required(JsonType)', () => {
  describe('typing', () => {
    it('takes only its object and holds it', () => {
      expectTypeOf<ConstructorParameters<typeof RequiredSettings>>().toEqualTypeOf<
        [value: Settings]
      >();
      expectTypeOf<RequiredSettings['value']>().toEqualTypeOf<Settings>();
      expectTypeOf<RequiredSettings['validate']>().toEqualTypeOf<
        () => ValidationResult<Settings>
      >();
    });

    it('does not accept a missing value or a value of another type', () => {
      // @ts-expect-error a required object needs a value
      expect(() => new RequiredSettings()).toThrow(RequiredValueException);
      // @ts-expect-error a required object does not accept null
      expect(() => new RequiredSettings(null)).toThrow(RequiredValueException);
      // @ts-expect-error a required object does not accept undefined
      expect(() => new RequiredSettings(undefined)).toThrow(RequiredValueException);
      // @ts-expect-error a required object does not accept a string
      expect(new RequiredSettings('{"theme":"dark"}').value).toEqual({ theme: 'dark' });
    });
  });

  describe('construction', () => {
    it.each(convertibleInputs)('%p → %p', (input, expected) => {
      expect(new RequiredSettings(input as Settings).value).toEqual(expected);
    });

    it.each(emptyInputs)('%s throws RequiredValueException', (_, input) => {
      const received = typeof input === 'string' ? `"${input}"` : 'null';
      const create = () => new RequiredSettings(input as Settings);
      expect(create).toThrow(RequiredValueException);
      expect(create).toThrow(requiredError(received));
    });

    it('throws TypePrimitiveException for an empty object', () => {
      expect(() => new RequiredSettings({} as Settings)).toThrow(primitiveError('{}'));
    });
  });

  describe('validate', () => {
    it('runs its validations on a value', () => {
      const { RequiredDark } = darkSettings();
      expect(new RequiredDark({ theme: 'dark' }).validate().ok).toBe(true);
      expect(new RequiredDark({ theme: 'light' }).validate().errors).toEqual([isDarkError]);
    });

    it('does not make JsonType required', () => {
      expect(new SettingsType(null).validate()).toEqual({ ok: true, value: null, errors: [] });
    });
  });
});
