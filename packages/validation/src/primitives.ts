const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

export function canBeString(v: unknown): boolean {
  if (typeof v === 'string') return true;
  if (typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  return false;
}

export function canBeBoolean(v: unknown): boolean {
  if (typeof v === 'boolean') return true;
  if (typeof v === 'number') return v === 0 || v === 1;
  if (typeof v === 'string') return /^\s*(true|false|1|0)\s*$/i.test(v);
  return false;
}

export function canBeInteger(v: unknown): boolean {
  if (typeof v === 'number') return Number.isFinite(v) && Number.isInteger(v);
  if (typeof v === 'string') return /^-?\d+$/.test(v.trim());
  return false;
}

export function canBeFloat(v: unknown): boolean {
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed === '') return false;
    const n = Number(trimmed);
    return !isNaN(n) && isFinite(n);
  }
  return false;
}

export function canBeDate(v: unknown): boolean {
  if (v instanceof Date) return !isNaN(v.getTime());
  if (typeof v === 'string') {
    if (!DATE_FORMAT.test(v)) return false;
    return !isNaN(new Date(v.replace(' ', 'T')).getTime());
  }
  return false;
}

export function canBeJson(v: unknown): boolean {
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return p !== null && typeof p === 'object' && !Array.isArray(p) && Object.keys(p).length > 0;
    } catch {
      return false;
    }
  }
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
    if (Object.keys(v as object).length === 0) return false;
    try {
      JSON.stringify(v);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function canBeArray(v: unknown): boolean {
  if (Array.isArray(v)) return true;
  if (typeof v === 'string') {
    try {
      return Array.isArray(JSON.parse(v));
    } catch {
      return false;
    }
  }
  return false;
}

export function canBeEnum(v: unknown, options: string[]): boolean {
  if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') return false;
  return options.includes(String(v));
}
