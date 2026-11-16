import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const PACKAGE = path.resolve(__dirname, '../..');
const GUIDES = path.join(PACKAGE, 'ddd-skills/archi-code-ddd');
const SKILL = fs.readFileSync(path.join(PACKAGE, 'SKILL.md'), 'utf8');
const LAYERS = ['domain', 'application', 'infrastructure'] as const;
type Layer = (typeof LAYERS)[number];

interface LayerExports {
  all: Record<Layer, Set<string>>;
  values: Record<Layer, Set<string>>;
}

function exportsOf(): LayerExports {
  const entries = LAYERS.map((layer) => path.join(PACKAGE, 'src', layer, 'index.ts'));
  const program = ts.createProgram(entries, {
    experimentalDecorators: true,
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    noEmit: true,
  });
  const checker = program.getTypeChecker();
  const all = {} as Record<Layer, Set<string>>;
  const values = {} as Record<Layer, Set<string>>;
  LAYERS.forEach((layer, index) => {
    const source = program.getSourceFile(entries[index]);
    const symbol = source && checker.getSymbolAtLocation(source);
    const exported = symbol ? checker.getExportsOfModule(symbol) : [];
    const resolve = (s: ts.Symbol) =>
      s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s;
    all[layer] = new Set(exported.map((s) => s.getName()));
    values[layer] = new Set(
      exported.filter((s) => resolve(s).flags & ts.SymbolFlags.Value).map((s) => s.getName()),
    );
  });
  return { all, values };
}

const { all: EXPORTS, values: VALUE_EXPORTS } = exportsOf();
const ALL_EXPORTS = new Set(LAYERS.flatMap((layer) => Array.from(EXPORTS[layer])));

const guides = fs
  .readdirSync(GUIDES)
  .filter((file) => file.endsWith('.md'))
  .map((file) => ({ file, text: fs.readFileSync(path.join(GUIDES, file), 'utf8') }));

const PACKAGE_IMPORT =
  /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'@archi-code\/ddd\/(domain|application|infrastructure)'/g;

function importedNames(text: string): { layer: Layer; name: string }[] {
  return Array.from(text.matchAll(PACKAGE_IMPORT)).flatMap((match) =>
    match[1]
      .split(',')
      .map(
        (part) =>
          part
            .trim()
            .replace(/^type\s+/, '')
            .split(/\s+as\s+/)[0],
      )
      .filter((name) => name.length > 0)
      .map((name) => ({ layer: match[2] as Layer, name })),
  );
}

function packageToolsTable(): string[] {
  const start = SKILL.indexOf('### Package tools for each need');
  const end = SKILL.indexOf('\n## ', start);
  return SKILL.slice(start, end)
    .split('\n')
    .filter((line) => line.startsWith('| ') && !line.includes('---'))
    .slice(1);
}

describe('the skill names only API the package exports', () => {
  it('reads the exports of every layer', () => {
    for (const layer of LAYERS) {
      expect(EXPORTS[layer].size, layer).toBeGreaterThan(0);
    }
  });

  it('every import of a package layer in a guide names an export of that layer', () => {
    const missing = guides.flatMap(({ file, text }) =>
      importedNames(text)
        .filter(({ layer, name }) => !EXPORTS[layer].has(name))
        .map(({ layer, name }) => `${file}: ${name} from /${layer}`),
    );
    expect(missing).toEqual([]);
  });

  it('imports.md lists every runtime export of every layer under its own subpath', () => {
    const imports = guides.find(({ file }) => file === 'imports.md')?.text ?? '';
    const listed = importedNames(imports);
    for (const layer of LAYERS) {
      const names = new Set(listed.filter((entry) => entry.layer === layer).map((e) => e.name));
      expect(
        Array.from(VALUE_EXPORTS[layer]).filter((name) => !names.has(name)),
        layer,
      ).toEqual([]);
    }
  });

  it('every class of the package tools table of SKILL.md is exported by a layer', () => {
    const rows = packageToolsTable();
    expect(rows.length).toBeGreaterThan(0);
    const named = rows
      .filter((row) => !row.includes('@archi-code/validation'))
      .filter((row) => !row.includes('@archi-code/criteria-adapters'))
      .flatMap((row) => Array.from(row.split('|')[2].matchAll(/`@?([A-Z]\w*)/g), (m) => m[1]));
    expect(named.length).toBeGreaterThan(0);
    expect(named.filter((name) => !ALL_EXPORTS.has(name))).toEqual([]);
  });
});
