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

/**
 * True when `root` survives a JSON round trip unchanged: only plain objects and arrays, whose leaves
 * are strings, booleans, finite numbers or null. Anything `JSON.stringify` would drop or alter
 * (functions, undefined, Symbols, BigInt, NaN/Infinity, Dates, Maps, class instances, typed arrays,
 * `toJSON` methods) or cannot serialize (cycles) is rejected. Iterative, so deep nesting cannot
 * overflow the stack; shared (non-cyclic) references are fine.
 */
function isJsonSafe(root: object): boolean {
  const onPath = new Set<object>();
  const stack: { node: object; exit: boolean }[] = [{ node: root, exit: false }];
  while (stack.length > 0) {
    const { node, exit } = stack.pop() as { node: object; exit: boolean };
    if (exit) {
      onPath.delete(node);
      continue;
    }
    if (onPath.has(node)) return false; // cycle
    if (!Array.isArray(node) && !isPlainObject(node)) return false;
    onPath.add(node);
    stack.push({ node, exit: true });
    for (const child of Object.values(node)) {
      if (child === null || typeof child === 'string' || typeof child === 'boolean') continue;
      if (typeof child === 'number') {
        if (!Number.isFinite(child)) return false;
        continue;
      }
      if (typeof child !== 'object') return false; // undefined, function, symbol, bigint
      stack.push({ node: child, exit: false });
    }
  }
  return true;
}

/**
 * A non-empty JSON object (plain record). Arrays, primitives and `{}` are rejected on purpose:
 * this models a domain-safe JSON object, not arbitrary JSON (use `validator.isJSON` for that).
 * Object inputs must be JSON-safe all the way down (see `isJsonSafe`) and are returned by reference.
 */
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
    return failure(ConvertMessages.JSON); // hostile values: throwing getters, revoked proxies…
  }
}

export interface JsonValueConvertOptions {
  /** Also accept the JSON primitives `null`, `true` and `false`. Default: false. */
  allowPrimitives?: boolean;
  /** Accept any value `JSON.parse` produces (numbers and strings included). Default: false. */
  allowAnyValue?: boolean;
}

/**
 * Parses JSON TEXT into its value — rule PORTED FROM `validator.isJSON`, moved here so the
 * validator no longer duplicates JSON parsing. It is NOT compatible with `toJson`: any object is
 * accepted (arrays and `{}` included), primitives are opt-in, booleans/finite numbers are read
 * through `toString`, and object inputs are NOT accepted (only text).
 */
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
