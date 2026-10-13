# archi-code-core

Monorepo of the `@archi-code/*` npm packages for building TypeScript applications with
Domain-Driven Design patterns. Each package is published on its own, with a dual CommonJS + ES
Modules build.

## Packages

| Package                                             | What it is for                                                                              | Documentation                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [`@archi-code/validation`](packages/validation)     | `is*` validators, `to*`/`canBe*` conversions and the `@Validations` decorator               | [README](packages/validation/README.md) · [SKILL.md](packages/validation/SKILL.md)     |
| [`@archi-code/domain`](packages/domain)             | Value objects, aggregates, domain events and exceptions                                     | [README](packages/domain/README.md) · [SKILL.md](packages/domain/SKILL.md)             |
| [`@archi-code/criteria`](packages/criteria)         | Search criteria: filters, ordering, pagination and MongoDB conversion                       | [README](packages/criteria/README.md) · [SKILL.md](packages/criteria/SKILL.md)         |
| [`@archi-code/crypto-tools`](packages/crypto-tools) | Passwords, encryption, RSA, signatures, hash/HMAC, tokens and JWT in workers (web and Node) | [README](packages/crypto-tools/README.md) · [SKILL.md](packages/crypto-tools/SKILL.md) |
| [`@archi-code/ephemeradb`](packages/ephemeraDB)     | Asynchronous in-memory key-value store                                                      | [README](packages/ephemeraDB/README.md) · [SKILL.md](packages/ephemeraDB/SKILL.md)     |
| [`@archi-code/test`](packages/test)                 | Test helpers: `DtoObjectMother`, `JsonCompare` and type assertions                          | [README](packages/test/README.md) · [SKILL.md](packages/test/SKILL.md)                 |

```bash
npm install @archi-code/domain
```

## AI assistant skills

Every package ships a `SKILL.md`: a light Claude Code skill with the package rules, patterns and
common mistakes, so the assistant writes correct code with it. For the full API it points to the
README installed in `node_modules`, so it stays valid when the package is updated. To install the
skill of a package in your project:

```bash
mkdir -p .claude/skills/archi-code-domain && cp node_modules/@archi-code/domain/SKILL.md .claude/skills/archi-code-domain/SKILL.md
```

Replace `domain` with the package you use. The skill is invoked with `/archi-code-<package>` or
Claude loads it on its own when the task needs it.

The README of each package shows, under "AI assistant skill", example requests that use it and how
to keep it up to date.

## License

MIT
