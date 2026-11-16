# Auditoría y refactorización con DDD

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Los ejemplos usan la API de `@archi-code/ddd`; la forma del código la fija `ddd-skills/archi-code-ddd/`, que manda si un ejemplo difiere. El paquete se aparta de los libros donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]`.
>
> **Cuándo consultarla.** Al revisar, auditar o "pasar a DDD" código existente, modernizar un monolito o preguntar "¿está bien hecho este DDD?", aunque solo se peguen unos ficheros.

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* En código con el paquete, aplica además el apartado "What not to do" de `ddd-skills/archi-code-ddd/where-each-class-goes.md` y de la guía de cada tipo de clase auditada: las clases base no impiden un agregado anémico, un caso de uso CRUD, dos agregados guardados juntos ni una transacción en el caso de uso.
* El dominio importa solo `@archi-code/ddd/domain` y `@archi-code/validation`; importar `/application`, `/infrastructure` o un adaptador desde el dominio es severidad alta (A8).
* "Ahora" es `CreatedAt.now()`/`UpdatedAt.now()`; nada recibe ni inyecta la hora y los eventos no se fechan al crearlos; `new Date()` en dominio o aplicación es hallazgo (A9).
* Son hallazgos de forma: un listener con un `UseCase` detrás, un `eventName` que es nombre de clase, un constructor privado del agregado, un error con sufijo `Exception`, un contexto que importa clases de otro (T10, T15, T20, E2), un caso de uso que usa otro caso de uso o un servicio de dominio inyectado (T9).
* El escáner marca guardados de varias variables en el mismo bloque transaccional o clase de aplicación, transacciones abiertas o recibidas en dominio y aplicación, imports de `/application` o `/infrastructure` desde el dominio, `new Date()`, campos de estado primitivos con prefijo `_`, un `EventListener` que llama a `execute()`, un `eventName` con forma de clase e importaciones entre contextos salvo `shared-kernel/`. No marca primitivos en `domain/event/` ni `domain/exception/`.

No se cambia todo de una vez: haz bien tu parte e intégrate con el resto [IDDD cap. 2].

## 1. Escaneo

Desde la carpeta del paquete (la que contiene `ddd-skills/`):

```bash
python3 -I ddd-skills/ddd-auditoria-refactorizacion/scripts/scan_ddd_smells.py <ruta-del-repo> --json informe-escaneo.json
```

Heurístico y de solo lectura; detecta lo que marca "sí" o "parcial" en `ddd-skills/ddd-auditoria-refactorizacion/references/lista-comprobacion.md`. Lo que no ve (lenguaje, invariantes, límites de contexto) y los fragmentos pegados se revisan a mano con la lista.

## 2. Revisión manual

Recorre la lista en orden: integración entre contextos (un problema de límites invalida mejoras tácticas: términos con varios significados, contextos implícitos, imports entre contextos, base de datos compartida, sistemas sin ACL), arquitectura (dependencias del dominio, transacciones solo en los repositorios, qué expone la API), táctico (anemia, agregados grandes, referencias en vez de ids, setters, primitivos, repositorios, casos de uso CRUD o con varios agregados, reacciones, eventos y la forma del código del paquete). Prueba de anemia: ¿el modelo son getters y setters? ¿la lógica está en quien lo usa? Dos "sí" = anemia [IDDD cap. 1]. Extender `AggregateRoot` no cambia la respuesta: un agregado con `setStatus` y las reglas en `handle` sigue siendo anémico.

## 3. Informe

Alcance, hallazgos con fichero y línea y severidad, plan por fases y deuda aceptada. Severidad `[Fuera de los libros]`:

| Nivel | Criterio |
|---|---|
| Crítica | Corrompe datos o reglas hoy (invariantes sin proteger, varios agregados en una escritura, eventos perdidos) |
| Alta | Impide cambiar el Core Domain con seguridad (lenguaje mezclado, dominio acoplado al ORM, lógica en controladores) |
| Media | Encarece el cambio (primitivos, setters, repositorios de partes, `new Date()`) |
| Baja | Estilo y nombres |

## 4. Plan

Detalle en `ddd-skills/ddd-auditoria-refactorizacion/references/plan-migracion.md`: primero tests de caracterización `[Fuera de los libros]`; ACL entre lo nuevo y el legado [Destilado cap. 4]; pasos pequeños y desplegables; estrangulamiento y contexto burbuja, nunca reescritura completa `[Fuera de los libros]`.

## Qué guía resuelve cada hallazgo

| Hallazgo | Guía |
|---|---|
| Integraciones frágiles | `ddd-skills/ddd-context-mapping/GUIA.md` |
| Dominio acoplado a frameworks | `ddd-skills/ddd-arquitectura/GUIA.md` |
| Primitivos, setters, identidades | `ddd-skills/ddd-value-objects-entidades/GUIA.md` |
| Agregados grandes, varias escrituras | `ddd-skills/ddd-agregados/GUIA.md` |
| Eventos y reacciones | `ddd-skills/ddd-eventos-dominio/GUIA.md` |
| Repositorios DAO, versión, transacciones | `ddd-skills/ddd-repositorios-persistencia/GUIA.md` |
| Casos de uso gordos o CRUD | `ddd-skills/ddd-servicios-capa-aplicacion/GUIA.md` |
| Lecturas complejas | `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md` |

## Señales de que la auditoría va mal

* "Pasar todo a DDD": táctico sin complejidad es coste sin beneficio [IDDD cap. 1].
* Reescritura completa; hallazgos sin evidencia; microservicios antes de tener claros los contextos.

## Ejemplo

`ddd-skills/ddd-auditoria-refactorizacion/references/ejemplo-auditoria.md`: backend de pedidos que usa mal el paquete, con hallazgos, código corregido y plan.
