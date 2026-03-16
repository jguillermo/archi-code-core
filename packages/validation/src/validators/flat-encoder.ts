import type { FieldInput, ValidationRuleName } from './validate';

// ─── Rule codes — MUST match dispatch_by_code in orchestrator.rs ─────────────

export const RC: Record<ValidationRuleName, number> = {
  isNotEmpty: 0,
  isMinLength: 1,
  isMaxLength: 2,
  isExactLength: 3,
  isLengthBetween: 4,
  isAlpha: 5,
  isAlphanumeric: 6,
  isNumeric: 7,
  isAscii: 8,
  isLowercase: 9,
  isUppercase: 10,
  isContains: 11,
  isStartsWith: 12,
  isEndsWith: 13,
  isMatchesRegex: 14,
  isInteger: 15,
  isPositiveInteger: 16,
  isNegativeInteger: 17,
  isFloat: 18,
  isPositiveNumber: 19,
  isNegativeNumber: 20,
  isInRange: 21,
  isMinValue: 22,
  isMaxValue: 23,
  isMultipleOf: 24,
  isEmail: 25,
  isUuid: 26,
  isUuidV4: 27,
  isUuidV7: 28,
  isUrl: 29,
  isUrlWithScheme: 30,
  isIp: 31,
  isIpv4: 32,
  isIpv6: 33,
  isDate: 34,
  isDatetime: 35,
  isTime: 36,
  isBooleanString: 37,
  isCreditCard: 38,
  isJson: 39,
  isHexColor: 40,
  isBase64: 41,
  isSlug: 42,
};

// ─── Binary encoder ───────────────────────────────────────────────────────────
//
// Encodes a fields array into the flat binary format expected by run_flat /
// run_flat_codes. Build this buffer ONCE per schema, reuse on every validation.
//
// param_type: 0=none  1=one_f64  2=two_f64  3=one_str

export function encodeFlat(fields: FieldInput[]): Buffer {
  // ── Pass 1: calculate exact buffer size ──────────────────────────────────
  let size = 2; // num_fields u16
  for (const { value, validations } of fields) {
    size += 1; // field type byte
    if (typeof value === 'number')
      size += 8; // f64
    else if (typeof value === 'string') size += 2 + Buffer.byteLength(value, 'utf8');
    // bool/null/object/array: just the type byte (non-string objects → Null)
    size += 1; // num_rules byte
    for (const rule of validations) {
      const [, p0, p1] = Array.isArray(rule)
        ? (rule as [ValidationRuleName, unknown?, unknown?])
        : [rule as ValidationRuleName];
      const _p0 = (rule as any).params?.[0] ?? p0;
      const _p1 = (rule as any).params?.[1] ?? p1;
      size += 2; // code + param_type
      if (_p1 !== undefined && typeof _p0 === 'number' && typeof _p1 === 'number') size += 16;
      else if (_p0 !== undefined && typeof _p0 === 'number') size += 8;
      else if (_p0 !== undefined && typeof _p0 === 'string')
        size += 2 + Buffer.byteLength(_p0, 'utf8');
    }
  }

  // ── Pass 2: write buffer ─────────────────────────────────────────────────
  const buf = Buffer.allocUnsafe(size);
  let p = 0;

  buf.writeUInt16LE(fields.length, p);
  p += 2;

  for (const { value, validations } of fields) {
    if (
      value === null ||
      value === undefined ||
      typeof value === 'object' ||
      Array.isArray(value)
    ) {
      // Objects and arrays are coerced to Null — Rust treats them as "" for string validators
      buf[p++] = 0;
    } else if (typeof value === 'boolean') {
      buf[p++] = value ? 2 : 1;
    } else if (typeof value === 'number') {
      buf[p++] = 3;
      buf.writeDoubleLE(value as number, p);
      p += 8;
    } else {
      buf[p++] = 4;
      const written = buf.write(String(value), p + 2, 'utf8');
      buf.writeUInt16LE(written, p);
      p += 2 + written;
    }

    buf[p++] = validations.length;

    for (const rule of validations) {
      let name: ValidationRuleName;
      let p0: unknown;
      let p1: unknown;
      if (typeof rule === 'string') {
        name = rule as ValidationRuleName;
      } else if (Array.isArray(rule)) {
        [name, p0, p1] = rule as [ValidationRuleName, unknown?, unknown?];
      } else {
        name = (rule as any).rule as ValidationRuleName;
        p0 = (rule as any).params?.[0];
        p1 = (rule as any).params?.[1];
      }

      buf[p++] = RC[name] ?? 0;

      if (p1 !== undefined && typeof p0 === 'number' && typeof p1 === 'number') {
        buf[p++] = 2;
        buf.writeDoubleLE(p0, p);
        p += 8;
        buf.writeDoubleLE(p1, p);
        p += 8;
      } else if (p0 !== undefined && typeof p0 === 'number') {
        buf[p++] = 1;
        buf.writeDoubleLE(p0, p);
        p += 8;
      } else if (p0 !== undefined && typeof p0 === 'string') {
        buf[p++] = 3;
        const written = buf.write(p0, p + 2, 'utf8');
        buf.writeUInt16LE(written, p);
        p += 2 + written;
      } else {
        buf[p++] = 0;
      }
    }
  }

  return buf;
}

// ─── Single-field encoder helpers ─────────────────────────────────────────────
// Used by direct.ts validators: encodes one field + one rule into a minimal buffer.

export function encodeSingleStr(code: number, value: string): Buffer {
  const vLen = Buffer.byteLength(value, 'utf8');
  const buf = Buffer.allocUnsafe(2 + 1 + 2 + vLen + 1 + 2);
  let p = 0;
  buf.writeUInt16LE(1, p);
  p += 2;
  buf[p++] = 4;
  buf.writeUInt16LE(vLen, p);
  p += 2;
  buf.write(value, p, 'utf8');
  p += vLen;
  buf[p++] = 1;
  buf[p++] = code;
  buf[p++] = 0;
  return buf;
}

export function encodeSingleStrN(code: number, value: string, param: number): Buffer {
  const vLen = Buffer.byteLength(value, 'utf8');
  const buf = Buffer.allocUnsafe(2 + 1 + 2 + vLen + 1 + 2 + 8);
  let p = 0;
  buf.writeUInt16LE(1, p);
  p += 2;
  buf[p++] = 4;
  buf.writeUInt16LE(vLen, p);
  p += 2;
  buf.write(value, p, 'utf8');
  p += vLen;
  buf[p++] = 1;
  buf[p++] = code;
  buf[p++] = 1;
  buf.writeDoubleLE(param, p);
  return buf;
}

export function encodeSingleStrNN(code: number, value: string, p0: number, p1: number): Buffer {
  const vLen = Buffer.byteLength(value, 'utf8');
  const buf = Buffer.allocUnsafe(2 + 1 + 2 + vLen + 1 + 2 + 16);
  let p = 0;
  buf.writeUInt16LE(1, p);
  p += 2;
  buf[p++] = 4;
  buf.writeUInt16LE(vLen, p);
  p += 2;
  buf.write(value, p, 'utf8');
  p += vLen;
  buf[p++] = 1;
  buf[p++] = code;
  buf[p++] = 2;
  buf.writeDoubleLE(p0, p);
  p += 8;
  buf.writeDoubleLE(p1, p);
  return buf;
}

export function encodeSingleStrS(code: number, value: string, param: string): Buffer {
  const vLen = Buffer.byteLength(value, 'utf8');
  const pLen = Buffer.byteLength(param, 'utf8');
  const buf = Buffer.allocUnsafe(2 + 1 + 2 + vLen + 1 + 2 + 2 + pLen);
  let p = 0;
  buf.writeUInt16LE(1, p);
  p += 2;
  buf[p++] = 4;
  buf.writeUInt16LE(vLen, p);
  p += 2;
  buf.write(value, p, 'utf8');
  p += vLen;
  buf[p++] = 1;
  buf[p++] = code;
  buf[p++] = 3;
  buf.writeUInt16LE(pLen, p);
  p += 2;
  buf.write(param, p, 'utf8');
  return buf;
}

export function encodeSingleNum(code: number, value: number): Buffer {
  const buf = Buffer.allocUnsafe(2 + 1 + 8 + 1 + 2);
  let p = 0;
  buf.writeUInt16LE(1, p);
  p += 2;
  buf[p++] = 3;
  buf.writeDoubleLE(value, p);
  p += 8;
  buf[p++] = 1;
  buf[p++] = code;
  buf[p++] = 0;
  return buf;
}

export function encodeSingleNumN(code: number, value: number, param: number): Buffer {
  const buf = Buffer.allocUnsafe(2 + 1 + 8 + 1 + 2 + 8);
  let p = 0;
  buf.writeUInt16LE(1, p);
  p += 2;
  buf[p++] = 3;
  buf.writeDoubleLE(value, p);
  p += 8;
  buf[p++] = 1;
  buf[p++] = code;
  buf[p++] = 1;
  buf.writeDoubleLE(param, p);
  return buf;
}

export function encodeSingleNumNN(code: number, value: number, p0: number, p1: number): Buffer {
  const buf = Buffer.allocUnsafe(2 + 1 + 8 + 1 + 2 + 16);
  let p = 0;
  buf.writeUInt16LE(1, p);
  p += 2;
  buf[p++] = 3;
  buf.writeDoubleLE(value, p);
  p += 8;
  buf[p++] = 1;
  buf[p++] = code;
  buf[p++] = 2;
  buf.writeDoubleLE(p0, p);
  p += 8;
  buf.writeDoubleLE(p1, p);
  return buf;
}

export function encodeSingleBool(code: number, value: boolean): Buffer {
  const buf = Buffer.allocUnsafe(2 + 1 + 1 + 2);
  let p = 0;
  buf.writeUInt16LE(1, p);
  p += 2;
  buf[p++] = value ? 2 : 1;
  buf[p++] = 1;
  buf[p++] = code;
  buf[p++] = 0;
  return buf;
}
