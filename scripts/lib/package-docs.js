'use strict';

const fs = require('fs');
const path = require('path');

const SCOPE = '@archi-code/';
const SKILL_FILE = 'SKILL.md';
const SKILL_KEYS = ['name', 'description'];
const MAX_DESCRIPTION_LENGTH = 1024;
const PACKED_DOCS = ['package.json', 'README.md', 'LICENSE', SKILL_FILE];

function skillName(packageName) {
  return `archi-code-${packageName.slice(SCOPE.length)}`;
}

function frontmatter(text) {
  const lines = text.split('\n');
  if (lines[0] !== '---') return null;
  const end = lines.indexOf('---', 1);
  if (end === -1) return null;
  const fields = {};
  let current = null;
  for (const line of lines.slice(1, end)) {
    const key = /^([A-Za-z][\w-]*):(.*)$/.exec(line);
    if (key) {
      current = key[1];
      fields[current] = key[2].trim();
    } else if (current && /^\s/.test(line)) {
      fields[current] = `${fields[current]} ${line.trim()}`.trim();
    } else if (line.trim()) {
      return null;
    }
  }
  return { fields, body: lines.slice(end + 1).join('\n') };
}

function skillErrors(text, packageName) {
  const parsed = frontmatter(text);
  if (!parsed) return [`${SKILL_FILE} must start with a YAML frontmatter between "---" lines`];
  const { fields, body } = parsed;
  const errors = [];
  const keys = Object.keys(fields);
  if (keys.join() !== SKILL_KEYS.join()) {
    errors.push(
      `${SKILL_FILE} frontmatter keys are [${keys.join(', ')}], expected [name, description]`,
    );
  }
  const expected = skillName(packageName);
  if (fields.name !== expected) {
    errors.push(`${SKILL_FILE} name is "${fields.name ?? ''}", expected "${expected}"`);
  }
  if (!fields.description || /^[>|][-+]?$/.test(fields.description)) {
    errors.push(`${SKILL_FILE} description is empty`);
  }
  if (fields.description && fields.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(
      `${SKILL_FILE} description is ${fields.description.length} characters, the limit is ${MAX_DESCRIPTION_LENGTH}`,
    );
  }
  if (!body.trim()) errors.push(`${SKILL_FILE} has no instructions after the frontmatter`);
  return errors;
}

function packageDocsErrors(dir, packageJson) {
  const errors = [];
  if (!(packageJson.files ?? []).includes(SKILL_FILE)) {
    errors.push(`package.json "files" must include "${SKILL_FILE}"`);
  }
  const readme = path.join(dir, 'README.md');
  if (!fs.existsSync(readme)) errors.push('README.md is missing');
  else if (!fs.readFileSync(readme, 'utf8').includes(SKILL_FILE)) {
    errors.push(`README.md must explain how to install ${SKILL_FILE}`);
  }
  const skill = path.join(dir, SKILL_FILE);
  if (!fs.existsSync(skill)) errors.push(`${SKILL_FILE} is missing`);
  else errors.push(...skillErrors(fs.readFileSync(skill, 'utf8'), packageJson.name));
  return errors;
}

function packedDocsErrors(packedPaths) {
  return PACKED_DOCS.filter((file) => !packedPaths.includes(file)).map(
    (file) => `${file} is not in the packed tarball`,
  );
}

module.exports = { packageDocsErrors, packedDocsErrors, skillErrors, skillName };
