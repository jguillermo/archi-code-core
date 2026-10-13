#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');

// The npm wrapper downloads the checker binary from GitHub; "latest" broke CI when v4 renamed the
// release assets, so the binary version is pinned here for the root and every package.
const EC_VERSION = 'v4.0.2';
const EXCLUDES = ['node_modules', 'dist', '.git', 'target', '\\.generated\\.ts$'];

const result = spawnSync(
  'editorconfig-checker',
  [...EXCLUDES.flatMap((pattern) => ['--exclude', pattern]), ...process.argv.slice(2)],
  { stdio: 'inherit', env: { ...process.env, EC_VERSION } },
);

if (result.error) {
  console.error(`editorconfig: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
