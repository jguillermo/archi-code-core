# Plan de migración incremental

## Fase 0. Red de seguridad

* Tests de caracterización del comportamiento actual en la zona a cambiar: fijan lo que hace hoy, aunque esté mal, para detectar cambios no deseados `[Fuera de los libros]`.
* Reglas automáticas de dependencias (`ddd-arquitectura`) en modo aviso, para medir sin bloquear.
* Mapa de contexto del presente, no del futuro deseado [IDDD cap. 3].

## Fase 1. Proteger el núcleo

* Identifica en el sistema los subdominios lógicos y el Core Domain [Destilado cap. 3].
* Crea un contexto nuevo y limpio para el Core (o para la parte del Core que se va a tocar) con su propio lenguaje.
* Conéctalo con el legado mediante una ACL: el modelo nuevo no habla el lenguaje del legado [Destilado cap. 4].

La idea de Evans de un **contexto burbuja** (bubble context): un pequeño contexto nuevo, protegido por ACL, que convive con el legado y lo usa como fuente de datos `[Fuera de los libros: Evans, "Getting Started with DDD When Surrounded by Legacy Systems", 2013]`.

## Fase 2. Desplazar funcionalidad

* **Estrangulamiento** (strangler fig): las nuevas funcionalidades y las que se rehacen se sirven desde el contexto nuevo; un enrutador decide qué va a cada lado; el legado se va quedando sin uso `[Fuera de los libros]`.
* **Rama por abstracción** (branch by abstraction) para sustituir piezas internas: puerto, implementación vieja detrás, implementación nueva detrás, conmutación `[Fuera de los libros]`.
* Si el legado debe seguir viendo los cambios, el contexto nuevo publica eventos y un adaptador los aplica en el legado.

## Fase 3. Refactorizar el táctico dentro de cada contexto

Orden recomendado `[Fuera de los libros, basado en dependencias entre reglas]`:
1. Separar dominio de infraestructura (puertos, mappers, sin decoradores).
2. Introducir value objects para los primitivos más usados (dinero, identificadores, estados).
3. Sustituir setters por comportamiento con nombres del lenguaje, moviendo la lógica desde los servicios.
4. Partir agregados grandes con el procedimiento de `ddd-agregados` (preguntar plazos de consistencia).
5. Introducir eventos y outbox donde hoy se modifican varios agregados juntos.
6. Separar consultas de lectura si los repositorios han crecido en métodos.

## Gestión

* Cada paso debe poder desplegarse y revertirse por separado.
* Lo que no quepa en el tiempo disponible se registra como deuda de modelo y se planifica [Destilado cap. 7].
* Estima con los artefactos del Event Storming (eventos, comandos, agregados) como unidades [Destilado cap. 7].
* Revisa con expertos del dominio los nombres nuevos antes de consolidarlos.
