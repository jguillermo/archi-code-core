import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');

const ALLOWED_MODULE_DEPENDENCIES: Record<string, readonly string[]> = {
  exceptions: [],
  domain: ['exceptions'],
  application: ['domain', 'exceptions'],
  infrastructure: ['application', 'domain', 'exceptions'],
};

const ALLOWED_PACKAGES = ['@archi-code/validation', 'uuid'];

function listTs(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listTs(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

const SPECIFIER_RE = /(?:^|\n)\s*(?:import|export)\s[^;]*?from\s+['"]([^'"]+)['"]/g;

const rel = (file: string): string => path.relative(SRC, file).split(path.sep).join('/');

const moduleOf = (file: string): string => file.split('/')[0];

function resolveImport(from: string, specifier: string): string {
  const base = path.resolve(path.dirname(from), specifier);
  const found = [`${base}.ts`, path.join(base, 'index.ts')].find((candidate) =>
    fs.existsSync(candidate),
  );
  return found === undefined ? `unresolved:${specifier}` : path.relative(SRC, found);
}

interface Imports {
  readonly relative: string[];
  readonly packages: string[];
}

const files = listTs(SRC);
const imports = new Map<string, Imports>(
  files.map((file) => {
    const specifiers = Array.from(
      fs.readFileSync(file, 'utf8').matchAll(SPECIFIER_RE),
      (m) => m[1],
    );
    return [
      rel(file),
      {
        relative: specifiers
          .filter((specifier) => specifier.startsWith('.'))
          .map((specifier) => resolveImport(file, specifier).split(path.sep).join('/')),
        packages: specifiers.filter((specifier) => !specifier.startsWith('.')),
      },
    ];
  }),
);

function crossModuleImports(): [string, string][] {
  return Array.from(imports.entries()).flatMap(([file, { relative }]) =>
    relative
      .filter((target) => moduleOf(target) !== moduleOf(file))
      .map((target): [string, string] => [file, target]),
  );
}

function findCycles(): string[][] {
  const cycles: string[][] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];
  const visit = (node: string): void => {
    state.set(node, 'visiting');
    stack.push(node);
    for (const dep of imports.get(node)?.relative ?? []) {
      if (state.get(dep) === 'visiting') cycles.push(stack.slice(stack.indexOf(dep)).concat(dep));
      else if (!state.has(dep)) visit(dep);
    }
    stack.pop();
    state.set(node, 'done');
  };
  Array.from(imports.keys()).forEach((node) => {
    if (!state.has(node)) visit(node);
  });
  return cycles;
}

describe('layer boundaries: exceptions ← domain ← application ← infrastructure', () => {
  it('parses every module (sanity check of the parser itself)', () => {
    expect(files.length).toBeGreaterThan(10);
    expect(crossModuleImports().length).toBeGreaterThan(0);
  });

  it('keeps every file inside a module that the package exports as a subpath', () => {
    const modules = Array.from(new Set(Array.from(imports.keys(), moduleOf))).sort();
    expect(modules).toEqual(Object.keys(ALLOWED_MODULE_DEPENDENCIES).sort());
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const subpaths = Object.keys(manifest.exports).filter((key) => key !== './package.json');
    expect(subpaths.sort()).toEqual(modules.map((name) => `./${name}`));
    for (const name of modules) {
      expect(imports.has(`${name}/index.ts`)).toBe(true);
    }
  });

  it('only imports files inside src', () => {
    const outside = Array.from(imports.entries()).flatMap(([file, { relative }]) =>
      relative
        .filter((target) => target.startsWith('..') || target.startsWith('unresolved:'))
        .map((target) => `${file} -> ${target}`),
    );
    expect(outside).toEqual([]);
  });

  it('exceptions depend on nothing, the domain only on exceptions and the application never on infrastructure', () => {
    const forbidden = crossModuleImports()
      .filter(
        ([file, target]) => !ALLOWED_MODULE_DEPENDENCIES[moduleOf(file)].includes(moduleOf(target)),
      )
      .map(([file, target]) => `${file} -> ${target}`);
    expect(forbidden).toEqual([]);
  });

  it('crosses into another module only through its index.ts', () => {
    const deep = crossModuleImports()
      .filter(([, target]) => target !== `${moduleOf(target)}/index.ts`)
      .map(([file, target]) => `${file} -> ${target}`);
    expect(deep).toEqual([]);
  });

  it('imports no package but @archi-code/validation and uuid, and never itself by name', () => {
    const packages = Array.from(imports.entries()).flatMap(([file, { packages: names }]) =>
      names.filter((name) => !ALLOWED_PACKAGES.includes(name)).map((name) => `${file} -> ${name}`),
    );
    expect(packages).toEqual([]);
  });

  it('declares the repository contracts in the domain and the technical ports in the application, as types only', () => {
    const contracts = Array.from(imports.keys()).filter(
      (file) => file.startsWith('domain/repository/') || file.startsWith('application/ports/'),
    );
    expect(contracts.length).toBeGreaterThan(0);
    const withRuntimeCode = contracts.filter((file) =>
      /^export\s+(?!interface\b|type\b)/m.test(fs.readFileSync(path.join(SRC, file), 'utf8')),
    );
    expect(withRuntimeCode).toEqual([]);
  });

  it('a use case never imports another use case nor a listener', () => {
    const coupled = Array.from(imports.entries()).flatMap(([file, { relative }]) =>
      file.startsWith('application/use-case/')
        ? relative
            .filter(
              (target) =>
                (target.startsWith('application/use-case/') && target !== file) ||
                target.startsWith('application/listener/'),
            )
            .map((target) => `${file} -> ${target}`)
        : [],
    );
    expect(coupled).toEqual([]);
  });

  it('has no import cycles', () => {
    expect(findCycles()).toEqual([]);
  });
});
