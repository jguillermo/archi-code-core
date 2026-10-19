# Orquestador de la suite DDD

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Es la guía de entrada de la suite: dice qué guía leer para cada tarea de código y las convenciones que siguen todas las demás guías.

## Convenciones de la suite

* **Trazabilidad.** Cada regla de las guías indica su origen: `[Destilado cap. N]` (Domain-Driven Design Destilado / Distilled, Vernon), `[IDDD cap. N]` (Implementing Domain-Driven Design, Vernon), `[PHP: capítulo]` (Domain-Driven Design in PHP). Lo que no sale de esos libros va marcado `[Fuera de los libros]`; las convenciones del paquete, `[Fuera de los libros: convención de @archi-code/ddd]`. Si una decisión de código se apoya en algo que no es de los libros, dilo.
* **Precedencia.** Las guías son la fuente de verdad para escribir código. El código se escribe con `@archi-code/ddd`: los ejemplos de las guías ya usan su API (las clases de su `src`), nunca clases base genéricas escritas a mano. El paquete solo se aparta de una guía donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]` (el recuadro "Con @archi-code/ddd" de cada guía y las notas marcadas); cualquier otra discrepancia entre una guía y el paquete (`ddd-skills/archi-code-ddd/` o su código) es un defecto del paquete: sigue la guía.
* **Vacíos.** Si las guías no cubren algo o se contradicen entre sí, usa tu conocimiento de DDD, márcalo como tal y no inventes conceptos ni prácticas no estándar sin decirlo.
* **API.** El código es TypeScript con `@archi-code/ddd`, sigue las reglas del paquete y no inventa API (`ddd-skills/archi-code-ddd/what-not-to-do.md`).

## Enrutado

Lee el `GUIA.md` correspondiente antes de escribir o revisar el código y después solo las `references/` que necesites. Si la tarea toca varias guías, léelas todas y empieza por la de integración o arquitectura.

| Situación | Guía |
|---|---|
| Cómo se integran en el código contextos y sistemas externos, ACL | `ddd-skills/ddd-context-mapping/GUIA.md` |
| Carpetas, capas, dependencias, módulos, composition root | `ddd-skills/ddd-arquitectura/GUIA.md` |
| Valor o entidad, ids, primitivos, validación, Specification | `ddd-skills/ddd-value-objects-entidades/GUIA.md` |
| Qué va junto, invariantes, transacciones, concurrencia, fábricas | `ddd-skills/ddd-agregados/GUIA.md` |
| Eventos, mensajería, outbox, idempotencia, versiones | `ddd-skills/ddd-eventos-dominio/GUIA.md` |
| Cargar y guardar agregados, mappers, transacciones, tests de repositorio | `ddd-skills/ddd-repositorios-persistencia/GUIA.md` |
| Servicios de dominio, casos de uso, dónde va la lógica, autorización | `ddd-skills/ddd-servicios-capa-aplicacion/GUIA.md` |
| Historial completo, read models, CQRS, Event Sourcing | `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md` |
| Revisar o migrar código existente | `ddd-skills/ddd-auditoria-refactorizacion/GUIA.md` |

Las reglas esenciales con su fuente están en `ddd-skills/ddd-orquestador/references/chuleta-reglas.md`.

Secuencias tipo:

* **Contexto nuevo:** arquitectura → agregados con value objects → eventos → repositorios → casos de uso → Event Sourcing o CQRS solo si hay motivo. Para un contexto sin reglas de negocio, basta la arquitectura y un CRUD bien encapsulado [IDDD cap. 1].
* **Código existente:** auditoría primero (escaneo, hallazgos, plan) y después las guías que indique el resultado.
* **Duda concreta:** directamente a la guía correspondiente.

## Restricciones

* No metas DDD táctico, CQRS, Event Sourcing ni microservicios donde no hay complejidad que lo justifique.
* No mezcles contextos en el código sin justificarlo ni diseñes agregados sin pensar en consistencia y límites.
* Los ejemplos van en un dominio realista (pedidos, pagos, usuarios o el del proyecto), escritos con `@archi-code/ddd` (`ddd-skills/archi-code-ddd/patterns.md`).
