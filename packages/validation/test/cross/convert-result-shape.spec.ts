import { describe, expect, it } from '@jest/globals';
import { toArray, toBoolean, toEnum, toInteger, ConvertMessages } from '../../src/convert';

describe('convert rules — { ok, value, error }', () => {
  it('every result has exactly { ok, value, error }', () => {
    expect(toBoolean('false')).toEqual({ ok: true, value: false, error: null });
    expect(toBoolean('maybe')).toEqual({ ok: false, value: null, error: ConvertMessages.BOOLEAN });
    expect(toInteger('42')).toEqual({ ok: true, value: 42, error: null });
    expect(toEnum(1, ['1'])).toEqual({ ok: true, value: '1', error: null });
    expect(Object.keys(toArray('[]')).sort()).toEqual(['error', 'ok', 'value']);
    expect(Object.keys(toArray('x')).sort()).toEqual(['error', 'ok', 'value']);
  });
});
