import { validate } from './validate';
import type { ValidateInput, ValidationRule, ValidationRuleName } from './validate';
import { RC } from './flat-encoder';

// ─── Output type ──────────────────────────────────────────────────────────────

export interface ValidateJsonOutput {
  ok: boolean;
  errors: Record<string, string[]>;
}

// ─── JS-side message table ────────────────────────────────────────────────────
//
// Maps rule codes to human-readable messages. Implemented in JS since the
// binary API returns codes only — string generation lives here, not in Rust.

type MsgTable = Record<number, string>;

const EN: MsgTable = {
  0: 'Value should not be empty',
  1: 'Must be at least {0} characters long',
  2: 'Must be at most {0} characters long',
  3: 'Must be exactly {0} characters long',
  4: 'Must be between {0} and {1} characters long',
  5: 'Must contain only alphabetic characters',
  6: 'Must contain only alphanumeric characters',
  7: 'Must contain only numeric digits',
  8: 'Must contain only ASCII characters',
  9: 'Must be lowercase',
  10: 'Must be uppercase',
  11: 'Must contain the substring "{0}"',
  12: 'Must start with "{0}"',
  13: 'Must end with "{0}"',
  14: 'Must match the pattern "{0}"',
  15: 'Must be an integer',
  16: 'Must be a positive integer',
  17: 'Must be a negative integer',
  18: 'Must be a float',
  19: 'Must be a positive number',
  20: 'Must be a negative number',
  21: 'Must be between {0} and {1}',
  22: 'Must be at least {0}',
  23: 'Must be at most {0}',
  24: 'Must be a multiple of {0}',
  25: 'Must be a valid email address',
  26: 'Must be a valid UUID',
  27: 'Must be a valid UUID v4',
  28: 'Must be a valid UUID v7',
  29: 'Must be a valid URL',
  30: 'Must be a URL with scheme "{0}"',
  31: 'Must be a valid IP address',
  32: 'Must be a valid IPv4 address',
  33: 'Must be a valid IPv6 address',
  34: 'Must be a valid date (YYYY-MM-DD)',
  35: 'Must be a valid datetime',
  36: 'Must be a valid time (HH:MM:SS)',
  37: 'Must be a boolean value',
  38: 'Must be a valid credit card number',
  39: 'Must be valid JSON',
  40: 'Must be a valid hex color',
  41: 'Must be a valid Base64 string',
  42: 'Must be a valid URL slug',
};

const ES: MsgTable = {
  0: 'El valor no debe estar vacío',
  1: 'Debe tener al menos {0} caracteres',
  2: 'Debe tener como máximo {0} caracteres',
  3: 'Debe tener exactamente {0} caracteres',
  4: 'Debe tener entre {0} y {1} caracteres',
  5: 'Solo debe contener caracteres alfabéticos',
  6: 'Solo debe contener caracteres alfanuméricos',
  7: 'Solo debe contener dígitos numéricos',
  8: 'Solo debe contener caracteres ASCII',
  9: 'Debe estar en minúsculas',
  10: 'Debe estar en mayúsculas',
  11: 'Debe contener la subcadena "{0}"',
  12: 'Debe comenzar con "{0}"',
  13: 'Debe terminar con "{0}"',
  14: 'Debe coincidir con el patrón "{0}"',
  15: 'Debe ser un número entero',
  16: 'Debe ser un entero positivo',
  17: 'Debe ser un entero negativo',
  18: 'Debe ser un número decimal',
  19: 'Debe ser un número positivo',
  20: 'Debe ser un número negativo',
  21: 'Debe estar entre {0} y {1}',
  22: 'Debe ser al menos {0}',
  23: 'Debe ser como máximo {0}',
  24: 'Debe ser múltiplo de {0}',
  25: 'Debe ser un correo electrónico válido',
  26: 'Debe ser un UUID válido',
  27: 'Debe ser un UUID v4 válido',
  28: 'Debe ser un UUID v7 válido',
  29: 'Debe ser una URL válida',
  30: 'Debe ser una URL con esquema "{0}"',
  31: 'Debe ser una dirección IP válida',
  32: 'Debe ser una dirección IPv4 válida',
  33: 'Debe ser una dirección IPv6 válida',
  34: 'Debe ser una fecha válida (YYYY-MM-DD)',
  35: 'Debe ser una fecha y hora válidas',
  36: 'Debe ser una hora válida (HH:MM:SS)',
  37: 'Debe ser un valor booleano',
  38: 'Debe ser un número de tarjeta de crédito válido',
  39: 'Debe ser un JSON válido',
  40: 'Debe ser un color hexadecimal válido',
  41: 'Debe ser una cadena Base64 válida',
  42: 'Debe ser un slug de URL válido',
};

const TABLES: Record<string, MsgTable> = { en: EN, es: ES };

function interpolate(template: string, params: unknown[]): string {
  return template.replace(/\{(\d+)\}/g, (_, i) => String(params[+i] ?? ''));
}

function getRuleInfo(rule: ValidationRule): { code: number; params: unknown[]; message?: string } {
  if (typeof rule === 'string') {
    return { code: RC[rule as ValidationRuleName], params: [] };
  }
  if (Array.isArray(rule)) {
    const [name, ...params] = rule as [ValidationRuleName, ...unknown[]];
    return { code: RC[name], params };
  }
  return {
    code: RC[(rule as any).rule as ValidationRuleName],
    params: (rule as any).params ?? [],
    message: (rule as any).message,
  };
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export const validateJson = (input: ValidateInput | string): ValidateJsonOutput => {
  let parsed: ValidateInput;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input) as ValidateInput;
    } catch {
      return { ok: false, errors: { _parse: ['Invalid JSON input'] } };
    }
  } else {
    parsed = input;
  }

  const locale = parsed.locale ?? 'en';
  const table = TABLES[locale] ?? EN;
  const result = validate(parsed);

  const errors: Record<string, string[]> = {};
  for (const { field, validations } of parsed.fields) {
    const failingCodes = result.errors[field] ?? [];
    if (failingCodes.length === 0) {
      errors[field] = [];
      continue;
    }
    const ruleInfos = validations.map(getRuleInfo);
    errors[field] = failingCodes.map((code) => {
      const info = ruleInfos.find((r) => r.code === code);
      if (!info) return `Validation failed (code ${code})`;
      if (info.message) return info.message;
      const template = table[code] ?? EN[code] ?? `Validation failed (code ${code})`;
      return interpolate(template, info.params);
    });
  }

  return { ok: result.ok, errors };
};
