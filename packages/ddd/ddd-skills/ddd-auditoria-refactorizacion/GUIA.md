# Auditoría y refactorización con DDD

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Los ejemplos están escritos con la API de `@archi-code/ddd` (las clases de su `src`) y se copian tal cual. Las guías deciden el diseño; la forma del código (carpetas y nombres, eventos, constructor y `create` del agregado, casos de uso de usuario y por reacción) la fija `ddd-skills/archi-code-ddd/`, que manda si un ejemplo difiere. El paquete se aparta de los libros donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]`; cualquier otra discrepancia sobre una regla de DDD es un defecto del paquete.
>
> **Cuándo consultar esta guía.** Auditar un proyecto existente contra las reglas de DDD y planificar su refactorización incremental. Incluye un script que escanea un repositorio TypeScript en busca de síntomas (dominio que importa frameworks u ORM, setters y campos públicos, servicios gigantes, repositorios de partes internas, importaciones entre contextos, transacciones con varios agregados, transacciones abiertas en la capa de aplicación), una lista de comprobación estratégica y táctica con severidad, un informe con formato fijo y un plan de migración por pasos (tests de caracterización, capa anticorrupción, extracción de contextos y agregados, estrangulamiento del legado). Consúltala siempre que alguien pida revisar, auditar, evaluar o "pasar a DDD" un código existente, modernizar un monolito, sacar un servicio de un sistema heredado, o pregunte "¿está bien hecho este DDD?", aunque solo pegue unos ficheros.

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* En código hecho con el paquete, aplica además cada punto de `ddd-skills/archi-code-ddd/what-not-to-do.md` como lista de comprobación: el paquete da las clases base, pero no impide un agregado anémico con setters, un caso de uso CRUD, dos agregados guardados en el mismo caso de uso o un caso de uso que abre su propia transacción (la transacción es del repositorio).
* La dirección de dependencias es la del paquete: el dominio importa solo `@archi-code/ddd/domain` (que exporta también las excepciones de dominio) y `@archi-code/validation`; importar `/application` o `/infrastructure` (por ejemplo `SystemClock`) o un adaptador de `infrastructure/` del proyecto desde el dominio es un hallazgo de severidad alta (A8 de la lista).
* El reloj es un puerto (`Clock`; `FixedClock` en tests; el agregado declara su interfaz local `Clock`): `new Date()` en dominio o aplicación es un hallazgo (A9).
* La forma del código es la de `ddd-skills/archi-code-ddd/`: un listener con un `UseCase` detrás, un evento con `eventName` igual al nombre de la clase, un constructor privado del agregado, un error con sufijo `Exception` o un contexto que importa clases de otro son hallazgos (T10, T15, T20, E2).
* El escáner detecta guardados de cualquier variable (`this.orders.save(...)`, `this.customers.remove(...)`) dentro del mismo bloque transaccional o de la misma clase de aplicación, transacciones abiertas o recibidas en dominio y aplicación (bloques transaccionales, `startSession`, runners de transacciones, unidades de trabajo), imports de `@archi-code/ddd/application` o `/infrastructure` desde el dominio, `new Date()` en dominio y aplicación, y campos de estado primitivos con el prefijo `_` del paquete (`private _status: string`). No marca `amount: number` ni `status: string` en `domain/event/` ni en `domain/exception/` (el payload de un evento y los datos del mensaje de un error son primitivos). Con la forma del paquete marca además un `EventListener` que llama a `execute()` (la reacción es el propio caso de uso), un `eventName` que es un nombre de clase en vez de `'<agregado>.<acción_en_pasado>'` y las importaciones entre contextos salvo las de `shared-kernel/`.

No puedes cambiar todo el código mal diseñado de una vez; puedes hacer bien tu parte e integrarte con el resto [IDDD cap. 2]. Esta guía convierte esa idea en un procedimiento: medir, priorizar y cambiar por pasos seguros.


## Paso 1. Escaneo automático

Si tienes acceso al repositorio, desde la carpeta del paquete (la que contiene `ddd-skills/`; `SKILL.md` explica cómo localizarla):

```bash
python3 -I ddd-skills/ddd-auditoria-refactorizacion/scripts/scan_ddd_smells.py <ruta-del-repo> --json informe-escaneo.json
```

El script es heurístico y solo lee ficheros. Detecta los síntomas de `ddd-skills/ddd-auditoria-refactorizacion/references/lista-comprobacion.md` que se pueden ver con patrones de texto. Lo que no detecta (lenguaje, invariantes, límites de contexto) se revisa a mano en el paso 2.

Si solo tienes fragmentos pegados, aplica la misma lista leyendo el código.

## Paso 2. Revisión manual

Recorre `ddd-skills/ddd-auditoria-refactorizacion/references/lista-comprobacion.md` en este orden. La integración entre contextos va primero porque un problema de límites invalida mejoras tácticas:

1. **Integración entre contextos:** términos con varios significados en el mismo código, contextos implícitos, clases de dominio importadas entre contextos, integraciones por base de datos, sistemas externos sin ACL.
2. **Arquitectura:** dependencias del dominio, dónde están las transacciones (con el paquete, solo dentro de los adaptadores de repositorio), qué expone la API.
3. **Táctico:** modelo anémico (prueba de salud de IDDD), agregados grandes, referencias directas entre agregados en vez de ids, setters en vez de métodos de negocio, primitivos en el estado en vez de value objects, repositorios de partes o con métodos de negocio en vez de los roles `AggregateFinder`/`AggregateSaver`/`AggregateRemover`, casos de uso CRUD o que guardan varios agregados, listeners que llaman a un `UseCase` en vez de ser el caso de uso por reacción, reacciones que lanzan errores de negocio, eventos ausentes o mal nombrados, y la forma del código del paquete (carpetas de un contexto, nombres, constructor público y `create`, copias de eventos ajenos).

Para modelo anémico usa las dos preguntas de IDDD: ¿el "modelo de dominio" son sobre todo getters y setters sin lógica de negocio? ¿Los componentes que lo usan contienen la mayor parte de la lógica? Dos "sí" indican anemia [IDDD cap. 1, reformulado]. Extender `AggregateRoot` no responde a ninguna de las dos: un agregado del paquete con `setStatus` y las reglas en el `handle` del caso de uso sigue siendo anémico.

## Paso 3. Informe

Recoge el alcance, los hallazgos con evidencia (fichero y línea) y severidad, el plan por fases y la deuda de modelo aceptada.

Severidad `[Fuera de los libros]`:

| Nivel | Criterio |
|---|---|
| Crítica | Corrompe datos o reglas de negocio hoy (invariantes sin proteger, varios agregados en una transacción con conflictos, eventos que se pierden) |
| Alta | Impide cambiar el Core Domain con seguridad (lenguaje mezclado, dominio acoplado al ORM, lógica en controladores) |
| Media | Encarece el cambio (primitivos en el estado, setters, repositorios de partes, `new Date()` en vez de `Clock`) |
| Baja | Estilo y nomenclatura |

## Paso 4. Plan de refactorización

Secuencia y técnicas en `ddd-skills/ddd-auditoria-refactorizacion/references/plan-migracion.md`. Principios:

* **Primero red de seguridad:** tests de caracterización sobre el comportamiento actual antes de mover nada `[Fuera de los libros]`.
* **Proteger antes de reconstruir:** una capa anticorrupción entre el código nuevo y el heredado, para no hablar su lenguaje [Destilado cap. 4].
* **Pasos pequeños y desplegables.**
* **No reescribir de golpe.** El estrangulamiento progresivo (strangler fig) y los contextos burbuja (bubble context, Evans) permiten convivir con el legado `[Fuera de los libros]`.

## Cómo usar las demás guías

| Hallazgo | Guía para resolverlo |
|---|---|
| Integraciones frágiles, modelo ajeno filtrado | `ddd-skills/ddd-context-mapping/GUIA.md` |
| Dominio acoplado a frameworks | `ddd-skills/ddd-arquitectura/GUIA.md` |
| Primitivos en el estado, setters, identidades | `ddd-skills/ddd-value-objects-entidades/GUIA.md` |
| Agregados grandes o transacciones múltiples | `ddd-skills/ddd-agregados/GUIA.md` |
| Eventos perdidos o mal diseñados, reacciones mal escritas | `ddd-skills/ddd-eventos-dominio/GUIA.md` |
| Repositorios tipo DAO, versión sin comprobar, transacciones o unidades de trabajo en los casos de uso | `ddd-skills/ddd-repositorios-persistencia/GUIA.md` |
| Casos de uso gordos o CRUD | `ddd-skills/ddd-servicios-capa-aplicacion/GUIA.md` |
| Lecturas complejas | `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md` |

## Señales de que la auditoría va mal

* Recomendar "pasar todo a DDD". DDD táctico donde no hay complejidad es un coste sin beneficio [IDDD cap. 1].
* Proponer una reescritura completa.
* Hallazgos sin evidencia (sin fichero ni línea).
* Recomendar microservicios antes de tener claros los contextos.

## Ejemplo

`ddd-skills/ddd-auditoria-refactorizacion/references/ejemplo-auditoria.md`: auditoría resumida de un backend de pedidos hecho con `@archi-code/ddd` y mal usado (agregado anémico con setters, `UpdateOrder` CRUD, pedido y cliente guardados en la misma transacción, casos de uso con su propia unidad de trabajo, estado como `string`), con el código antes y después, hallazgos y plan por fases.
