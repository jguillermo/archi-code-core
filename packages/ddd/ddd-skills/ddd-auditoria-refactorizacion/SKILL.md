---
name: ddd-auditoria-refactorizacion
description: Auditar un proyecto existente contra las reglas de DDD y planificar su refactorización incremental. Incluye un script que escanea un repositorio TypeScript en busca de síntomas (dominio que importa frameworks u ORM, setters y campos públicos, servicios gigantes, repositorios de partes internas, importaciones entre contextos, transacciones con varios agregados), una lista de comprobación estratégica y táctica con severidad, un informe con formato fijo y un plan de migración por pasos (tests de caracterización, capa anticorrupción, extracción de contextos y agregados, estrangulamiento del legado). Úsalo SIEMPRE que alguien pida revisar, auditar, evaluar o "pasar a DDD" un código existente, modernizar un monolito, sacar un servicio de un sistema heredado, o pregunte "¿está bien hecho este DDD?", aunque solo pegue unos ficheros.
---

# Auditoría y refactorización con DDD

No puedes cambiar todo el software mal diseñado de una vez; puedes hacer bien tu parte e integrarte con el resto [IDDD cap. 2]. Este skill convierte esa idea en un procedimiento: medir, priorizar por valor de negocio y cambiar por pasos seguros.

## Convenciones de la suite DDD

* **Trazabilidad.** Cada regla indica su origen: `[Destilado cap. N]`, `[IDDD cap. N]`, `[PHP: capítulo]`. Lo que no sale de esos libros va marcado `[Fuera de los libros]`. Respeta estas marcas al responder.
* **Idioma.** Responde en el idioma de la persona. El código de ejemplo es TypeScript.
* **Honestidad del modelo.** Un hallazgo del script es un indicio, no una sentencia. Cada hallazgo se confirma leyendo el código.

## Paso 0. Alcance y prioridad

Pregunta, o deduce y declara: qué parte del sistema importa más al negocio (candidata a Core Domain) y qué duele hoy (errores, lentitud de cambios, conflictos). La auditoría se ordena por ahí; refactorizar un subdominio genérico rara vez compensa [Destilado cap. 3].

## Paso 1. Escaneo automático

Si tienes acceso al repositorio:

```bash
python3 scripts/scan_ddd_smells.py <ruta-del-repo> --json informe-escaneo.json
```

El script es heurístico y solo lee ficheros. Detecta los síntomas de `references/lista-comprobacion.md` que se pueden ver con patrones de texto. Lo que no detecta (lenguaje, invariantes, límites de contexto) se revisa a mano en el paso 2.

Si solo tienes fragmentos pegados, aplica la misma lista leyendo el código.

## Paso 2. Revisión manual

Recorre `references/lista-comprobacion.md` en este orden. El estratégico va primero porque un problema de límites invalida mejoras tácticas:

1. **Estratégico:** subdominios lógicos dentro del sistema, términos con varios significados, contextos implícitos, integraciones por base de datos, equipos compartiendo modelo.
2. **Arquitectura:** dependencias del dominio, dónde están las transacciones, qué expone la API.
3. **Táctico:** modelo anémico (prueba de salud de IDDD), agregados grandes, referencias directas entre agregados, setters, primitivos, repositorios de partes, servicios gordos, eventos ausentes o mal nombrados.

Para modelo anémico usa las dos preguntas de IDDD: ¿el "modelo de dominio" son sobre todo getters y setters sin lógica de negocio? ¿Los componentes que lo usan contienen la mayor parte de la lógica? Dos "sí" indican anemia [IDDD cap. 1, reformulado].

## Paso 3. Informe

Formato fijo en `assets/plantilla-informe.md`: contexto y alcance, mapa de subdominios lógicos encontrados, hallazgos con evidencia (fichero y línea) y severidad, riesgos de negocio, plan por fases y deuda de modelo aceptada.

Severidad `[Fuera de los libros]`:

| Nivel | Criterio |
|---|---|
| Crítica | Corrompe datos o reglas de negocio hoy (invariantes sin proteger, varios agregados en una transacción con conflictos, eventos que se pierden) |
| Alta | Impide cambiar el Core Domain con seguridad (lenguaje mezclado, dominio acoplado al ORM, lógica en controladores) |
| Media | Encarece el cambio (primitivos, setters, repositorios de partes) |
| Baja | Estilo y nomenclatura |

## Paso 4. Plan de refactorización

Secuencia y técnicas en `references/plan-migracion.md`. Principios:

* **Primero red de seguridad:** tests de caracterización sobre el comportamiento actual antes de mover nada `[Fuera de los libros]`.
* **Proteger antes de reconstruir:** una capa anticorrupción entre el código nuevo y el heredado, para no hablar su lenguaje [Destilado cap. 4].
* **Del Core hacia fuera:** el primer contexto que se extrae es el que más valor da.
* **Pasos pequeños y desplegables.** Lo que no se pueda arreglar en el tiempo disponible se anota como deuda de modelo y se planifica [Destilado cap. 7].
* **No reescribir de golpe.** El estrangulamiento progresivo (strangler fig) y los contextos burbuja (bubble context, Evans) permiten convivir con el legado `[Fuera de los libros]`.

## Cómo usar los demás skills

| Hallazgo | Skill para resolverlo |
|---|---|
| Lenguaje mezclado, no se sabe qué es núcleo | `ddd-descubrimiento-dominio`, `ddd-subdominios-bounded-contexts` |
| Integraciones frágiles, modelo ajeno filtrado | `ddd-context-mapping` |
| Dominio acoplado a frameworks | `ddd-arquitectura` |
| Primitivos, setters, identidades | `ddd-value-objects-entidades` |
| Agregados grandes o transacciones múltiples | `ddd-agregados` |
| Eventos perdidos o mal diseñados | `ddd-eventos-dominio` |
| Repositorios tipo DAO | `ddd-repositorios-persistencia` |
| Servicios gordos | `ddd-servicios-capa-aplicacion` |
| Lecturas complejas | `ddd-event-sourcing-cqrs` |

## Señales de que la auditoría va mal

* Recomendar "pasar todo a DDD". DDD táctico donde no hay complejidad es un coste sin beneficio [IDDD cap. 1].
* Proponer una reescritura completa.
* Hallazgos sin evidencia (sin fichero ni línea).
* Recomendar microservicios antes de tener claros los contextos.
* Ignorar lo que dicen los expertos del dominio sobre qué es importante.

## Ejemplo

`references/ejemplo-auditoria.md`: auditoría resumida de un backend de pedidos en Express y Prisma, con hallazgos y plan en tres fases.
