import { describe, expect, it, jest } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { Validations } from '@archi-code/validation';
import type { ValidationResult } from '@archi-code/validation';
import { EnumType } from './enum-type';
import { AbstractType, Required } from './abstract-type';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';
import { RequiredValueException } from '../exceptions/domain/required-value.exception';

enum Status {
  UP = 'up',
  DOWN = 'down',
}

enum Level {
  LOW = 1,
  HIGH = 2,
}

class StatusType extends EnumType<Status> {
  protected getEnum(): typeof Status {
    return Status;
  }
}

class LevelType extends EnumType<Level> {
  protected getEnum(): typeof Level {
    return Level;
  }
}

class RequiredStatus extends Required(StatusType) {}

const emptyInputs: [string, unknown][] = [
  ['null', null],
  ['undefined', undefined],
  ['an empty string', ''],
  ['only spaces', '   '],
];

const notStatusInputs: [unknown, string][] = [
  ['UP', '"UP"'],
  ['Up', '"Up"'],
  [' up ', '" up "'],
  ['left', '"left"'],
  [1, '1'],
  [true, 'true'],
  [{ a: 1 }, '{"a":1}'],
];

const notLevelInputs: [unknown, string][] = [
  ['1', '"1"'],
  ['LOW', '"LOW"'],
  [3, '3'],
  [0, '0'],
];

function statusError(received: string): string {
  return `Validation Error: Expected one of [up, down], but received ${received}.`;
}

function levelError(received: string): string {
  return `Validation Error: Expected one of [1, 2], but received ${received}.`;
}

function requiredError(received: string): string {
  return `Validation Error: RequiredStatus is required, but received ${received}.`;
}

function upStatuses() {
  const isUp = jest.fn((value: unknown) => value === Status.UP);

  @Validations([{ custom: 'isUp', fn: isUp }])
  class OptionalUp extends StatusType {}

  @Validations([{ custom: 'isUp', fn: isUp }])
  class RequiredUp extends Required(StatusType) {}

  return { OptionalUp, RequiredUp, isUp };
}

const isUpError = { custom: 'isUp', message: 'Value does not satisfy isUp' };

describe('EnumType (optional)', () => {
  describe('typing', () => {
    it('is an AbstractType of its enum that takes an option, null or nothing and holds it or null', () => {
      expectTypeOf<StatusType>().toMatchTypeOf<AbstractType<Status>>();
      expectTypeOf<ConstructorParameters<typeof StatusType>>().toEqualTypeOf<
        [value?: Status | null]
      >();
      expectTypeOf<StatusType['value']>().toEqualTypeOf<Status | null>();
      expectTypeOf<StatusType['validate']>().toEqualTypeOf<() => ValidationResult<Status | null>>();
      expectTypeOf<LevelType['value']>().toEqualTypeOf<Level | null>();
    });

    it('its value cannot be used as a plain option', () => {
      // @ts-expect-error an optional value may be null
      const status: Status = new StatusType(Status.UP).value;
      expect(status).toBe(Status.UP);
    });
  });

  describe('conversion', () => {
    it.each([[Status.UP], [Status.DOWN]])('the string option %p is kept', (input) => {
      expect(new StatusType(input).value).toBe(input);
    });

    it.each([[Level.LOW], [Level.HIGH]])('the number option %p is kept', (input) => {
      expect(new LevelType(input).value).toBe(input);
    });

    it.each(emptyInputs)('%s → null', (_, input) => {
      expect(new StatusType(input as Status).value).toBeNull();
    });

    it('no value → null', () => {
      expect(new StatusType().value).toBeNull();
    });

    it.each(notStatusInputs)('%p is not a Status option', (input, received) => {
      const create = () => new StatusType(input as Status);
      expect(create).toThrow(TypePrimitiveException);
      expect(create).toThrow(statusError(received));
    });

    it.each(notLevelInputs)('%p is not a Level option, its keys included', (input, received) => {
      const create = () => new LevelType(input as Level);
      expect(create).toThrow(TypePrimitiveException);
      expect(create).toThrow(levelError(received));
    });
  });

  describe('validate', () => {
    it.each([[Status.UP], [Status.DOWN]])('%p is valid', (input) => {
      expect(new StatusType(input).validate()).toEqual({ ok: true, value: input, errors: [] });
    });

    it.each(emptyInputs)('%s is valid as null', (_, input) => {
      expect(new StatusType(input as Status).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
    });

    it('runs its validations on a value', () => {
      const { OptionalUp } = upStatuses();
      expect(new OptionalUp(Status.UP).validate().ok).toBe(true);
      expect(new OptionalUp(Status.DOWN).validate().errors).toEqual([isUpError]);
    });

    it.each(emptyInputs)('%s is valid without running its validations', (_, input) => {
      const { OptionalUp, isUp } = upStatuses();
      expect(new OptionalUp(input as Status).validate()).toEqual({
        ok: true,
        value: null,
        errors: [],
      });
      expect(isUp).not.toHaveBeenCalled();
    });
  });

  describe('isNull / toString', () => {
    it.each([
      ['a string option', new StatusType(Status.UP), false, 'up'],
      ['a number option', new LevelType(Level.HIGH), false, '2'],
      ['an empty value', new StatusType(null), true, ''],
    ])('%s → isNull %s, toString %p', (_, instance, isNull, text) => {
      expect(instance.isNull).toBe(isNull);
      expect(instance.toString).toBe(text);
    });
  });
});

describe('Required(EnumType)', () => {
  describe('typing', () => {
    it('takes only an option and holds an option', () => {
      expectTypeOf<ConstructorParameters<typeof RequiredStatus>>().toEqualTypeOf<[value: Status]>();
      expectTypeOf<RequiredStatus['value']>().toEqualTypeOf<Status>();
      expectTypeOf<RequiredStatus['validate']>().toEqualTypeOf<() => ValidationResult<Status>>();
    });

    it('does not accept a missing value or a value of another type', () => {
      // @ts-expect-error a required option needs a value
      expect(() => new RequiredStatus()).toThrow(RequiredValueException);
      // @ts-expect-error a required option does not accept null
      expect(() => new RequiredStatus(null)).toThrow(RequiredValueException);
      // @ts-expect-error a required option does not accept undefined
      expect(() => new RequiredStatus(undefined)).toThrow(RequiredValueException);
      // @ts-expect-error a required option does not accept a plain string
      expect(new RequiredStatus('up').value).toBe(Status.UP);
    });
  });

  describe('construction', () => {
    it.each([[Status.UP], [Status.DOWN]])('%p is kept', (input) => {
      expect(new RequiredStatus(input).value).toBe(input);
    });

    it.each(emptyInputs)('%s throws RequiredValueException', (_, input) => {
      const received = typeof input === 'string' ? `"${input}"` : 'null';
      const create = () => new RequiredStatus(input as Status);
      expect(create).toThrow(RequiredValueException);
      expect(create).toThrow(requiredError(received));
    });

    it('throws TypePrimitiveException for a value that is not an option', () => {
      expect(() => new RequiredStatus('left' as Status)).toThrow(statusError('"left"'));
    });
  });

  describe('validate', () => {
    it('runs its validations on a value', () => {
      const { RequiredUp } = upStatuses();
      expect(new RequiredUp(Status.UP).validate().ok).toBe(true);
      expect(new RequiredUp(Status.DOWN).validate().errors).toEqual([isUpError]);
    });

    it('does not make the enum type required', () => {
      expect(new StatusType(null).validate()).toEqual({ ok: true, value: null, errors: [] });
    });
  });
});
