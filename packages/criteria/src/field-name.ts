import { CriteriaError, quote } from './criteria-error';

const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

function hasControlCharacter(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }
  return false;
}

export function assertField(field: unknown): string {
  if (typeof field !== 'string' || field.length === 0) {
    throw new CriteriaError('INVALID_FIELD', 'A field must be a non-empty string');
  }
  for (const segment of field.split('.')) {
    if (
      segment.length === 0 ||
      segment.startsWith('$') ||
      FORBIDDEN_SEGMENTS.has(segment) ||
      hasControlCharacter(segment)
    ) {
      throw new CriteriaError('INVALID_FIELD', `Invalid field "${quote(field)}"`);
    }
  }
  return field;
}
