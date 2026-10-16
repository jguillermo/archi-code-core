import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const require = createRequire(import.meta.url);
const { readWorkspacePackages } = require('../lib/workspace-packages');

const ROOT = path.join(import.meta.dirname, '..', '..');
const root = require(path.join(ROOT, 'package.json'));

function internalDeps(packageJson) {
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.peerDependencies,
  };
  return Object.keys(deps).filter((name) => name.startsWith('@archi-code/'));
}

describe('root workspaces', () => {
  test('list every package folder exactly once', () => {
    const folders = readWorkspacePackages(ROOT).map((pkg) => pkg.dir);
    expect([...root.workspaces].sort()).toStrictEqual(folders);
  });

  test('declare no devDependencies: every dev tool lives in the root package.json', () => {
    const withDevDependencies = readWorkspacePackages(ROOT)
      .filter((pkg) => Object.keys(pkg.packageJson.devDependencies ?? {}).length)
      .map((pkg) => pkg.name);
    expect(withDevDependencies).toStrictEqual([]);
  });

  test('come in dependency order, so npm run build -ws builds each package after its deps', () => {
    const byDir = new Map(readWorkspacePackages(ROOT).map((pkg) => [pkg.dir, pkg]));
    const built = new Set();
    for (const dir of root.workspaces) {
      const pkg = byDir.get(dir);
      expect(
        internalDeps(pkg.packageJson).filter((dep) => !built.has(dep)),
        `${pkg.name} is listed before its internal deps`,
      ).toStrictEqual([]);
      built.add(pkg.name);
    }
  });
});
