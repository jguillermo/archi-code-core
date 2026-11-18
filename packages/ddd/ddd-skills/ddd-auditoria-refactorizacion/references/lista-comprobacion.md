# Lista de comprobación DDD

"Script": lo detecta `scan_ddd_smells.py` (sí / parcial / no); lo que dice "no" se revisa leyendo el código. Con el paquete, recorre además el apartado "What not to do" de `ddd-skills/archi-code-ddd/where-each-class-goes.md` y de la guía de cada tipo de clase auditada.

## Integración entre contextos

| # | Comprobación | Fuente | Script | Sev. |
|---|---|---|---|---|
| E1 | Término con varios significados en el mismo código | [IDDD cap. 2; Destilado cap. 2] | no | Alta |
| E2 | Clases (también eventos o tipos de datos) importadas entre contextos fuera de `shared-kernel/`; cada consumidor declara su copia del evento | [IDDD cap. 13; Destilado cap. 4] | sí | Alta |
| E3 | Integración por base de datos compartida | [Destilado cap. 4] | no | Alta |
| E4 | Sistema externo sin ACL (puerto de aplicación con value objects + adaptador y traductor en `infrastructure/`) | [Destilado cap. 4] | no | Alta |
| E5 | Cadenas de llamadas síncronas entre servicios | [Destilado cap. 4] | no | Alta |
| E6 | Usuarios y permisos en el modelo del núcleo (la autorización va en el caso de uso) | [IDDD cap. 2] | no | Media |
| E7 | `{ ...event }` enviado fuera del sistema sin contrato publicado y versionado; dentro, cambio incompatible bajo el mismo `eventName` | [IDDD cap. 13] | no | Alta |

## Arquitectura

| # | Comprobación | Fuente | Script | Sev. |
|---|---|---|---|---|
| A1 | Dominio que importa frameworks, ORM o HTTP | [Destilado cap. 2; IDDD cap. 4] | sí | Alta |
| A2 | Decoradores del ORM en el dominio | [IDDD cap. 6] | sí | Alta |
| A3 | Controladores con lógica, repositorios, base de datos o `catch` para elegir estado (un punto de entrada solo comprueba actor y forma, llama a un caso de uso o a un puerto de consulta y traduce con `ExceptionClassifier`) | [IDDD cap. 4] | parcial | Alta |
| A4 | Transacciones o unidad de trabajo en caso de uso, servicio o dominio; van en el repositorio [IDDD cap. 12; IDDD cap. 14] | `[Fuera de los libros: convención de @archi-code/ddd]` | sí | Media |
| A5 | Caso de uso que devuelve el agregado o API que expone `toPrimitives()` | [IDDD cap. 4; Destilado cap. 4] | no | Media |
| A6 | Contexto con otra estructura: `domain/` sin una carpeta por agregado (carpetas de tipo o ficheros directamente bajo `domain/`) o sin dividir cada agregado por tipo, un agregado que importa de la carpeta de otro un tipo que no es su raíz, su repositorio o su identidad (va en `domain/shared/<tipo>/`), `application/` por patrón (`listeners/`, `use-cases/`) y no por acción, ficheros que no se llaman como su clase [PHP: Modules] | `[Fuera de los libros: convención de @archi-code/ddd]` | parcial | Baja |
| A7 | Dominio que lee `process.env` (solo la raíz de composición lee el entorno) o usa el logger | `[Fuera de los libros]` | sí | Media |
| A8 | Dominio que importa `/application`, `/infrastructure` o un adaptador | `[Fuera de los libros: convención de @archi-code/ddd]` | sí | Alta |
| A9 | `new Date()` como "ahora" en dominio o aplicación | `[Fuera de los libros: convención de @archi-code/ddd]` | sí | Media |
| A10 | `Error` o `ApplicationException` genéricos en vez de error de negocio con nombre, sin sufijo `Exception` y con código (`SAL001`), o traducción sin `{ cause }` | `[Fuera de los libros: convención de @archi-code/ddd]` | parcial | Media |

## Táctico

| # | Comprobación | Fuente | Script | Sev. |
|---|---|---|---|---|
| T1 | Anemia: solo getters y setters, lógica en los casos de uso | [IDDD cap. 1] | parcial | Alta |
| T2 | Setters o campos públicos mutables (deben ser métodos de negocio que llaman a `record()`) | [Destilado cap. 5] | sí | Media |
| T3 | Primitivos en el estado (`private _status: string`) en vez de value objects (`Required(XType)` con `@Validations`, `Composite`, `EnumType` o entidad hija) | [IDDD cap. 6] | parcial | Media |
| T4 | Colecciones que crecen sin límite | [IDDD cap. 10] | no | Alta |
| T5 | Referencias a otros agregados en vez de ids | [Destilado cap. 5] | no | Media |
| T6 | Caso de uso que guarda varios agregados sin decisión escrita | [Destilado cap. 5; IDDD cap. 10] | parcial | Alta |
| T7 | Versión optimista fuera del repositorio (el agregado la declara o mapea), sin `WeakMap`, condición de versión ni `ConcurrencyException`, dentro de `toPrimitives()` en vez de al lado, o actualizada antes de escribir | [IDDD cap. 10]; `[Fuera de los libros: convención de @archi-code/ddd]` | no | Alta |
| T8 | Repositorio de partes, sin clase abstracta en `domain/<agregado>/repository/`, con verbos distintos de `findById`/`search`/`save`/`remove` o consultas de negocio; casos de uso tipados con roles; lecturas que cargan agregados | [IDDD cap. 12]; `[Fuera de los libros: convención de @archi-code/ddd]` | parcial | Media |
| T9 | Casos de uso CRUD (`UpdateOrder`), multifunción, que usan otro caso de uso, o `Manager`/`Helper`; servicios de dominio inyectados, abstractos o como interfaz, implementados en infraestructura, ejecutados por algo que no es un caso de uso, usados por un agregado o que instancian a otro servicio de dominio; un agregado guardado dos veces (por el servicio y por el caso de uso); un servicio que solo envuelve un `findById`; un «puerto de dominio» (interfaz o clase abstracta del dominio, fuera de `repository/`, implementada en infraestructura o aplicación) | [IDDD cap. 14; Destilado cap. 5]; `[Fuera de los libros: convención de @archi-code/ddd]` | parcial | Media |
| T10 | Eventos sin pasado, `OrderUpdated`, value objects en el payload, o sin la forma `<Agregado><Acción>DomainEvent` / `'agregado.accion'` | [Destilado cap. 6]; `[Fuera de los libros: convención de @archi-code/ddd]` | parcial | Media |
| T11 | Publicar antes de `save`; eventos que no pueden perderse sin outbox en el repositorio | [Destilado cap. 6; IDDD cap. 8] | no | Crítica si se pierden |
| T12 | Reacciones no idempotentes (sin id derivado al crear, método de reacción que no vuelve sin cambios, proyección que no salta un `eventId` aplicado) o que lanzan si falta el agregado | [Destilado cap. 4] | no | Alta |
| T13 | Id no generado por el caso de uso (`OrderId.generate()`, `PaymentId.forOrder(order)`) o calculado dentro de `create`; ids opcionales (sin `Required`) | [IDDD cap. 5] | no | Media |
| T14 | Tests sin lenguaje del negocio ni datos realistas (`InMemoryOrderRepository` del proyecto, `channel.sent`) | [Destilado cap. 2; IDDD cap. 1] | no | Media |
| T15 | Reacción con un `UseCase` detrás, autorización o errores de negocio | `[Fuera de los libros: convención de @archi-code/ddd]` | parcial | Media |
| T16 | Value objects construidos en `handle` o en el controlador en vez de `toCommand`/inicio de la reacción con `ValueObjectBuilder.build`; `Input`/`Command` fuera del fichero | `[Fuera de los libros: convención de @archi-code/ddd]` | no | Media |
| T17 | Repositorio genérico, o que recibe la clase del agregado o un mapper en vez de solo su tecnología | `[Fuera de los libros: convención de @archi-code/ddd]` | no | Media |
| T18 | Conversión a primitivos fuera del agregado o sin test de ida y vuelta | `[Fuera de los libros: convención de @archi-code/ddd]` | parcial | Media |
| T19 | Repositorio en memoria sin copias ni versiones, o en producción en una aplicación que no corre en memoria; vive en `infrastructure/persistence/` o `test/support/` (`ddd-skills/archi-code-ddd/repositories.md`) | `[Fuera de los libros: convención de @archi-code/ddd]` | no | Baja |
| T20 | Agregado sin constructor público que solo asigna y `static create` con `<Agregado>CreatedDomainEvent`; métodos de usuario que no lanzan errores de negocio o de reacción que no vuelven sin cambios | `[Fuera de los libros: convención de @archi-code/ddd]` | parcial | Baja |
| T21 | Puerto de dominio: interfaz o clase abstracta en `domain/<agregado>/service/`, clase abstracta del dominio fuera de `repository/`, o una clase de aplicación, infraestructura o interfaces que implementa o extiende algo del dominio que no es el repositorio abstracto de un agregado. Es la regla más importante del paquete: no existen puertos de dominio | `[Fuera de los libros: convención de @archi-code/ddd]` | sí (`puerto-de-dominio`, `dominio-con-clase-abstracta`, `capa-exterior-implementa-dominio`) | Alta |
