import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const PACKAGE = path.resolve(__dirname, '../..');
const SUITE = path.join(PACKAGE, 'ddd-skills');
const SKILL = fs.readFileSync(path.join(PACKAGE, 'SKILL.md'), 'utf8');

const suiteSkills = fs
  .readdirSync(SUITE, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

function localReferences(skillDir: string): string[] {
  const text = fs.readFileSync(path.join(SUITE, skillDir, 'SKILL.md'), 'utf8');
  return Array.from(text.matchAll(/`((?:references|assets|scripts)\/[^`\s]+)`/g), (m) => m[1]);
}

describe('the DDD skill suite is reached only through SKILL.md', () => {
  it('ships the suite in the package', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(PACKAGE, 'package.json'), 'utf8'));
    expect(packageJson.files).toContain('ddd-skills/');
  });

  it('every suite skill has its SKILL.md and SKILL.md routes to every one of them', () => {
    expect(suiteSkills.length).toBeGreaterThan(0);
    for (const skill of suiteSkills) {
      expect(fs.existsSync(path.join(SUITE, skill, 'SKILL.md')), skill).toBe(true);
      expect(SKILL, `SKILL.md does not route to ${skill}`).toContain(`\`${skill}\``);
    }
  });

  it('routes only to suite skills that exist', () => {
    const routed = Array.from(SKILL.matchAll(/`(ddd-[a-z-]+)`/g), (m) => m[1]);
    expect(routed.filter((name) => !suiteSkills.includes(name))).toEqual([]);
  });

  it('every reference a suite skill points to exists', () => {
    const missing = suiteSkills.flatMap((skill) =>
      localReferences(skill)
        .filter((reference) => !fs.existsSync(path.join(SUITE, skill, reference)))
        .map((reference) => `${skill}/${reference}`),
    );
    expect(missing).toEqual([]);
  });

  it('tells the assistant never to install the suite as separate skills', () => {
    expect(SKILL).toContain('only skill to load');
    expect(SKILL).toContain('never copy the suite into `.claude/skills/`');
  });

  it('is pure DDD: it cites books, never the internal document codes of a company', () => {
    const files = fs
      .readdirSync(SUITE, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
      .map((entry) => path.join(entry.parentPath, entry.name));
    const internalDocumentCode = /\b[A-Z]{2,5}(?:-[A-Z]{2,5}){1,2}-\d{3}\b/;
    const offending = files.filter((file) =>
      internalDocumentCode.test(fs.readFileSync(file, 'utf8')),
    );
    expect(offending.map((file) => path.relative(SUITE, file))).toEqual([]);
  });
});
