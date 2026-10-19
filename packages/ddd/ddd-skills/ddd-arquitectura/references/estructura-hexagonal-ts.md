# Estructura hexagonal en TypeScript

## Estructura base (un contexto por carpeta)

`[Fuera de los libros: traslado a TypeScript de las estructuras de IDDD cap. 9 y PHP: Modules]`

```
src/
  contexts/
    sales/                         ← Bounded Context (nombre del modelo, no del producto comercial)
      domain/
        order/                     ← módulo del lenguaje ubicuo
          Order.ts                 (agregado raíz)
          OrderLine.ts             (value object o entidad interna)
          OrderId.ts
          OrderStatus.ts
          events.ts                (OrderPlaced, OrderConfirmed...)
          OrderRepository.ts       (interfaz)
          errors.ts                (errores de negocio con nombre)
        customer/
          CustomerId.ts
        pricing/
          ProductPricing.ts        (puerto hacia Catálogo, ver ddd-skills/ddd-context-mapping/GUIA.md)
        shared/                    ← solo para este contexto
          Money.ts
          DomainEvent.ts
          AggregateRoot.ts
      application/
        place-order/
          PlaceOrder.ts            (caso de uso)
          PlaceOrderCommand.ts
        confirm-order/
          ConfirmOrder.ts
        queries/
          OrderSummaryQuery.ts
      infrastructure/
        persistence/
          PostgresOrderRepository.ts
          OrderMapper.ts           (modelo ↔ filas)
        catalog/                   (ACL hacia Catálogo)
        messaging/
          OutboxEventPublisher.ts
      interfaces/
        http/
          ordersRouter.ts
          dto.ts
        messaging/
          StockReservedConsumer.ts
      composition.ts               ← composition root del contexto
    warehouse/
      ...
  shared-kernel/                   ← solo si hay un Shared Kernel acordado (ver ddd-skills/ddd-context-mapping/GUIA.md)
  main.ts                          ← arranque del proceso
tests/
  contexts/sales/
    domain/                        (tests unitarios y de aceptación del modelo)
    application/                   (casos de uso con adaptadores en memoria)
    infrastructure/                (integración con BD real o contenedor)
```

Decisiones:
* Los tests de aceptación del modelo están junto al contexto, aunque en carpeta `tests/` espejo [Destilado cap. 2 pide tenerlos con el código del contexto; la carpeta espejo mantiene esa correspondencia].
* `domain/shared/` es compartido **dentro** del contexto. Nada de un `shared/` global con modelos de varios contextos.
* El composition root vive por contexto para que cada contexto se pueda desplegar por separado si un día hace falta.

## Variante para proyectos con una estructura fijada por la organización

Si tu organización fija la estructura del proyecto (por ejemplo, `src/app/` para la lógica principal, `tests/` en raíz, `docs/` para decisiones funcionales, una carpeta propia para los ADR y ninguna carpeta raíz nueva sin justificación), la estructura DDD encaja así:

```
src/
  app/
    contexts/
      sales/ (domain, application, infrastructure, interfaces, composition.ts)
      warehouse/
    main.ts
  prompts/      (si el proyecto usa IA; nunca dentro del dominio)
  utils/        (logger común; se inyecta en infraestructura, nunca en domain/)
config/
tests/
  contexts/sales/...
docs/
  dominio/      (mapa estratégico, context map, glosarios por contexto)
docs/adr/       (o la carpeta de ADR que fije la organización)
  ADR-xxx-*.md  (decisiones: patrón de relación elegido, CQRS sí/no, etc.)
```

Reglas de encaje:
* El logger de `src/utils/` solo lo usan `application`, `infrastructure` e `interfaces`. El dominio no registra logs: publica eventos o lanza errores con nombre.
* Las variables de entorno se leen en el composition root y llegan a los adaptadores como configuración tipada. Nunca `process.env` fuera de ahí.
* Los prompts de IA (si los hay) son infraestructura o aplicación; un modelo de lenguaje es un adaptador detrás de un puerto con nombre de negocio.

## Puertos y adaptadores

| Tipo | Ejemplo en el contexto de Ventas | Dónde se define la interfaz | Dónde se implementa |
|---|---|---|---|
| Entrada (driving) | HTTP `POST /orders`, consumidor de `StockReservado` | El caso de uso es la API de entrada | `interfaces/` |
| Salida de dominio | `OrderRepository`, `ProductPricing` | `domain/` | `infrastructure/` |
| Salida de aplicación | `EventPublisher`, `Clock`, `TransactionRunner` | `application/` | `infrastructure/` |

En IDDD los puertos no se implementan "a mano": el puerto es HTTP o el bus de mensajes, y el adaptador es el controlador o el listener que traduce a la API de aplicación [IDDD cap. 4]. El interior se diseña por casos de uso, no por número de clientes [IDDD cap. 4].

## Composition root sin contenedor

```ts
// src/contexts/sales/composition.ts
import { Pool } from 'pg';

export interface SalesConfig {
  databaseUrl: string;
  catalogBaseUrl: string;
}

export function composeSales(config: SalesConfig, deps: { http: HttpClient; logger: Logger }) {
  const pool = new Pool({ connectionString: config.databaseUrl });
  const tx = new PgTransactionRunner(pool);

  const orders = new PostgresOrderRepository(tx);
  const pricing = new CatalogHttpProductPricing(deps.http.withBaseUrl(config.catalogBaseUrl));
  const outbox = new OutboxEventPublisher(tx);

  const placeOrder = new PlaceOrder(orders, pricing, outbox, tx);
  const confirmOrder = new ConfirmOrder(orders, outbox, tx);

  return {
    httpRouter: ordersRouter({ placeOrder, confirmOrder }, deps.logger),
    consumers: [new StockReservedConsumer(confirmOrder, deps.logger)],
  };
}
```

Por qué sin contenedor: en TypeScript las interfaces desaparecen en tiempo de ejecución y los contenedores necesitan tokens o decoradores. Para la mayoría de contextos, construir el grafo a mano es más legible y no mete decoradores en el dominio `[Fuera de los libros]`. Si usas NestJS, sus módulos y proveedores van en `interfaces/` e `infrastructure/`; el dominio sigue sin decoradores.

## Controlador como adaptador de entrada

```ts
// src/contexts/sales/interfaces/http/ordersRouter.ts
export function ordersRouter(useCases: { placeOrder: PlaceOrder }, logger: Logger): Router {
  const router = Router();

  router.post('/orders', async (req, res) => {
    const parsed = PlaceOrderRequest.safeParse(req.body);          // validación de formato
    if (!parsed.success) return res.status(400).json(problem(parsed.error));

    try {
      const orderId = await useCases.placeOrder.execute({
        customerId: req.auth.customerId,                            // identidad del token, no del body
        items: parsed.data.items,
      });
      return res.status(201).location(`/orders/${orderId}`).json({ orderId });
    } catch (e) {
      if (e instanceof ProductNotSellable) return res.status(422).json(problem(e));
      logger.error('place_order_failed', { error: e });
      return res.status(500).json(problem());
    }
  });

  return router;
}
```

El controlador no sabe qué es un `Order`. Traduce HTTP a comando y errores de negocio a códigos HTTP.

## Configuración de TypeScript

`[Fuera de los libros]`
* `strict: true`. El dominio se apoya en el tipado para expresar invariantes.
* Alias por contexto (`@sales/domain/*`) para que los imports revelen la zona.
* `exactOptionalPropertyTypes` y `noUncheckedIndexedAccess` ayudan a que los value objects no acepten estados a medias.
