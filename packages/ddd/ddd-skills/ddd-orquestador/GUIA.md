# Orquestador de la suite DDD

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Dice qué guía leer para cada tarea y las convenciones de todas.

## Convenciones

* **Fuentes.** Cada regla cita su origen: `[Destilado cap. N]` (DDD Destilado, Vernon), `[IDDD cap. N]` (Implementing DDD, Vernon), `[PHP: capítulo]` (DDD in PHP). Lo ajeno a los libros va `[Fuera de los libros]`; las convenciones del paquete, `[Fuera de los libros: convención de @archi-code/ddd]`.
* **Precedencia.** Las guías deciden el diseño (límites, invariantes, eventos). La forma del código la fija `ddd-skills/archi-code-ddd/` y manda si un ejemplo difiere. Otra discrepancia de DDD entre guía y paquete es un defecto del paquete: sigue la guía.
* **Código.** TypeScript con `@archi-code/ddd`, sin inventar API ni clases base propias (`ddd-skills/archi-code-ddd/where-each-class-goes.md`, apartado "What not to do").
* **Vacíos.** Si las guías no cubren algo o se contradicen, usa DDD estándar y dilo; no inventes conceptos ni prácticas no estándar.

## Enrutado

Lee el `GUIA.md` y solo las `references/` que necesites. Si la tarea toca varias, empieza por integración o arquitectura.

| Situación | Guía |
|---|---|
| Integración entre contextos y sistemas externos, ACL | `ddd-skills/ddd-context-mapping/GUIA.md` |
| Carpetas, capas, dependencias, composition root, controladores | `ddd-skills/ddd-arquitectura/GUIA.md` |
| Valor o entidad, ids, validación, Specification | `ddd-skills/ddd-value-objects-entidades/GUIA.md` |
| Límites, invariantes, concurrencia, fábricas | `ddd-skills/ddd-agregados/GUIA.md` |
| Eventos, mensajería, outbox, idempotencia | `ddd-skills/ddd-eventos-dominio/GUIA.md` |
| Repositorios, persistencia, transacciones | `ddd-skills/ddd-repositorios-persistencia/GUIA.md` |
| Servicios de dominio, casos de uso, autorización | `ddd-skills/ddd-servicios-capa-aplicacion/GUIA.md` |
| Read models, CQRS, Event Sourcing | `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md` |
| Revisar o migrar código existente | `ddd-skills/ddd-auditoria-refactorizacion/GUIA.md` |

Reglas esenciales con fuente: `ddd-skills/ddd-orquestador/references/chuleta-reglas.md`.

* **Contexto nuevo:** arquitectura → agregados y value objects → eventos → repositorios → casos de uso → CQRS/ES solo con motivo. Sin reglas de negocio, basta un CRUD bien encapsulado [IDDD cap. 1].
* **Código existente:** auditoría primero (escaneo, hallazgos, plan), luego las guías que indique.
* **Duda concreta:** directamente a su guía.

## Restricciones

* Nada de DDD táctico, CQRS, Event Sourcing ni microservicios sin complejidad que lo justifique [IDDD cap. 4].
* No mezcles contextos en el código sin justificarlo ni diseñes agregados sin pensar en consistencia y límites.
* Ejemplos en un dominio realista, escritos con `@archi-code/ddd` (apartado "Code" de cada guía de `ddd-skills/archi-code-ddd/`).
