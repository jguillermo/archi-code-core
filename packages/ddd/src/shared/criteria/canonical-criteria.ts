import { CriteriaJson } from './criteria-json';

const SET_CODES = new Set(['in', 'nin', 'hs', 'he']);

function uniqueSorted(texts: readonly string[]): string[] {
  return Array.from(new Set(texts)).sort();
}

function childTexts(node: readonly unknown[], code: string): string[] {
  return node[0] === code
    ? (node[1] as readonly unknown[][]).flatMap((child) => childTexts(child, code))
    : [canonicalNode(node)];
}

function canonicalNode(node: readonly unknown[]): string {
  const [code, first, second] = node;
  if (code === 'and' || code === 'or') {
    const children = uniqueSorted(childTexts(node, code));
    return children.length === 1 ? children[0] : `["${code}",[${children.join(',')}]]`;
  }
  if (code === 'not') {
    return `["not",${canonicalNode(first as readonly unknown[])}]`;
  }
  if (SET_CODES.has(code as string)) {
    const values = uniqueSorted(
      (second as readonly unknown[]).map((value) => JSON.stringify(value)),
    );
    return `[${JSON.stringify(code)},${JSON.stringify(first)},[${values.join(',')}]]`;
  }
  return JSON.stringify(node);
}

export function canonicalCriteria(json: CriteriaJson): string {
  const filter = json.f === undefined ? 'null' : canonicalNode(json.f);
  return `[${filter},${JSON.stringify([json.o ?? [], json.l ?? null, json.s ?? 0])}]`;
}
