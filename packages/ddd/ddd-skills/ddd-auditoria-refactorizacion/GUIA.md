# Auditoría y refactorización con DDD

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Para escribir el código, traduce los ejemplos con `ddd-skills/archi-code-ddd/suite-to-package.md`; si esta guía y las reglas del paquete discrepan, ganan las del paquete.
>
> **Cuándo consultar esta guía.** Auditar un proyecto existente contra las reglas de DDD y planificar su refactorización incremental. Incluye un script que escanea un repositorio TypeScript en busca de síntomas (dominio que importa frameworks u ORM, setters y campos públicos, servicios gigantes, repositorios de partes internas, importaciones entre contextos, transacciones con varios agregados), una lista de comprobación estratégica y táctica con severidad, un informe con formato fijo y un plan de migración por pasos (tests de caracterización, capa anticorrupción, extracción de contextos y agregados, estrangulamiento del legado). Consúltala siempre que alguien pida revisar, auditar, evaluar o "pasar a DDD" un código existente, modernizar un monolito, sacar un servicio de un sistema heredado, o pregunte "¿está bien hecho este DDD?", aunque solo pegue unos ficheros.

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* En código hecho con el paquete, aplica además cada punto de `ddd-skills/archi-code-ddd/what-not-to-do.md` como lista de comprobación.
* El escáner detecta guardados de cualquier variable (`this.orders.save(...)`) dentro del mismo bloque transaccional, imports de `@archi-code/ddd/application` o `/infrastructure` desde el dominio y `new Date()` en dominio y aplicación.

No puedes cambiar todo el software mal diseñado de una vez; puedes hacer bien tu parte e integrarte con el resto [IDDD cap. 2]. Esta guía convierte esa idea en un procedimiento: medir, priorizar por valor de negocio y cambiar por pasos seguros.


## Paso 0. Alcance y prioridad

Pregunta, o deduce y declara: qué parte del sistema importa más al negocio (candidata a Core Domain) y qué duele hoy (errores, lentitud de cambios, conflictos). La auditoría se ordena por ahí; refactorizar un subdominio genérico rara vez compensa [Destilado cap. 3].

## Paso 1. Escaneo automático

Si tienes acceso al repositorio:

```bash
python3 ddd-skills/ddd-auditoria-refactorizacion/scripts/scan_ddd_smells.py <ruta-del-repo> --json informe-escaneo.json
```

El script es heurístico y solo lee ficheros. Detecta los síntomas de `ddd-skills/ddd-auditoria-refactorizacion/references/lista-comprobacion.md` que se pueden ver con patrones de texto. Lo que no detecta (lenguaje, invariantes, límites de contexto) se revisa a mano en el paso 2.

Si solo tienes fragmentos pegados, aplica la misma lista leyendo el código.

## Paso 2. Revisión manual

Recorre `ddd-skills/ddd-auditoria-refactorizacion/references/lista-comprobacion.md` en este orden. El estratégico va primero porque un problema de límites invalida mejoras tácticas:

1. **Estratégico:** subdominios lógicos dentro del sistema, términos con varios significados, contextos implícitos, integraciones por base de datos, equipos compartiendo modelo.
2. **Arquitectura:** dependencias del dominio, dónde están las transacciones, qué expone la API.
3. **Táctico:** modelo anémico (prueba de salud de IDDD), agregados grandes, referencias directas entre agregados, setters, primitivos, repositorios de partes, servicios gordos, eventos ausentes o mal nombrados.

Para modelo anémico usa las dos preguntas de IDDD: ¿el "modelo de dominio" son sobre todo getters y setters sin lógica de negocio? ¿Los componentes que lo usan contienen la mayor parte de la lógica? Dos "sí" indican anemia [IDDD cap. 1, reformulado].

## Paso 3. Informe

Formato fijo en `ddd-skills/ddd-auditoria-refactorizacion/assets/plantilla-informe.md`: contexto y alcance, mapa de subdominios lógicos encontrados, hallazgos con evidencia (fichero y línea) y severidad, riesgos de negocio, plan por fases y deuda de modelo aceptada.

Severidad `[Fuera de los libros]`:

| Nivel | Criterio |
|---|---|
| Crítica | Corrompe datos o reglas de negocio hoy (invariantes sin proteger, varios agregados en una transacción con conflictos, eventos que se pierden) |
| Alta | Impide cambiar el Core Domain con seguridad (lenguaje mezclado, dominio acoplado al ORM, lógica en controladores) |
| Media | Encarece el cambio (primitivos, setters, repositorios de partes) |
| Baja | Estilo y nomenclatura |

## Paso 4. Plan de refactorización

Secuencia y técnicas en `ddd-skills/ddd-auditoria-refactorizacion/references/plan-migracion.md`. Principios:

* **Primero red de seguridad:** tests de caracterización sobre el comportamiento actual antes de mover nada `[Fuera de los libros]`.
* **Proteger antes de reconstruir:** una capa anticorrupción entre el código nuevo y el heredado, para no hablar su lenguaje [Destilado cap. 4].
* **Del Core hacia fuera:** el primer contexto que se extrae es el que más valor da.
* **Pasos pequeños y desplegables.** Lo que no se pueda arreglar en el tiempo disponible se anota como deuda de modelo y se planifica [Destilado cap. 7].
* **No reescribir de golpe.** El estrangulamiento progresivo (strangler fig) y los contextos burbuja (bubble context, Evans) permiten convivir con el legado `[Fuera de los libros]`.

## Cómo usar las demás guías

| Hallazgo | Guía para resolverlo |
|---|---|
| Lenguaje mezclado, no se sabe qué es núcleo | `ddd-skills/ddd-descubrimiento-dominio/GUIA.md`, `ddd-skills/ddd-subdominios-bounded-contexts/GUIA.md` |
| Integraciones frágiles, modelo ajeno filtrado | `ddd-skills/ddd-context-mapping/GUIA.md` |
| Dominio acoplado a frameworks | `ddd-skills/ddd-arquitectura/GUIA.md` |
| Primitivos, setters, identidades | `ddd-skills/ddd-value-objects-entidades/GUIA.md` |
| Agregados grandes o transacciones múltiples | `ddd-skills/ddd-agregados/GUIA.md` |
| Eventos perdidos o mal diseñados | `ddd-skills/ddd-eventos-dominio/GUIA.md` |
| Repositorios tipo DAO | `ddd-skills/ddd-repositorios-persistencia/GUIA.md` |
| Servicios gordos | `ddd-skills/ddd-servicios-capa-aplicacion/GUIA.md` |
| Lecturas complejas | `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md` |

## Señales de que la auditoría va mal

* Recomendar "pasar todo a DDD". DDD táctico donde no hay complejidad es un coste sin beneficio [IDDD cap. 1].
* Proponer una reescritura completa.
* Hallazgos sin evidencia (sin fichero ni línea).
* Recomendar microservicios antes de tener claros los contextos.
* Ignorar lo que dicen los expertos del dominio sobre qué es importante.

## Ejemplo

`ddd-skills/ddd-auditoria-refactorizacion/references/ejemplo-auditoria.md`: auditoría resumida de un backend de pedidos en Express y Prisma, con hallazgos y plan en tres fases.
