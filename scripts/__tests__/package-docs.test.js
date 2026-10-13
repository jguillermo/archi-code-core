'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
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
  'description: Usa @archi-code/domain para value objects.',
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
    assert.equal(skillName(NAME), 'archi-code-domain');
    assert.equal(skillName('@archi-code/ephemeradb'), 'archi-code-ephemeradb');
  });
});

describe('skillErrors', () => {
  test('accepts a frontmatter with name and description followed by instructions', () => {
    assert.deepEqual(skillErrors(SKILL, NAME), []);
  });

  test('accepts a folded description spread over indented lines', () => {
    const folded = SKILL.replace(
      'description: Usa @archi-code/domain para value objects.',
      'description: >\n  Usa @archi-code/domain\n  para value objects.',
    );
    assert.deepEqual(skillErrors(folded, NAME), []);
  });

  test('refuses a file without frontmatter', () => {
    assert.match(
      skillErrors('# archi-code-domain\n', NAME)[0],
      /must start with a YAML frontmatter/,
    );
    assert.match(skillErrors('---\nname: x\n', NAME)[0], /must start with a YAML frontmatter/);
  });

  test('refuses a frontmatter line that is not a key nor a continuation', () => {
    assert.match(skillErrors(SKILL.replace('---\nname', '---\n- name'), NAME)[0], /frontmatter/);
  });

  test('refuses a name that does not match the package', () => {
    assert.deepEqual(skillErrors(SKILL.replace('archi-code-domain\n', 'domain\n'), NAME), [
      'SKILL.md name is "domain", expected "archi-code-domain"',
    ]);
  });

  test('refuses missing, extra or empty keys', () => {
    const extra = SKILL.replace('---\n\n', 'license: MIT\n---\n\n');
    assert.deepEqual(skillErrors(extra, NAME), [
      'SKILL.md frontmatter keys are [name, description, license], expected [name, description]',
    ]);
    const empty = SKILL.replace(/description: .*/, 'description: >');
    assert.deepEqual(skillErrors(empty, NAME), ['SKILL.md description is empty']);
  });

  test('refuses a skill without instructions', () => {
    assert.deepEqual(skillErrors(SKILL.split('\n').slice(0, 4).join('\n'), NAME), [
      'SKILL.md has no instructions after the frontmatter',
    ]);
  });
});

describe('packageDocsErrors', () => {
  const manifest = { name: NAME, files: ['dist/', 'SKILL.md'] };

  test('passes with SKILL.md in files, a README that mentions it and a valid skill', () => {
    const dir = packageDir({ 'README.md': 'Copia SKILL.md', 'SKILL.md': SKILL });
    assert.deepEqual(packageDocsErrors(dir, manifest), []);
  });

  test('reports every missing piece', () => {
    const dir = packageDir({});
    assert.deepEqual(packageDocsErrors(dir, { name: NAME, files: ['dist/'] }), [
      'package.json "files" must include "SKILL.md"',
      'README.md is missing',
      'SKILL.md is missing',
    ]);
    assert.deepEqual(packageDocsErrors(dir, { name: NAME }).slice(0, 1), [
      'package.json "files" must include "SKILL.md"',
    ]);
  });

  test('requires the README to explain the skill and the skill to be valid', () => {
    const dir = packageDir({ 'README.md': '# domain', 'SKILL.md': '# domain' });
    assert.deepEqual(packageDocsErrors(dir, manifest), [
      'README.md must explain how to install SKILL.md',
      'SKILL.md must start with a YAML frontmatter between "---" lines',
    ]);
  });
});

describe('packedDocsErrors', () => {
  test('passes when the tarball carries package.json, README.md, LICENSE and SKILL.md', () => {
    const packed = ['LICENSE', 'README.md', 'SKILL.md', 'dist/cjs/index.js', 'package.json'];
    assert.deepEqual(packedDocsErrors(packed), []);
  });

  test('names each documentation file left out of the tarball', () => {
    assert.deepEqual(packedDocsErrors(['package.json', 'dist/cjs/index.js']), [
      'README.md is not in the packed tarball',
      'LICENSE is not in the packed tarball',
      'SKILL.md is not in the packed tarball',
    ]);
  });
});
