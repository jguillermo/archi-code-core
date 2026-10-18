# Lista de comprobación DDD

La columna "Script" indica si `scan_ddd_smells.py` lo detecta (sí / parcial / no). Lo que dice "no" se revisa leyendo el código y hablando con el equipo.

## Estratégico

| # | Comprobación | Fuente | Script | Severidad típica |
|---|---|---|---|---|
| E1 | ¿Hay un término con varios significados usado en el mismo código (Customer, Product, Order)? | [IDDD cap. 2; Destilado cap. 2] | no | Alta |
| E2 | ¿Se identifican subdominios lógicos mezclados en el sistema? | [Destilado cap. 3] | no | Alta |
| E3 | ¿Está claro qué es Core y recibe la mejor inversión? | [Destilado cap. 3] | no | Alta |
| E4 | ¿Se importan clases de dominio entre contextos? | [IDDD cap. 13; Destilado cap. 4] | sí | Alta |
| E5 | ¿Hay integración por base de datos compartida? | [Destilado cap. 4] | no | Alta |
| E6 | ¿Varios equipos modifican el mismo modelo? | [Destilado cap. 2; IDDD cap. 2] | no | Alta |
| E7 | ¿Las integraciones con sistemas externos pasan por una ACL? | [Destilado cap. 4] | no | Alta |
| E8 | ¿Hay cadenas de llamadas síncronas entre servicios dentro de una petición? | [Destilado cap. 4] | no | Alta |
| E9 | ¿Usuarios y permisos mezclados en el modelo del núcleo? | [IDDD cap. 2] | no | Media |

## Arquitectura

| # | Comprobación | Fuente | Script | Severidad |
|---|---|---|---|---|
| A1 | ¿El dominio importa frameworks, ORM o clientes HTTP? | [Destilado cap. 2; IDDD cap. 4] | sí | Alta |
| A2 | ¿Decoradores del ORM en clases de dominio? | [IDDD cap. 6] | sí | Alta |
| A3 | ¿Controladores con lógica de negocio o acceso directo a la base de datos? | [IDDD cap. 4] | parcial | Alta |
| A4 | ¿Las transacciones se gestionan en la capa de aplicación? | [IDDD cap. 12] | no | Media |
| A5 | ¿La API expone los agregados tal cual? | [IDDD cap. 4; Destilado cap. 4] | no | Media |
| A6 | ¿Módulos nombrados por patrón (`entities/`, `services/`)? | [PHP: Modules] | no | Baja |
| A7 | ¿El dominio lee `process.env` o usa el logger? | `[Fuera de los libros]` | sí | Media |

## Táctico

| # | Comprobación | Fuente | Script | Severidad |
|---|---|---|---|---|
| T1 | Prueba de anemia: ¿solo getters y setters? ¿la lógica está en los clientes? | [IDDD cap. 1] | parcial | Alta |
| T2 | ¿Setters públicos o campos públicos mutables en el dominio? | [Destilado cap. 5] | sí | Media |
| T3 | ¿Primitivos para conceptos (dinero como `number`, estado como `string`)? | [IDDD cap. 6] | parcial | Media |
| T4 | ¿Agregados con colecciones que crecen sin límite? | [IDDD cap. 10] | no | Alta |
| T5 | ¿Referencias a objetos de otros agregados en vez de identidades? | [Destilado cap. 5] | no | Media |
| T6 | ¿Se guardan varios agregados en una transacción? | [Destilado cap. 5; IDDD cap. 10] | parcial | Alta |
| T7 | ¿Hay versión para concurrencia optimista? | [IDDD cap. 10] | no | Alta si hay concurrencia |
| T8 | ¿Repositorios de partes internas o métodos CRUD de grano fino? | [IDDD cap. 12] | parcial | Media |
| T9 | ¿Servicios de aplicación gordos o clases `Manager`/`Helper`? | [IDDD cap. 14; Destilado cap. 5] | parcial | Media |
| T10 | ¿Eventos con nombre en pasado y del lenguaje? ¿O `XxxUpdated`? | [Destilado cap. 6] | no | Media |
| T11 | ¿Los eventos se guardan en la misma transacción que el agregado? | [Destilado cap. 6; IDDD cap. 8] | no | Crítica si se pierden |
| T12 | ¿Consumidores idempotentes? | [Destilado cap. 4] | no | Alta |
| T13 | ¿Identidad generada temprano? ¿`equals` sobre ids indefinidos? | [IDDD cap. 5] | no | Media |
| T14 | ¿Tests de aceptación con lenguaje del negocio y datos realistas? | [Destilado cap. 2; IDDD cap. 1] | no | Media |

## Preguntas para el equipo

* ¿Qué parte del sistema da miedo cambiar? ¿Por qué?
* ¿Dónde hay más errores en producción?
* ¿Qué palabra provoca más malentendidos con negocio?
* ¿Qué cambio pequeño de negocio costó demasiado la última vez?
