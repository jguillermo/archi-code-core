#!/usr/bin/env node
'use strict';

/**
 * Topological sort (DFS) for a list of packages with internalDeps.
 * Returns packages ordered so every dependency comes before its dependents.
 * Throws on circular dependencies.
 *
 * @param {{ name: string, internalDeps: string[] }[]} packages
 * @returns {{ name: string, internalDeps: string[] }[]}
 */
function topoSort(packages) {
  const byName = Object.fromEntries(packages.map((p) => [p.name, p]));
  const visited = new Set();
  const inStack = new Set();
  const result = [];

  function visit(pkg) {
    if (visited.has(pkg.name)) return;
    if (inStack.has(pkg.name)) {
      throw new Error(`Circular dependency detected: ${pkg.name}`);
    }
    inStack.add(pkg.name);
    for (const dep of pkg.internalDeps) {
      if (byName[dep]) visit(byName[dep]);
    }
    inStack.delete(pkg.name);
    visited.add(pkg.name);
    result.push(pkg);
  }

  for (const pkg of packages) visit(pkg);
  return result;
}

module.exports = { topoSort };
