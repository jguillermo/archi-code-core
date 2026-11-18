# Plan de migración incremental

## Fase 0. Red de seguridad

* Tests de caracterización de lo que hace hoy la zona a cambiar `[Fuera de los libros]`; con el paquete, sobre `InMemoryOrderRepository` del proyecto (`ddd-skills/archi-code-ddd/repositories.md`) y `InMemoryEventChannel.sent`.
* Reglas de dependencias en modo aviso (`ddd-skills/ddd-arquitectura/GUIA.md`).

## Fase 1. Proteger lo nuevo

* Un contexto nuevo con su lenguaje, conectado al legado por una ACL [Destilado cap. 4]: puerto de aplicación (`ProductPricing.priceOf(sku): Promise<Money | null>`, en `application/`; no existen puertos de dominio) y adaptador en `infrastructure/` que lee el legado, envuelve sus errores en `InternalErrorException` y construye `Money.fromPrimitives(...)`, de modo que un dato inválido falla en la frontera.
* Contexto burbuja de Evans: un contexto nuevo pequeño, protegido por ACL, que convive con el legado y lo usa como fuente de datos `[Fuera de los libros: Evans, "Getting Started with DDD When Surrounded by Legacy Systems", 2013]`.

## Fase 2. Desplazar funcionalidad

* Estrangulamiento (strangler fig): lo nuevo y lo rehecho se sirve desde el contexto nuevo, un enrutador decide y el legado se queda sin uso; rama por abstracción (puerto, implementación vieja y nueva, conmutación en la composición) `[Fuera de los libros]`.
* Si el legado debe ver los cambios, el contexto nuevo publica sus eventos y un caso de uso por reacción escribe en él por un puerto.

## Fase 3. Táctico dentro de cada contexto

`[Fuera de los libros, basado en dependencias entre reglas]`

1. Separar dominio e infraestructura: `toPrimitives()`/`static fromPrimitives()` en el agregado con test de ida y vuelta; repositorio abstracto por agregado en `domain/<agregado>/repository/` con solo los verbos necesarios; un adaptador por agregado y tecnología con versión en `WeakMap` y constructor con solo su tecnología; fuera mappers, repositorios genéricos, decoradores del ORM e imports de `/infrastructure` en el dominio; repositorio en memoria en `infrastructure/persistence/` o `test/support/`; constructor público y `static create` `[Fuera de los libros: convención de @archi-code/ddd]`.
2. Value objects para los primitivos más usados, cada uno en su fichero de `domain/<agregado>/value-object/`: `Money` como `Composite({ amount: Cents, currency: MoneyCurrency })`, `OrderId extends IdType<'OrderId'>` (la marca impide confundir ids de agregados distintos), `OrderStatusType.ts` con `enum OrderStatus`, `OrderStatusOption extends EnumType<OrderStatus>` y `OrderStatusType extends Required(OrderStatusOption)`.
3. Setters → métodos de negocio con nombres del lenguaje (`ship`, `addLine`) que comprueban la invariante, lanzan errores con nombre y código y llaman a `record()` con `<Agregado><AcciónEnPasado>DomainEvent`, trayendo la lógica desde los casos de uso; casos de uso CRUD (`UpdateOrder`) → uno por acción (`ShipOrder`, `AddOrderLine`).
4. Partir agregados grandes según sus plazos de consistencia (`ddd-skills/ddd-agregados/GUIA.md`).
5. Varios agregados en un caso de uso → guardar uno, publicar su evento y el resto en un caso de uso por reacción `<Acción>On<Evento>` (sin `UseCase` detrás); outbox en el repositorio si el evento no puede perderse.
6. Transacciones o unidad de trabajo en la aplicación → dentro del adaptador del repositorio (un documento, o una transacción dentro de `save`/`remove` si ocupa varias tablas); el caso de uso queda con el repositorio abstracto y `EventBus` `[Fuera de los libros: convención de @archi-code/ddd]`.
7. Repositorios con muchos métodos de lectura → read models (fila, store y puerto de consulta en `application/`, implementados en `infrastructure/`; proyección y una reacción por evento si la vista tiene tabla propia), leídos por el controlador sin caso de uso.

Cada paso se despliega y revierte por separado.
