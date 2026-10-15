import { CriteriaError } from './criteria-error';

const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

export function assertField(field: unknown): string {
  if (typeof field !== 'string' || field.length === 0) {
    throw new CriteriaError('INVALID_FIELD', 'A field must be a non-empty string');
  }
  for (const segment of field.split('.')) {
    if (segment.length === 0 || segment.startsWith('$') || FORBIDDEN_SEGMENTS.has(segment)) {
      throw new CriteriaError('INVALID_FIELD', `Invalid field "${field}"`);
    }
  }
  return field;
}
