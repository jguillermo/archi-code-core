/**
 * Architecture guard — "break cycles by structure, not by discipline".
 *
 * Parses every `import … from '…'` / `export … from '…'` in `src/**` and asserts:
 *  1. the import graph has NO cycles;
 *  2. the layering rules between the three tools hold:
 *
 *     convert/**             ← HARD RULE: imports only convert/ files — never validators/ nor canBe/
 *     canBe/<type>.ts        ← built on convert/<type>.ts only (canBeX(v) = toX(v).ok)
 *     validators/**          ← consume convert/ (type rules), never canBe/
 *     validators with a type rule (isBoolean, isInt, isFloat, isJSON, isDate, isAfter, isBefore,
 *     isIn, …) delegate it to convert/; string coercion is convert/string used directly
 *     validators/index.ts    ← (the barrel) only imported by src/index.ts and createValidator.ts
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../../src');

function listTs(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return listTs(full);
    return e.name.endsWith('.ts') ? [full] : [];
  });
}

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)\s[^;]*?from\s+['"](\.[^'"]+)['"]/g;

function resolveImport(from: string, spec: string): string {
  const base = path.resolve(path.dirname(from), spec);
  for (const candidate of [`${base}.ts`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Cannot resolve "${spec}" imported from ${rel(from)}`);
}

const rel = (p: string): string => path.relative(SRC, p).split(path.sep).join('/');

const files = listTs(SRC);
const graph = new Map<string, string[]>(
  files.map((f) => {
    const code = fs.readFileSync(f, 'utf8');
    const deps = [...code.matchAll(IMPORT_RE)].map((m) => rel(resolveImport(f, m[1])));
    return [rel(f), deps];
  }),
);

function findCycles(): string[][] {
  const cycles: string[][] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];
  const visit = (node: string): void => {
    state.set(node, 'visiting');
    stack.push(node);
    for (const dep of graph.get(node) ?? []) {
      if (state.get(dep) === 'visiting') cycles.push([...stack.slice(stack.indexOf(dep)), dep]);
      else if (!state.has(dep)) visit(dep);
    }
    stack.pop();
    state.set(node, 'done');
  };
  for (const node of graph.keys()) if (!state.has(node)) visit(node);
  return cycles;
}

function importersOf(target: string): string[] {
  return [...graph.entries()].filter(([, deps]) => deps.includes(target)).map(([f]) => f);
}

describe('architecture: import graph', () => {
  it('parses a non-trivial graph (sanity check of the parser itself)', () => {
    expect(graph.size).toBeGreaterThan(50);
    expect(graph.get('index.ts')).toEqual(
      expect.arrayContaining(['validators/index.ts', 'convert/index.ts', 'canBe/index.ts']),
    );
  });

  it('src has no default exports (named exports only)', () => {
    const offenders = files
      .filter((f) => /\bexport\s+default\b|\bdefault\s+as\b/.test(fs.readFileSync(f, 'utf8')))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('has no import cycles', () => {
    expect(findCycles().map((c) => c.join(' → '))).toEqual([]);
  });

  const inDir = (dir: string): string[] => [...graph.keys()].filter((f) => f.startsWith(`${dir}/`));
  // Files of convert/ that are not a type converter (no canBe counterpart).
  const NON_TYPE_FILES = ['index.ts', 'result.ts', 'any-to-string.ts'];
  const typeFiles = (dir: string): string[] =>
    inDir(dir)
      .map((f) => f.slice(dir.length + 1))
      .filter((f) => !NON_TYPE_FILES.includes(f))
      .sort();

  it('anyToString reuses the string rule of convert/string', () => {
    expect(graph.get('convert/any-to-string.ts')).toContain('convert/string.ts');
  });

  it('HARD RULE: convert/ depends only on convert/ (never on validators/ nor canBe/)', () => {
    const offenders = inDir('convert').flatMap((f) =>
      (graph.get(f) ?? []).filter((d) => !d.startsWith('convert/')).map((d) => `${f} → ${d}`),
    );
    expect(offenders).toEqual([]);
  });

  it('validators with a type rule delegate it to convert/ (no duplicated rule)', () => {
    const delegations: [string, string][] = [
      ['validators/contains.ts', 'convert/string.ts'],
      ['validators/isIn.ts', 'convert/enum.ts'],
      ['validators/isBoolean.ts', 'convert/boolean.ts'],
      ['validators/isInt.ts', 'convert/integer.ts'],
      ['validators/isFloat.ts', 'convert/float.ts'],
      ['validators/isJSON.ts', 'convert/json.ts'],
      ['validators/isDate.ts', 'convert/date.ts'],
      ['validators/isAfter.ts', 'convert/date.ts'],
      ['validators/isBefore.ts', 'convert/date.ts'],
      ['validators/isRFC3339.ts', 'convert/date.ts'],
      ['validators/isIdentityCard.ts', 'convert/date.ts'],
      ['validators/isDivisibleBy.ts', 'convert/float.ts'],
    ];
    for (const [validatorFile, convertFile] of delegations) {
      expect({ validatorFile, deps: graph.get(validatorFile) }).toEqual({
        validatorFile,
        deps: expect.arrayContaining([convertFile]),
      });
    }
  });

  it('one file per type: canBe/<type>.ts ↔ convert/<type>.ts, and each canBe delegates to its converter', () => {
    expect(typeFiles('canBe')).toEqual(typeFiles('convert'));
    for (const file of typeFiles('canBe')) {
      expect({ file, deps: graph.get(`canBe/${file}`) }).toEqual({
        file,
        deps: [`convert/${file}`],
      });
    }
  });

  it('each folder index re-exports every type file', () => {
    for (const dir of ['convert', 'canBe']) {
      const deps = graph.get(`${dir}/index.ts`) ?? [];
      for (const file of typeFiles(dir)) expect(deps).toContain(`${dir}/${file}`);
    }
  });

  it('there is no validator-side string coercion helper: validators use convert/string directly', () => {
    expect(graph.has('validators/util/tryToString.ts')).toBe(false);
    const users = importersOf('convert/string.ts').filter((f) => f.startsWith('validators/'));
    expect(users.length).toBeGreaterThan(70);
  });

  it('validators never import canBe/', () => {
    const offenders = [...graph.entries()]
      .filter(([f]) => f.startsWith('validators/'))
      .flatMap(([f, deps]) => deps.filter((d) => d.startsWith('canBe/')).map((d) => `${f} → ${d}`));
    expect(offenders).toEqual([]);
  });

  it('the validators barrel is only imported by the public entry points', () => {
    expect(importersOf('validators/index.ts').sort()).toEqual(['createValidator.ts', 'index.ts']);
  });
});
