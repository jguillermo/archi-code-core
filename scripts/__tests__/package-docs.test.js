import { createRequire } from 'node:module';
import { describe, expect, test } from 'vitest';

const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  packageDocsErrors,
  packedDocsErrors,
  skillErrors,
  skillName,
} = require('../lib/package-docs');

const NAME = '@archi-code/domain';
const SKILL = [
  '---',
  'name: archi-code-domain',
  'description: Use @archi-code/domain for value objects.',
  '---',
  '',
  '# archi-code-domain',
  '',
].join('\n');

function packageDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'package-docs-'));
  for (const [file, content] of Object.entries(files))
    fs.writeFileSync(path.join(dir, file), content);
  return dir;
}

describe('skillName', () => {
  test('prefixes the unscoped package name with archi-code-', () => {
    expect(skillName(NAME)).toBe('archi-code-domain');
    expect(skillName('@archi-code/ephemeradb')).toBe('archi-code-ephemeradb');
  });
});

describe('skillErrors', () => {
  test('accepts a frontmatter with name and description followed by instructions', () => {
    expect(skillErrors(SKILL, NAME)).toStrictEqual([]);
  });

  test('accepts a folded description spread over indented lines', () => {
    const folded = SKILL.replace(
      'description: Use @archi-code/domain for value objects.',
      'description: >\n  Use @archi-code/domain\n  for value objects.',
    );
    expect(skillErrors(folded, NAME)).toStrictEqual([]);
  });

  test('refuses a file without frontmatter', () => {
    expect(skillErrors('# archi-code-domain\n', NAME)[0]).toMatch(
      /must start with a YAML frontmatter/,
    );
    expect(skillErrors('---\nname: x\n', NAME)[0]).toMatch(/must start with a YAML frontmatter/);
  });

  test('refuses a frontmatter line that is not a key nor a continuation', () => {
    expect(skillErrors(SKILL.replace('---\nname', '---\n- name'), NAME)[0]).toMatch(/frontmatter/);
  });

  test('refuses a name that does not match the package', () => {
    expect(skillErrors(SKILL.replace('archi-code-domain\n', 'domain\n'), NAME)).toStrictEqual([
      'SKILL.md name is "domain", expected "archi-code-domain"',
    ]);
  });

  test('refuses missing, extra or empty keys', () => {
    const extra = SKILL.replace('---\n\n', 'license: MIT\n---\n\n');
    expect(skillErrors(extra, NAME)).toStrictEqual([
      'SKILL.md frontmatter keys are [name, description, license], expected [name, description]',
    ]);
    const empty = SKILL.replace(/description: .*/, 'description: >');
    expect(skillErrors(empty, NAME)).toStrictEqual(['SKILL.md description is empty']);
  });

  test('refuses a description longer than the 1024 characters Claude Code loads', () => {
    const atLimit = SKILL.replace(/description: .*/, `description: ${'a'.repeat(1024)}`);
    expect(skillErrors(atLimit, NAME)).toStrictEqual([]);
    const tooLong = SKILL.replace(/description: .*/, `description: ${'a'.repeat(1025)}`);
    expect(skillErrors(tooLong, NAME)).toStrictEqual([
      'SKILL.md description is 1025 characters, the limit is 1024',
    ]);
  });

  test('refuses a skill without instructions', () => {
    expect(skillErrors(SKILL.split('\n').slice(0, 4).join('\n'), NAME)).toStrictEqual([
      'SKILL.md has no instructions after the frontmatter',
    ]);
  });
});

describe('packageDocsErrors', () => {
  const manifest = { name: NAME, files: ['dist/', 'SKILL.md'] };

  test('passes with SKILL.md in files, a README that mentions it and a valid skill', () => {
    const dir = packageDir({ 'README.md': 'Copy SKILL.md', 'SKILL.md': SKILL });
    expect(packageDocsErrors(dir, manifest)).toStrictEqual([]);
  });

  test('reports every missing piece', () => {
    const dir = packageDir({});
    expect(packageDocsErrors(dir, { name: NAME, files: ['dist/'] })).toStrictEqual([
      'package.json "files" must include "SKILL.md"',
      'README.md is missing',
      'SKILL.md is missing',
    ]);
    expect(packageDocsErrors(dir, { name: NAME }).slice(0, 1)).toStrictEqual([
      'package.json "files" must include "SKILL.md"',
    ]);
  });

  test('requires the README to explain the skill and the skill to be valid', () => {
    const dir = packageDir({ 'README.md': '# domain', 'SKILL.md': '# domain' });
    expect(packageDocsErrors(dir, manifest)).toStrictEqual([
      'README.md must explain how to install SKILL.md',
      'SKILL.md must start with a YAML frontmatter between "---" lines',
    ]);
  });
});

describe('packedDocsErrors', () => {
  test('passes when the tarball carries package.json, README.md, LICENSE and SKILL.md', () => {
    const packed = ['LICENSE', 'README.md', 'SKILL.md', 'dist/cjs/index.js', 'package.json'];
    expect(packedDocsErrors(packed)).toStrictEqual([]);
  });

  test('names each documentation file left out of the tarball', () => {
    expect(packedDocsErrors(['package.json', 'dist/cjs/index.js'])).toStrictEqual([
      'README.md is not in the packed tarball',
      'LICENSE is not in the packed tarball',
      'SKILL.md is not in the packed tarball',
    ]);
  });
});
