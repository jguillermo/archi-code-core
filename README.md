# archi-code-core

Monorepo de paquetes npm `@archi-code/*` para construir aplicaciones TypeScript con patrones de
Domain-Driven Design. Cada paquete se publica por separado, con build dual CommonJS + ES Modules.

## Paquetes

| Paquete                                             | Para qué sirve                                                                     | Documentación                                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [`@archi-code/validation`](packages/validation)     | Validadores `is*`, conversiones `to*`/`canBe*` y decorador `@Validations`          | [README](packages/validation/README.md) · [SKILL.md](packages/validation/SKILL.md)     |
| [`@archi-code/domain`](packages/domain)             | Value objects, agregados, eventos de dominio y excepciones                         | [README](packages/domain/README.md) · [SKILL.md](packages/domain/SKILL.md)             |
| [`@archi-code/criteria`](packages/criteria)         | Criterios de búsqueda: filtros, orden, paginación y conversión a MongoDB           | [README](packages/criteria/README.md) · [SKILL.md](packages/criteria/SKILL.md)         |
| [`@archi-code/crypto-tools`](packages/crypto-tools) | Contraseñas, cifrado, RSA, firmas, hash/HMAC, tokens y JWT en workers (web y Node) | [README](packages/crypto-tools/README.md) · [SKILL.md](packages/crypto-tools/SKILL.md) |
| [`@archi-code/ephemeradb`](packages/ephemeraDB)     | Almacén clave-valor asíncrono en memoria                                           | [README](packages/ephemeraDB/README.md) · [SKILL.md](packages/ephemeraDB/SKILL.md)     |
| [`@archi-code/test`](packages/test)                 | Ayudas de test: `DtoObjectMother`, `JsonCompare` y aserciones de tipos             | [README](packages/test/README.md) · [SKILL.md](packages/test/SKILL.md)                 |

```bash
npm install @archi-code/domain
```

## Skills para asistentes de IA

Cada paquete publica un `SKILL.md`: una skill ligera de Claude Code con las reglas, patrones y errores
comunes del paquete, para que el asistente escriba código correcto con él. Para la API completa remite
al README instalado en `node_modules`, así que sigue valiendo al actualizar el paquete. Para instalar
la de un paquete en tu proyecto:

```bash
mkdir -p .claude/skills/archi-code-domain && cp node_modules/@archi-code/domain/SKILL.md .claude/skills/archi-code-domain/SKILL.md
```

Cambia `domain` por el paquete que uses. La skill se invoca con `/archi-code-<paquete>` o Claude la
carga sola cuando la tarea la necesita.

El README de cada paquete tiene, en "Skill para asistentes de IA", ejemplos de peticiones para usarla
y cómo mantenerla al día.

## Licencia

MIT
