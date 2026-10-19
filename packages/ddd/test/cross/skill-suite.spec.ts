import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const PACKAGE = path.resolve(__dirname, '../..');
const SUITE = path.join(PACKAGE, 'ddd-skills');
const SKILL = fs.readFileSync(path.join(PACKAGE, 'SKILL.md'), 'utf8');
const BOOK_CONVENTION_MARK = '[Fuera de los libros: convención de @archi-code/ddd]';
const NAMES_THAT_ARE_NOT_SUITE_SKILLS = ['ddd-skills'];
const PACKAGE_GUIDES = 'archi-code-ddd';
const ORCHESTRATOR = 'ddd-orquestador';
const PACKAGE_GUIDES_DIR = path.join(SUITE, PACKAGE_GUIDES);

const suiteSkills = fs
  .readdirSync(SUITE, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== PACKAGE_GUIDES)
  .map((entry) => entry.name)
  .sort();

const packageGuides = fs
  .readdirSync(PACKAGE_GUIDES_DIR)
  .filter((file) => file.endsWith('.md'))
  .sort();

function filesOf(skillDir: string): string[] {
  return fs
    .readdirSync(path.join(SUITE, skillDir), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .map((entry) =>
      path.relative(path.join(SUITE, skillDir), path.join(entry.parentPath, entry.name)),
    )
    .sort();
}

function markdownOf(skillDir: string): string[] {
  return filesOf(skillDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => fs.readFileSync(path.join(SUITE, skillDir, file), 'utf8'));
}

const SUITE_PATH = /(?<![\w/.-])((?:references|assets|scripts)\/[\w.-]+(?:\/[\w.-]+)*)/g;

function prefixedPathsOf(text: string, skillDir: string): string[] {
  const prefixed = new RegExp(
    `(?<![\\w/.-])ddd-skills/${skillDir}/((?:references|assets|scripts)/[\\w.-]+(?:/[\\w.-]+)*)`,
    'g',
  );
  return Array.from(text.matchAll(prefixed), (m) => m[1].replace(/\.+$/, ''));
}

function citedPaths(skillDir: string): string[] {
  const relative = markdownOf(skillDir).flatMap((text) =>
    Array.from(text.matchAll(SUITE_PATH), (m) => m[1].replace(/\.+$/, '')),
  );
  const prefixed = [...suiteSkills, PACKAGE_GUIDES]
    .flatMap((dir) => markdownOf(dir))
    .flatMap((text) => prefixedPathsOf(text, skillDir));
  return Array.from(new Set([...relative, ...prefixed]));
}

function localReferences(skillDir: string): string[] {
  const text = fs.readFileSync(path.join(SUITE, skillDir, 'GUIA.md'), 'utf8');
  return Array.from(
    text.matchAll(
      new RegExp(`\`(?:ddd-skills/${skillDir}/)?((?:references|assets|scripts)/[^\`\\s]+)\``, 'g'),
    ),
    (m) => m[1],
  );
}

describe('the DDD skill suite is reached only through SKILL.md', () => {
  it('ships the suite in the package', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(PACKAGE, 'package.json'), 'utf8'));
    expect(packageJson.files).toContain('ddd-skills/');
  });

  it('every suite guide has its GUIA.md and SKILL.md routes to every one of them', () => {
    expect(suiteSkills.length).toBeGreaterThan(0);
    for (const skill of suiteSkills) {
      expect(fs.existsSync(path.join(SUITE, skill, 'GUIA.md')), skill).toBe(true);
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

  it('no suite guide can be loaded as a skill of its own: none has a frontmatter', () => {
    const withFrontmatter = suiteSkills.filter((skill) =>
      fs.readFileSync(path.join(SUITE, skill, 'GUIA.md'), 'utf8').startsWith('---'),
    );
    expect(withFrontmatter).toEqual([]);
  });

  it('every suite guide tells the assistant it is read only through archi-code-ddd', () => {
    const silent = suiteSkills.filter(
      (skill) =>
        !fs
          .readFileSync(path.join(SUITE, skill, 'GUIA.md'), 'utf8')
          .includes('Parte del skill `archi-code-ddd`'),
    );
    expect(silent).toEqual([]);
  });

  it('every guide but the orchestrator opens with its box of divergences from the books', () => {
    const withoutBox = suiteSkills
      .filter((skill) => skill !== ORCHESTRATOR)
      .filter(
        (skill) =>
          !fs
            .readFileSync(path.join(SUITE, skill, 'GUIA.md'), 'utf8')
            .includes(`## Con @archi-code/ddd\n\n${BOOK_CONVENTION_MARK}`),
      );
    expect(withoutBox).toEqual([]);
  });

  it('every path a guide, reference or template of the suite cites exists in its skill', () => {
    const missing = suiteSkills.flatMap((skill) =>
      citedPaths(skill)
        .filter((cited) => !fs.existsSync(path.join(SUITE, skill, cited)))
        .map((cited) => `${skill}/${cited}`),
    );
    expect(missing).toEqual([]);
  });

  it('every ddd-* skill a suite file mentions is a folder of the suite', () => {
    const unknown = suiteSkills.flatMap((skill) =>
      markdownOf(skill).flatMap((text) =>
        Array.from(text.matchAll(/\bddd-[a-z]+(?:-[a-z]+)*/g), (m) => m[0])
          .filter((name) => !suiteSkills.includes(name))
          .filter((name) => !NAMES_THAT_ARE_NOT_SUITE_SKILLS.includes(name))
          .map((name) => `${skill}: ${name}`),
      ),
    );
    expect(unknown).toEqual([]);
  });

  it('every reference, template and script of the suite is cited by some guide', () => {
    const orphans = suiteSkills.flatMap((skill) => {
      const cited = new Set(citedPaths(skill));
      return filesOf(skill)
        .filter((file) => file !== 'GUIA.md' && !cited.has(file.split(path.sep).join('/')))
        .map((file) => `${skill}/${file}`);
    });
    expect(orphans).toEqual([]);
  });

  it('SKILL.md sends the assistant to the rule sheet and marks where the package leaves the books', () => {
    expect(SKILL).toContain('references/chuleta-reglas.md');
    expect(SKILL).toContain(BOOK_CONVENTION_MARK);
  });

  it('the dependency-cruiser rules accept the package modules and keep composition.ts out of the layers', () => {
    const config = createRequire(__filename)(
      path.join(SUITE, 'ddd-arquitectura/assets/dependency-cruiser.cjs'),
    );
    expect(Array.isArray(config.forbidden)).toBe(true);
    const rules = config.forbidden.map((rule: unknown) => JSON.stringify(rule));
    expect(rules.some((rule: string) => rule.includes('@archi-code'))).toBe(true);
    expect(rules.some((rule: string) => rule.includes('composition'))).toBe(true);
    expect(config.options.tsPreCompilationDeps).toBe(true);
    expect(config.options.enhancedResolveOptions.exportsFields).toEqual(['exports']);
    expect(config.options.enhancedResolveOptions.conditionNames).toEqual(
      expect.arrayContaining(['import', 'require']),
    );
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

describe('the rules and patterns of the package are part of SKILL.md, split in ddd-skills/archi-code-ddd', () => {
  it('SKILL.md links every guide and only guides that exist', () => {
    expect(packageGuides.length).toBeGreaterThan(0);
    const linked = Array.from(SKILL.matchAll(/`([a-z-]+\.md)`/g), (m) => m[1]);
    expect(packageGuides.filter((guide) => !linked.includes(guide))).toEqual([]);
    expect(linked.filter((guide) => !packageGuides.includes(guide))).toEqual([]);
  });

  it('no guide can be loaded as a skill of its own and each one points to archi-code-ddd', () => {
    for (const guide of packageGuides) {
      const text = fs.readFileSync(path.join(PACKAGE_GUIDES_DIR, guide), 'utf8');
      expect(text.startsWith('# '), guide).toBe(true);
      expect(text, guide).toContain('Part of the `archi-code-ddd` skill');
    }
  });

  it('every suite path a guide cites exists', () => {
    const missing = packageGuides.flatMap((guide) => {
      const text = fs.readFileSync(path.join(PACKAGE_GUIDES_DIR, guide), 'utf8');
      return Array.from(
        text.matchAll(/`(?:ddd-skills\/)?((?:ddd-[a-z-]+|archi-code-ddd)\/[^`\s]+)`/g),
        (m) => m[1],
      )
        .filter((cited) => !fs.existsSync(path.join(SUITE, cited)))
        .map((cited) => `${guide}: ${cited}`);
    });
    expect(missing).toEqual([]);
  });
});
