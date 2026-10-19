# Plan de migración incremental

## Fase 0. Red de seguridad

* Tests de caracterización del comportamiento actual en la zona a cambiar: fijan lo que hace hoy, aunque esté mal, para detectar cambios no deseados `[Fuera de los libros]`. Cuando el código ya usa el paquete, se escriben sobre el repositorio en memoria del proyecto (`new InMemoryOrderRepository()`, un doble de test en `test/support/`, ver `ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`) y `FixedClock`, y comprueban lo que transportó el canal (`InMemoryEventChannel.sent`).
* Reglas automáticas de dependencias (`ddd-skills/ddd-arquitectura/GUIA.md`) en modo aviso, para medir sin bloquear.

## Fase 1. Proteger el código nuevo

* Crea un contexto nuevo y limpio para la parte que se va a tocar, con su propio lenguaje.
* Conéctalo con el legado mediante una ACL: el modelo nuevo no habla el lenguaje del legado [Destilado cap. 4]. El dominio declara el puerto con value objects; el adaptador de `infrastructure/` lee el legado y traduce:

```ts
export interface ProductPricing {
  priceOf(sku: Sku): Promise<Money>;
}
```

```ts
import { InternalErrorException } from '@archi-code/ddd/exceptions';

interface LegacyArticleRow {
  article_code: string;
  retail_price: string;
  currency_code: string | null;
}

interface LegacyArticles {
  findByCode(code: string): Promise<LegacyArticleRow>;
}

export class LegacyProductPricing implements ProductPricing {
  constructor(private readonly articles: LegacyArticles) {}

  async priceOf(sku: Sku): Promise<Money> {
    let row: LegacyArticleRow;
    try {
      row = await this.articles.findByCode(sku.value);
    } catch (error) {
      throw new InternalErrorException('reading the legacy price', { cause: error });
    }
    return Money.fromPrimitives({
      amount: Math.round(Number(row.retail_price.replace(',', '.')) * 100),
      currency: row.currency_code ?? 'EUR',
    });
  }
}
```

`Money.fromPrimitives` construye el `Composite` con todas sus reglas: un dato del legado que no las cumple lanza `ValidationException` en la frontera, no dentro del modelo.

La idea de Evans de un **contexto burbuja** (bubble context): un pequeño contexto nuevo, protegido por ACL, que convive con el legado y lo usa como fuente de datos `[Fuera de los libros: Evans, "Getting Started with DDD When Surrounded by Legacy Systems", 2013]`.

## Fase 2. Desplazar funcionalidad

* **Estrangulamiento** (strangler fig): las nuevas funcionalidades y las que se rehacen se sirven desde el contexto nuevo; un enrutador decide qué va a cada lado; el legado se va quedando sin uso `[Fuera de los libros]`.
* **Rama por abstracción** (branch by abstraction) para sustituir piezas internas: puerto (`ProductPricing`), implementación vieja detrás (`LegacyProductPricing`), implementación nueva detrás, conmutación en la raíz de composición `[Fuera de los libros]`.
* Si el legado debe seguir viendo los cambios, el contexto nuevo publica sus eventos con `EventBus.publish` y un `EventListener` suscrito con `@ListensTo` ejecuta un caso de uso cuyo puerto escribe en el legado.

## Fase 3. Refactorizar el táctico dentro de cada contexto

Orden recomendado `[Fuera de los libros, basado en dependencias entre reglas]`:
1. Separar dominio de infraestructura: el agregado expone `static fromPrimitives(PrimitiveTypes<X>)` y `toPrimitives()`, los repositorios implementan `AggregateFinder`/`AggregateSaver`/`AggregateRemover` de un solo agregado en `infrastructure/`, que llaman directamente a `x.toPrimitives()` y a `X.fromPrimitives(row).restoreVersion(row.version)`, con un constructor que recibe solo las dependencias de su tecnología (nunca la clase del agregado ni un mapper), sin decoradores del ORM ni imports de `/infrastructure` en el dominio. Un repositorio genérico compartido por varios agregados se parte en uno por agregado; un servicio de dominio o un mapper escrito a mano que convierte a primitivos se sustituye por `toPrimitives()`/`fromPrimitives()` del agregado, con un test de ida y vuelta por agregado; un repositorio en memoria que esté en `src/` se mueve a `test/support/` `[Fuera de los libros: convención de @archi-code/ddd]`.
2. Introducir value objects para los primitivos más usados: `Money` como `Composite({ amount: Cents, currency: Currency })`, identificadores `class OrderId extends IdType<'OrderId'>` (la marca hace que no se confundan ids de agregados distintos), estados `extends Required(StatusType)` sobre `EnumType`.
3. Sustituir setters por métodos de negocio con nombres del lenguaje (`ship`, `addLine`) que comprueban la invariante y llaman a `record()`, moviendo la lógica desde los casos de uso; partir los casos de uso CRUD (`UpdateOrder`) en uno por acción (`ShipOrder`, `AddOrderLine`).
4. Partir agregados grandes con el procedimiento de `ddd-skills/ddd-agregados/GUIA.md` (plazos de consistencia).
5. Donde hoy un caso de uso guarda varios agregados: guardar uno, publicar su evento y ejecutar el resto con un listener `<Action>On<Event>`; si el evento no puede perderse, el repositorio lo escribe junto al agregado en la misma escritura atómica (outbox) y un relay lo entrega por un `EventChannel`.
6. Donde un caso de uso o servicio de aplicación abre o maneja transacciones, o recibe un runner de transacciones o una unidad de trabajo: mover la transacción al adaptador del repositorio, que hace atómico cada `save`/`remove` (una escritura de un documento o, si el agregado ocupa varias tablas, una transacción de base de datos dentro de `save`/`remove`), y dejar el caso de uso con solo roles de repositorio, `EventBus` y `Clock` `[Fuera de los libros: convención de @archi-code/ddd]`.
7. Separar consultas de lectura (interfaz en `application/`, implementada en `infrastructure/` sobre la base de datos) si los repositorios han crecido en métodos.

## Despliegue

* Cada paso debe poder desplegarse y revertirse por separado.
