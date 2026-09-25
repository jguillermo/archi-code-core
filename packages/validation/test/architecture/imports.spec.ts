/**
 * Architecture guard — "break cycles by structure, not by discipline".
 *
 * Parses every `import … from '…'` / `export … from '…'` in `src/**` and asserts:
 *  1. the import graph has NO cycles;
 *  2. the layering rules between the three tools hold:
 *
 *     core/coerce.ts         ← imports nothing
 *     validators/**          ← never imports convert/ or canBe/
 *     convert/<type>.ts      ← the only place with type rules; never imports canBe/
 *     canBe/<type>.ts        ← built on convert/<type>.ts (canBeX(v) = toX(v)[0])
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

  it('has no import cycles', () => {
    expect(findCycles().map((c) => c.join(' → '))).toEqual([]);
  });

  it('core/coerce.ts is a leaf (imports nothing)', () => {
    expect(graph.get('core/coerce.ts')).toEqual([]);
  });

  const inDir = (dir: string): string[] => [...graph.keys()].filter((f) => f.startsWith(`${dir}/`));
  const typeFiles = (dir: string): string[] =>
    inDir(dir)
      .map((f) => f.slice(dir.length + 1))
      .filter((f) => f !== 'index.ts' && f !== 'result.ts')
      .sort();

  it('convert/ never depends on canBe/ (canBe is built on convert, not the reverse)', () => {
    const offenders = inDir('convert').flatMap((f) =>
      (graph.get(f) ?? []).filter((d) => d.startsWith('canBe/')).map((d) => `${f} → ${d}`),
    );
    expect(offenders).toEqual([]);
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

  it('validators never import convert/ or canBe/', () => {
    const offenders = [...graph.entries()]
      .filter(([f]) => f.startsWith('validators/'))
      .flatMap(([f, deps]) =>
        deps
          .filter((d) => d.startsWith('convert/') || d.startsWith('canBe/'))
          .map((d) => `${f} → ${d}`),
      );
    expect(offenders).toEqual([]);
  });

  it('the validators barrel is only imported by the public entry points', () => {
    expect(importersOf('validators/index.ts').sort()).toEqual(['createValidator.ts', 'index.ts']);
  });
});
