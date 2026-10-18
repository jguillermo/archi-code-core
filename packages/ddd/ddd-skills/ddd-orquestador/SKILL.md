---
name: ddd-orquestador
description: Punto de entrada de la suite de skills de Domain-Driven Design. Diagnostica en qué situación está el proyecto (nuevo, existente o una duda concreta), clasifica la pregunta como estratégica, táctica o mixta y decide qué skills DDD aplicar y en qué orden. Incluye una chuleta con las reglas esenciales de DDD y sus fuentes. Úsalo SIEMPRE que alguien quiera aplicar DDD a un proyecto, pregunte "por dónde empiezo", pida ayuda general con DDD, diseño de dominio, bounded contexts, agregados o microservicios sin precisar más, o cuando no esté claro cuál de los skills ddd-* corresponde.
---

# Orquestador de la suite DDD

## Convenciones de la suite DDD

* **Trazabilidad.** Cada regla indica su origen: `[Destilado cap. N]` (Domain-Driven Design Destilado / Distilled, Vernon), `[IDDD cap. N]` (Implementing Domain-Driven Design, Vernon), `[PHP: capítulo]` (Domain-Driven Design in PHP). Lo que no sale de esos libros va marcado `[Fuera de los libros]`.
* **Idioma.** Responde en el idioma de la persona. El código de ejemplo es TypeScript.
* **Honestidad del modelo.** Lo que no ha validado un experto del dominio se presenta como hipótesis.

## Paso 1. Clasificar la petición

| Tipo | Señales | Va a |
|---|---|---|
| Estratégica | Dividir el sistema, equipos, microservicios, qué es core, integrar sistemas, términos ambiguos | skills 1 a 3 |
| Arquitectura | Carpetas, capas, frameworks, dónde va cada cosa | skill 4 |
| Táctica | Clases, entidades, agregados, eventos, repositorios, servicios | skills 5 a 10 |
| Mixta | Diseñar un sistema completo, modernizar un monolito | secuencia (Paso 3) |

Evalúa también la claridad: completa, parcial o ambigua. Si es ambigua y el riesgo de equivocarse es alto, pregunta una sola cosa; si no, declara los supuestos y sigue.

## Paso 2. Elegir el skill

| Situación | Skill |
|---|---|
| Entender un negocio, lluvia de ideas, Event Storming, glosario, escenarios | `ddd-descubrimiento-dominio` |
| Qué es core, cuántos contextos o servicios, dónde trazar límites | `ddd-subdominios-bounded-contexts` |
| Cómo se relacionan e integran contextos, sistemas externos, ACL | `ddd-context-mapping` |
| Estructura del código, hexagonal, dependencias, módulos | `ddd-arquitectura` |
| Valor o entidad, ids, primitivos, validación | `ddd-value-objects-entidades` |
| Qué va junto, transacciones, invariantes, concurrencia | `ddd-agregados` |
| Eventos, mensajería, outbox, idempotencia | `ddd-eventos-dominio` |
| Guardar y cargar agregados, ORM, transacciones | `ddd-repositorios-persistencia` |
| Servicios, casos de uso, dónde va la lógica | `ddd-servicios-capa-aplicacion` |
| Historial completo, read models, CQRS | `ddd-event-sourcing-cqrs` |
| Revisar o migrar código existente | `ddd-auditoria-refactorizacion` |

Lee el `SKILL.md` del skill elegido antes de responder. Si la petición toca dos, lee ambos y empieza por el más estratégico.

## Paso 3. Secuencias tipo

**Proyecto nuevo:**
1. `ddd-descubrimiento-dominio` (¿merece DDD?, Event Storming, glosario)
2. `ddd-subdominios-bounded-contexts` (mapa estratégico)
3. `ddd-context-mapping` (relaciones)
4. `ddd-arquitectura` (estructura por contexto)
5. Por cada contexto Core: `ddd-agregados` con `ddd-value-objects-entidades`, luego `ddd-eventos-dominio`, `ddd-repositorios-persistencia`, `ddd-servicios-capa-aplicacion`
6. Solo si hay motivo: `ddd-event-sourcing-cqrs`

Para subdominios genéricos o de soporte sin reglas, quédate en los pasos 1 a 4 y un CRUD bien encapsulado [IDDD cap. 1].

**Proyecto existente:**
1. `ddd-auditoria-refactorizacion` (escaneo, hallazgos, plan)
2. Los skills que indique el informe, empezando por los hallazgos estratégicos

**Duda concreta:** directamente al skill correspondiente.

## Paso 4. Estructura de la respuesta

Para preguntas de diseño, responde en este orden (adáptalo si la pregunta es corta):
1. Interpretación del problema en términos de dominio.
2. Clasificación (estratégica, táctica o mixta) y por qué.
3. Análisis: conceptos clave, riesgos, decisiones implícitas.
4. Propuesta justificada.
5. Ejemplo concreto con nombres, límites de agregado y comportamiento.
6. Trade-offs y alternativas.

Antes de entregar, comprueba: ¿estoy diseñando o solo explicando? ¿He evitado "depende" sin explicar de qué? ¿Alguien podría implementarlo con esto?

## Chuleta

Las reglas esenciales con su fuente están en `references/chuleta-reglas.md`. Úsala para respuestas rápidas y para comprobar coherencia entre skills.
