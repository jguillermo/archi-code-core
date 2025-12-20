import { universalToString } from '@code-core/common';

export enum PrimitivesKeys {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  UUID = 'uuid',
  OBJECT = 'object',
  ARRAY = 'array',
  FUNCTION = 'function',
  UNDEFINED = 'undefined',
  NULL = 'null',
  SYMBOL = 'symbol',
  DATE = 'date',
  REGEXP = 'regexp',
  ERROR = 'error',
  PROMISE = 'promise',
  MAP = 'map',
  SET = 'set',
}

const PrimitivesValues = {
  [PrimitivesKeys.STRING]: ['random', '', '   ', 'áéíóú', 'abc123'],
  [PrimitivesKeys.NUMBER]: [1, -1, 1.1, -1.1, 0],
  [PrimitivesKeys.BOOLEAN]: [true, false],
  [PrimitivesKeys.OBJECT]: [{ a: 123 }],
  [PrimitivesKeys.ARRAY]: [[], [1, 2, 3]],
  [PrimitivesKeys.UUID]: ['df9ef000-21fc-4e06-b8f7-103c3a133d10'],
  [PrimitivesKeys.FUNCTION]: [() => 123, new Function('return 123')],
  [PrimitivesKeys.UNDEFINED]: [undefined],
  [PrimitivesKeys.NULL]: [null],
  [PrimitivesKeys.SYMBOL]: [Symbol(), Symbol('123')],
  [PrimitivesKeys.DATE]: [new Date(), new Date('2020-01-01')],
  [PrimitivesKeys.REGEXP]: [new RegExp('test'), /test/],
  [PrimitivesKeys.ERROR]: [new Error('data error')],
  [PrimitivesKeys.PROMISE]: [Promise.resolve('data promise')],
  [PrimitivesKeys.MAP]: [new Map(), new Map([[1, 2]])],
  [PrimitivesKeys.SET]: [new Set(), new Set([1, 2, 3])],
};

export function canByType(...primitiveTypes: PrimitivesKeys[]) {
  const values: any[] = [];

  for (const primitiveType of primitiveTypes) {
    switch (primitiveType) {
      case PrimitivesKeys.STRING:
        values.push(...PrimitivesValues[PrimitivesKeys.STRING]);
        values.push(...PrimitivesValues[PrimitivesKeys.NUMBER].map((value) => value.toString()));
        values.push(...PrimitivesValues[PrimitivesKeys.BOOLEAN].map((value) => value.toString()));
        break;
      case PrimitivesKeys.NUMBER:
        values.push(...PrimitivesValues[PrimitivesKeys.NUMBER]);
        values.push(...PrimitivesValues[PrimitivesKeys.NUMBER].map((value) => value.toString()));
        break;
      case PrimitivesKeys.BOOLEAN:
        values.push(...PrimitivesValues[PrimitivesKeys.BOOLEAN]);
        values.push(...['True', 'False', 'TRUE', 'FALSE', 'true', 'false', '  True  ', ' False ', ' TRUE ', '  FALSE ', ' true ', ' false ']);
        values.push(...['1', ' 1', '0', ' 0', 0, 1]);
        break;
      case PrimitivesKeys.DATE: {
        const validDates = ['2018-03-23T16:02:15.000Z', '2018-03-23', '2018-03-23 16:02:15.000Z', '2018-03-23T16:02:15', '2018-03-23 16:02:15', '2018-03-23 00:00:00'];
        values.push(...validDates);
        values.push(...validDates.map((value) => new Date(value)));
        values.push(...PrimitivesValues[primitiveType]);
        break;
      }
      case PrimitivesKeys.OBJECT:
        values.push(...PrimitivesValues[PrimitivesKeys.OBJECT]);
        values.push(...PrimitivesValues[PrimitivesKeys.OBJECT].map((value) => universalToString(value)));
        break;
      default:
        values.push(...PrimitivesValues[primitiveType]);
    }
  }

  return values;
}

export function skipByType(...primitiveType: PrimitivesKeys[]) {
  const values: any[] = [];
  for (const key in PrimitivesValues) {
    if (!primitiveType.includes(key as PrimitivesKeys)) {
      values.push(...PrimitivesValues[key]);
    }
  }
  return values;
}

export function skipByTypeRequired(...primitiveType: PrimitivesKeys[]) {
  const values: any[] = [];
  primitiveType.push(PrimitivesKeys.NULL, PrimitivesKeys.UNDEFINED);
  for (const key in PrimitivesValues) {
    if (!primitiveType.includes(key as PrimitivesKeys)) {
      values.push(...PrimitivesValues[key]);
    }
  }
  return excludeItems(values, ['']);
}

export function emptyTypes(): PrimitivesKeys[] {
  return [...canByType(PrimitivesKeys.UNDEFINED, PrimitivesKeys.NULL), ''];
}

export function nullables(): PrimitivesKeys[] {
  return [...canByType(PrimitivesKeys.UNDEFINED, PrimitivesKeys.NULL)];
}

export function allTypes(): PrimitivesKeys[] {
  return Object.values(PrimitivesKeys);
}

export function allTypesRequired(): PrimitivesKeys[] {
  const keys: any[] = [];

  const itemsToSkip = [PrimitivesKeys.UNDEFINED, PrimitivesKeys.NULL];
  Object.values(PrimitivesKeys).forEach(function (item) {
    if (!itemsToSkip.includes(item)) {
      keys.push(item);
    }
  });
  return excludeItems(canByType(...keys), ['']);
}

export function excludeItems(allItems: any[], excludes: any[]) {
  const values: any[] = [];
  allItems.forEach((item) => {
    if (!excludes.includes(item)) {
      values.push(item);
    }
  });
  return values;
}
