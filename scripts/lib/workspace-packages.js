'use strict';

const fs = require('fs');
const path = require('path');

function readWorkspacePackages(root) {
  const packagesDir = path.join(root, 'packages');
  return fs
    .readdirSync(packagesDir)
    .filter((dir) => fs.existsSync(path.join(packagesDir, dir, 'package.json')))
    .sort()
    .map((dir) => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(packagesDir, dir, 'package.json'), 'utf8'),
      );
      return { name: packageJson.name, dir: `packages/${dir}`, packageJson };
    });
}

module.exports = { readWorkspacePackages };
