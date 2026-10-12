import { toString } from './string';
import { ConvertMessages, failure, success } from './result';
import type { Converted } from './result';

function isNonEmptyPlainRecord(v: unknown): v is Record<string, unknown> {
  return (
    v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length > 0
  );
}

function isPlainObject(v: object): boolean {
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

// Iterative so that hostile, deeply nested input cannot overflow the stack.
function isJsonSafe(root: object): boolean {
  const ancestors = new Set<object>();
  const stack: { node: object; exit: boolean }[] = [{ node: root, exit: false }];
  while (stack.length > 0) {
    const { node, exit } = stack.pop() as { node: object; exit: boolean };
    if (exit) {
      ancestors.delete(node);
      continue;
    }
    if (ancestors.has(node)) return false;
    if (!Array.isArray(node) && !isPlainObject(node)) return false;
    ancestors.add(node);
    stack.push({ node, exit: true });
    for (const child of Object.values(node)) {
      if (child === null || typeof child === 'string' || typeof child === 'boolean') continue;
      if (typeof child === 'number') {
        if (!Number.isFinite(child)) return false;
        continue;
      }
      if (typeof child !== 'object') return false;
      stack.push({ node: child, exit: false });
    }
  }
  return true;
}

export function toJson(v: unknown): Converted<Record<string, unknown>> {
  if (typeof v === 'string') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(v);
    } catch {
      return failure(ConvertMessages.JSON);
    }
    return isNonEmptyPlainRecord(parsed) ? success(parsed) : failure(ConvertMessages.JSON);
  }
  try {
    return isNonEmptyPlainRecord(v) && isJsonSafe(v) ? success(v) : failure(ConvertMessages.JSON);
  } catch {
    // Hostile values (throwing getters, revoked proxies) make the inspection throw.
    return failure(ConvertMessages.JSON);
  }
}

export interface JsonValueConvertOptions {
  allowPrimitives?: boolean;
  allowAnyValue?: boolean;
}

export function toJsonValue(v: unknown, options?: JsonValueConvertOptions): Converted<unknown> {
  const str = toString(v);
  if (!str.ok) return failure(ConvertMessages.JSON_VALUE);
  let parsed: unknown;
  try {
    parsed = JSON.parse(str.value);
  } catch {
    return failure(ConvertMessages.JSON_VALUE);
  }
  if (options?.allowAnyValue) return success(parsed);
  if (options?.allowPrimitives && (parsed === null || parsed === true || parsed === false)) {
    return success(parsed);
  }
  return parsed !== null && typeof parsed === 'object'
    ? success(parsed)
    : failure(ConvertMessages.JSON_VALUE);
}
