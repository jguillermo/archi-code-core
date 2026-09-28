import { describe, it, expect } from '@jest/globals';
import { argumentsOf, toArguments } from '../../src/decorator/properties';

describe('argumentsOf', () => {
  it('passes the options object as is to the validators that take one', () => {
    const properties = { min: 2 };
    expect(argumentsOf('isInt', properties)).toEqual([properties]);
    expect(argumentsOf('isInt', properties)[0]).toBe(properties);
    expect(argumentsOf('isLength', { min: 2, max: 10 })).toEqual([{ min: 2, max: 10 }]);
  });

  it('passes nothing when there are no properties', () => {
    expect(argumentsOf('isPort', undefined)).toEqual([]);
    expect(argumentsOf('isInt', undefined)).toEqual([]);
  });

  it('translates an absent properties object as an empty one', () => {
    expect(argumentsOf('isAlpha', undefined)).toEqual([undefined, {}]);
    expect(argumentsOf('isUUID', undefined)).toEqual([undefined]);
  });

  it('does not take inherited keys for translations', () => {
    expect(argumentsOf('toString', { a: 1 })).toEqual([{ a: 1 }]);
  });
});

describe('toArguments', () => {
  const pattern = /^a/;
  const cases: [keyof typeof toArguments, object, unknown[]][] = [
    ['isMobilePhone', { locale: 'es-ES', strictMode: true }, ['es-ES', { strictMode: true }]],
    ['isAlpha', { locale: 'es-ES', ignore: ' ' }, ['es-ES', { ignore: ' ' }]],
    ['isAlphanumeric', { locale: 'es-ES', ignore: ' ' }, ['es-ES', { ignore: ' ' }]],
    [
      'contains',
      { elem: 'a', ignoreCase: true, minOccurrences: 2 },
      ['a', { ignoreCase: true, minOccurrences: 2 }],
    ],
    ['matches', { pattern, modifiers: 'i' }, [pattern, 'i']],
    ['isHash', { algorithm: 'md5' }, ['md5']],
    ['isIn', { values: ['a', 'b'] }, [['a', 'b']]],
    ['equals', { comparison: 'a' }, ['a']],
    ['isDivisibleBy', { num: 3 }, [3]],
    ['isWhitelisted', { chars: 'abc' }, ['abc']],
    ['isPostalCode', { locale: 'ES' }, ['ES']],
    ['isLicensePlate', { locale: 'es-ES' }, ['es-ES']],
    ['isIdentityCard', { locale: 'ES' }, ['ES']],
    ['isPassportNumber', { countryCode: 'ES' }, ['ES']],
    ['isVAT', { countryCode: 'ES' }, ['ES']],
    ['isUUID', { version: 4 }, [4]],
    ['isIPRange', { version: 4 }, [4]],
  ];

  it('covers every translated validator', () => {
    expect(cases.map(([name]) => name).sort()).toEqual(Object.keys(toArguments).sort());
  });

  it.each(cases)('%s', (name, properties, args) => {
    expect(argumentsOf(name, properties)).toEqual(args);
  });

  it('leaves the validator default when an optional key is missing', () => {
    expect(argumentsOf('isMobilePhone', { strictMode: true })).toEqual([
      undefined,
      { strictMode: true },
    ]);
    expect(argumentsOf('matches', { pattern })).toEqual([pattern, undefined]);
  });
});
