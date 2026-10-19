# Estructura hexagonal en TypeScript

## Estructura base (un contexto por carpeta)

`[Fuera de los libros: traslado a TypeScript de las estructuras de IDDD cap. 9 y PHP: Modules]`

```
src/
  contexts/
    sales/                         ← Bounded Context (nombre del modelo, no del producto comercial)
      domain/
        order/                     ← módulo del lenguaje ubicuo
          Order.ts                 (agregado raíz: extends AggregateRoot<OrderId, OrderEvent>)
          OrderId.ts               (extends IdType<'OrderId'>)
          OrderLine.ts             (Composite({ sku: Sku, quantity: Quantity, unitPrice: Money }))
          OrderLines.ts            (Composite({ items: [OrderLine] }) con sus reglas)
          OrderStatus.ts           (Required(StatusType), StatusType extends EnumType<Status>)
          Sku.ts, Quantity.ts      (Required(StringType) / Required(NumberType) + @Validations)
          ShippingAddress.ts       (Composite({ street: Street, city: City, country: Country }))
          events.ts                (OrderPlaced, OrderLineAdded, OrderConfirmed…: extends EventBase)
          errors.ts                (OrderNoLongerEditable extends DomainException, código ORD001)
        customer/
          CustomerId.ts
        pricing/
          ProductPricing.ts        (puerto hacia Catálogo, ver ddd-skills/ddd-context-mapping/GUIA.md)
        shared/                    ← solo para este contexto
          Money.ts                 (Composite({ amount: Cents, currency: Currency }))
      application/
        place-order/
          PlaceOrder.ts            (extends UseCase)
        add-order-line/
          AddOrderLine.ts
        prepare-shipment/
          PrepareShipment.ts
          PrepareShipmentOnOrderLineAdded.ts   (listener junto al caso de uso que ejecuta)
          Warehouse.ts             (puerto de salida de aplicación)
        order-summaries/
          OrderSummaries.ts        (consulta de lectura: interfaz + DTOs)
      infrastructure/
        persistence/
          MongoOrderRepository.ts  (AggregateFinder/AggregateSaver/AggregateRemover<Order>; constructor solo con la collection; guarda order.toPrimitives() con su version y carga con Order.fromPrimitives(row); cada save/remove es atómico)
          MongoOrderSummaries.ts
        catalog/                   (ACL hacia Catálogo: CatalogHttpProductPricing, CatalogTranslator)
        warehouse/
          HttpWarehouse.ts
        messaging/
          RabbitMqEventChannel.ts  (implements EventChannel)
      interfaces/
        http/
          ordersRouter.ts
        messaging/
          StockReservedConsumer.ts (traduce el contrato publicado por Almacén al input de un caso de uso)
      composition.ts               ← composition root del contexto
    warehouse/
      ...
  shared-kernel/                   ← solo si hay un Shared Kernel acordado (ver ddd-skills/ddd-context-mapping/GUIA.md)
  main.ts                          ← arranque del proceso
test/
  support/
    in-memory-order-repository.ts     (doble de test: AggregateFinder/AggregateSaver/AggregateRemover<Order>, constructor vacío)
  contexts/sales/
    domain/                        (tests unitarios y de aceptación del modelo)
    application/                   (casos de uso con InMemoryOrderRepository, InMemoryEventChannel)
    infrastructure/                (integración con BD real o contenedor)
```

Lo que no aparece porque lo da `@archi-code/ddd`: clases base (`AggregateRoot`, `Entity`, `EventBase`, los tipos de value object, `Composite`), una interfaz `OrderRepository` (los roles `AggregateFinder`, `AggregateSaver` y `AggregateRemover` vienen de `@archi-code/ddd/domain`), un `OrderMapper` (la conversión es del agregado, `toPrimitives()` y `static fromPrimitives()`, y cada repositorio los llama directamente: guarda `order.toPrimitives()` con `order.version + 1` y carga con `Order.fromPrimitives(row).restoreVersion(row.version)`), un publicador de eventos (`DomainEventBus` implementa `EventBus`) y el puerto `Clock`. Tampoco hay un runner de transacciones ni una unidad de trabajo: la transacción es del repositorio `[Fuera de los libros: convención de @archi-code/ddd]`.

Lo que el paquete no da y escribe el proyecto: cada repositorio, uno por agregado. Su constructor recibe solo las dependencias de su tecnología (la `collection` de Mongo, el `pool` de Postgres), nunca la clase del agregado ni un mapper; el agregado solo entra y sale por sus métodos. Nada comprueba en ejecución la forma del agregado: que su estado sean value objects expuestos por getters y que `toPrimitives()`/`fromPrimitives()` no pierdan campos lo garantizan el agregado y su test de ida y vuelta. El repositorio en memoria también es del proyecto y es un doble de test: vive en `test/support/`, nunca en `src/` (ver `InMemoryOrderRepository` en `ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`) `[Fuera de los libros: convención de @archi-code/ddd]`.

Decisiones:
* Los tests de aceptación del modelo están junto al contexto, aunque en carpeta `test/` espejo [Destilado cap. 2 pide tenerlos con el código del contexto; la carpeta espejo mantiene esa correspondencia].
* `domain/shared/` es compartido **dentro** del contexto y solo guarda conceptos del modelo (`Money`). Nada de un `shared/` global con modelos de varios contextos.
* Un listener vive en el módulo del caso de uso que ejecuta, no en una carpeta `listeners/`.
* El composition root vive por contexto para que cada contexto se pueda desplegar por separado si un día hace falta.

## Variante para proyectos con la lógica en `src/app/`

Algunos proyectos fijan `src/app/` para la lógica principal, `tests/` en raíz y `docs/` para las decisiones, y piden no crear carpetas raíz nuevas sin justificación `[Fuera de los libros]`. La estructura DDD encaja así:

```
src/
  app/
    contexts/
      sales/ (domain, application, infrastructure, interfaces, composition.ts)
      warehouse/
    main.ts
  prompts/      (si el proyecto usa IA; nunca dentro del dominio)
config/
tests/
  contexts/sales/...
```

Reglas de encaje:
* El logger es el puerto `Logger` de `@archi-code/ddd/application` (`debug`, `info`, `warn`, `error`, cada uno con un mensaje estable y un contexto). Lo reciben por constructor `application`, `infrastructure` e `interfaces`; el proveedor (`ConsoleLogger` del paquete, o un adaptador sobre pino, winston…) se elige en el composition root. El dominio no registra logs: registra eventos (`record`) o lanza una `DomainException` con nombre y código. `[Fuera de los libros: convención de @archi-code/ddd]`
* Las variables de entorno se leen en el composition root y llegan a los adaptadores como configuración tipada. Nunca `process.env` fuera de ahí.
* Los prompts de IA (si los hay) son infraestructura o aplicación; un modelo de lenguaje es un adaptador detrás de un puerto con nombre de negocio.

## Puertos y adaptadores

| Tipo | Ejemplo en el contexto de Ventas | Dónde se define la interfaz | Dónde se implementa |
|---|---|---|---|
| Entrada (driving) | HTTP `POST /orders`, consumidor de `StockReserved` | El caso de uso es la API de entrada (`execute(input)`) | `interfaces/` |
| Salida de dominio | `AggregateFinder<Order>`, `AggregateSaver<Order>` (del paquete); `ProductPricing` (tuyo) | `@archi-code/ddd/domain`; `domain/` | `infrastructure/` (`MongoOrderRepository`, `CatalogHttpProductPricing`) |
| Salida de aplicación | `EventBus`, `Clock`, `Logger` (del paquete); `Warehouse` (tuyo) | `@archi-code/ddd/application`; `application/` | `DomainEventBus` sobre tu `EventChannel`, `SystemClock`, `ConsoleLogger` o tu adaptador; `HttpWarehouse` |

En IDDD los puertos no se implementan "a mano": el puerto es HTTP o el bus de mensajes, y el adaptador es el controlador o el listener que traduce a la API de aplicación [IDDD cap. 4]. El interior se diseña por casos de uso, no por número de clientes [IDDD cap. 4].

Con el paquete, una tecnología de mensajería solo implementa `EventChannel` (`send` y `receive`); `DomainEventBus`, los casos de uso y los listeners no cambian. `[Fuera de los libros: convención de @archi-code/ddd]`

## Composition root sin contenedor

```ts
// src/contexts/sales/composition.ts
import { MongoClient } from 'mongodb';
import {
  DomainEventBus,
  EventRegistry,
  HttpErrorMapper,
  SystemClock,
} from '@archi-code/ddd/infrastructure';
import { OrderLineAdded, OrderPlaced } from './domain/order/events';
import type { MoneyData, OrderEvent, OrderLineData } from './domain/order/events';
import { PlaceOrder } from './application/place-order/PlaceOrder';
import { AddOrderLine } from './application/add-order-line/AddOrderLine';
import { PrepareShipment } from './application/prepare-shipment/PrepareShipment';
import { PrepareShipmentOnOrderLineAdded } from './application/prepare-shipment/PrepareShipmentOnOrderLineAdded';
import { MongoOrderRepository } from './infrastructure/persistence/MongoOrderRepository';
import type { OrderDocument } from './infrastructure/persistence/MongoOrderRepository';
import { HttpWarehouse } from './infrastructure/warehouse/HttpWarehouse';
import type { HttpClient } from './infrastructure/warehouse/HttpWarehouse';
import { RabbitMqEventChannel } from './infrastructure/messaging/RabbitMqEventChannel';
import type { AmqpChannel } from './infrastructure/messaging/RabbitMqEventChannel';
import { ordersRouter } from './interfaces/http/ordersRouter';
import type { Logger } from '@archi-code/ddd/application';

export interface SalesConfig {
  mongoUrl: string;
  warehouseBaseUrl: string;
}

export async function composeSales(
  config: SalesConfig,
  deps: { amqp: AmqpChannel; http: HttpClient; logger: Logger },
) {
  const mongo = await new MongoClient(config.mongoUrl).connect();
  const orders = new MongoOrderRepository(mongo.db().collection<OrderDocument>('orders'));
  const clock = new SystemClock();

  const registry = new EventRegistry<OrderEvent>()
    .register(
      OrderPlaced,
      (json) =>
        new OrderPlaced(
          json.aggregateId,
          json.customerId as string,
          json.lines as OrderLineData[],
          json.total as MoneyData,
          json,
        ),
    )
    .register(
      OrderLineAdded,
      (json) =>
        new OrderLineAdded(
          json.aggregateId,
          json.sku as string,
          json.quantity as number,
          json.unitPrice as MoneyData,
          json.total as MoneyData,
          json,
        ),
    );
  const bus = new DomainEventBus<OrderEvent>(
    new RabbitMqEventChannel(deps.amqp),
    registry,
    deps.logger,
  );

  const placeOrder = new PlaceOrder(orders, bus, clock);
  const addOrderLine = new AddOrderLine(orders, bus, clock);
  const prepareShipment = new PrepareShipment(
    new HttpWarehouse(deps.http, config.warehouseBaseUrl),
  );

  const subscriptions = [
    await bus.subscribe(new PrepareShipmentOnOrderLineAdded(prepareShipment)),
  ];

  return {
    httpRouter: ordersRouter(
      { placeOrder, addOrderLine },
      new HttpErrorMapper({ statusByCode: { ORD001: 409 }, logger: deps.logger }),
    ),
    close: async () => {
      await Promise.all(subscriptions.map((subscription) => subscription.unsubscribe()));
      await mongo.close();
    },
  };
}
```

Qué hace cada pieza:
* Del paquete, en `@archi-code/ddd/infrastructure`: `EventRegistry` (reconstruye cada evento desde su JSON; la factoría pasa el JSON como metadata para conservar `eventId` y `occurredOn`), `DomainEventBus` (implementa `EventBus`, lo único que reciben los casos de uso; su `subscribe(listener)` solo lo llama el composition root), `SystemClock` (implementa `Clock`) y `HttpErrorMapper` (códigos propios como `ORD001` se sobrescriben por código).
* Código del proyecto sobre los puertos del paquete `[Fuera de los libros: convención de @archi-code/ddd]`: `MongoOrderRepository` (roles de repositorio de `Order`; su constructor recibe solo la `collection`; llama a `order.toPrimitives()` y a `Order.fromPrimitives(row).restoreVersion(row.version)` y controla la `version`; responsable de toda la persistencia: cada `save`/`remove` es una escritura atómica de un documento, y si un agregado ocupara varias tablas SQL abriría y cerraría la transacción de la base de datos dentro de `save`/`remove`; ver `ddd-skills/ddd-repositorios-persistencia/GUIA.md`), `RabbitMqEventChannel` (implementa `EventChannel`, ver `ddd-skills/ddd-eventos-dominio/GUIA.md`) y `HttpWarehouse` (implementa el puerto `Warehouse`).
* Cada listener se suscribe con `bus.subscribe(listener)`, que lee su `@ListensTo(OrderLineAdded, { consumer: 'prepare-shipment-on-order-line-added' })` y rechaza un evento que el registro no sabe reconstruir.
* Cambiar RabbitMQ por un outbox o por memoria cambia solo la línea del canal.
* Ni los casos de uso ni los repositorios reciben un runner de transacciones: el composition root no construye ninguno.

Por qué sin contenedor: en TypeScript las interfaces desaparecen en tiempo de ejecución y los contenedores necesitan tokens o decoradores. Para la mayoría de contextos, construir el grafo a mano es más legible y no mete decoradores de inyección en el dominio `[Fuera de los libros]`. Si usas NestJS, sus módulos y proveedores van en `interfaces/` e `infrastructure/`; el dominio sigue sin decoradores salvo `@Validations` de `@archi-code/validation` en los value objects.

## El mismo grafo en los tests de aplicación

Los tests de `application/` montan el contexto con el repositorio en memoria del proyecto (`test/support/in-memory-order-repository.ts`) y los adaptadores en memoria del paquete; los casos de uso y los listeners son los mismos (`test/contexts/sales/application/salesForTests.ts`):

```ts
import {
  DomainEventBus,
  EventRegistry,
  FixedClock,
  InMemoryEventChannel,
} from '@archi-code/ddd/infrastructure';
import { InMemoryOrderRepository } from '../../../support/in-memory-order-repository';
import { OrderLineAdded } from '@sales/domain/order/events';
import type { MoneyData, OrderEvent } from '@sales/domain/order/events';
import { AddOrderLine } from '@sales/application/add-order-line/AddOrderLine';
import { PlaceOrder } from '@sales/application/place-order/PlaceOrder';
import { PrepareShipment } from '@sales/application/prepare-shipment/PrepareShipment';
import { PrepareShipmentOnOrderLineAdded } from '@sales/application/prepare-shipment/PrepareShipmentOnOrderLineAdded';
import type { Warehouse } from '@sales/application/prepare-shipment/Warehouse';

export async function salesForTests(warehouse: Warehouse) {
  const orders = new InMemoryOrderRepository();
  const channel = new InMemoryEventChannel();
  const registry = new EventRegistry<OrderEvent>().register(
    OrderLineAdded,
    (json) =>
      new OrderLineAdded(
        json.aggregateId,
        json.sku as string,
        json.quantity as number,
        json.unitPrice as MoneyData,
        json.total as MoneyData,
        json,
      ),
  );
  const bus = new DomainEventBus<OrderEvent>(channel, registry);
  await bus.subscribe(new PrepareShipmentOnOrderLineAdded(new PrepareShipment(warehouse)));
  const clock = new FixedClock('2026-03-01T09:30:00Z');
  return {
    orders,
    channel,
    placeOrder: new PlaceOrder(orders, bus, clock),
    addOrderLine: new AddOrderLine(orders, bus, clock),
  };
}
```

El test comprueba lo que causó el listener (el `Warehouse` de prueba) y lo que llevó el canal (`channel.sent`), nunca que el listener fue llamado. `InMemoryOrderRepository` (cada `save` y `remove` atómico, con comprobación de versión) es un doble de test del proyecto: vive en `test/support/` y nunca se usa en producción `[Fuera de los libros: convención de @archi-code/ddd]`.

## Controlador como adaptador de entrada

```ts
// src/contexts/sales/interfaces/http/ordersRouter.ts
import { Router } from 'express';
import type { Response } from 'express';
import type { HttpErrorMapper } from '@archi-code/ddd/infrastructure';
import type { AddOrderLine } from '../../application/add-order-line/AddOrderLine';
import type { PlaceOrder } from '../../application/place-order/PlaceOrder';

export function ordersRouter(
  useCases: { placeOrder: PlaceOrder; addOrderLine: AddOrderLine },
  errors: HttpErrorMapper,
): Router {
  const router = Router();

  const fail = (res: Response, error: unknown) => {
    const { status, body } = errors.map(error);
    return res.status(status).json(body);
  };

  router.post('/orders', async (req, res) => {
    const body = req.body as {
      lines?: unknown;
      shippingAddress?: { street?: unknown; city?: unknown; country?: unknown };
    } | null;
    const address = body?.shippingAddress;
    if (
      !Array.isArray(body?.lines) ||
      typeof address?.street !== 'string' ||
      typeof address.city !== 'string' ||
      typeof address.country !== 'string'
    ) {
      return res
        .status(400)
        .json({ code: 'BAD_REQUEST', message: 'lines and shippingAddress are required' });
    }
    try {
      const orderId = await useCases.placeOrder.execute({
        customerId: req.auth.customerId,
        lines: body.lines,
        shippingAddress: { street: address.street, city: address.city, country: address.country },
      });
      return res.status(201).location(`/orders/${orderId}`).json({ orderId });
    } catch (error) {
      return fail(res, error);
    }
  });

  router.post('/orders/:orderId/lines', async (req, res) => {
    const body = req.body as {
      sku?: unknown;
      quantity?: unknown;
      unitPrice?: { amount?: unknown; currency?: unknown };
    } | null;
    if (
      typeof body?.sku !== 'string' ||
      typeof body.quantity !== 'number' ||
      typeof body.unitPrice?.amount !== 'number' ||
      typeof body.unitPrice.currency !== 'string'
    ) {
      return res
        .status(400)
        .json({ code: 'BAD_REQUEST', message: 'sku, quantity and unitPrice are required' });
    }
    try {
      await useCases.addOrderLine.execute({
        orderId: req.params.orderId,
        sku: body.sku,
        quantity: body.quantity,
        unitPrice: { amount: body.unitPrice.amount, currency: body.unitPrice.currency },
      });
      return res.status(204).json(null);
    } catch (error) {
      return fail(res, error);
    }
  });

  return router;
}
```

El controlador no sabe qué es un `Order`. Comprueba solo la forma de la petición (un campo es texto o número) [IDDD cap. 4]; las reglas de cada valor son de los value objects que `toCommand` construye con `ValueObjects.build`, y llegan como una `ValidationException` con todos los campos (422). La identidad del cliente sale del token, no del body. `HttpErrorMapper` traduce los errores: 404 `AggregateNotFoundException`, 403 `NotAllowedException`, 409 `ConcurrencyException`, 422 `ValidationException` y cualquier otra `DomainException`, 500 con un mensaje genérico para lo demás. Con `logger`, el mapper registra cada 5xx una vez como `error` (con su causa) y los 4xx solo en `debug`; el controlador no vuelve a registrarlos.

## Configuración de TypeScript

`[Fuera de los libros]`
* `strict: true`. El dominio se apoya en el tipado para expresar invariantes.
* `experimentalDecorators: true`: `@Validations` (value objects) y `@ListensTo` (listeners) son decoradores de clase.
* `moduleResolution` `node16`, `nodenext` o `bundler` para resolver los subpaths `@archi-code/ddd/domain`, `/application`, `/infrastructure` y `/exceptions`; con `node` los resuelve el `typesVersions` del paquete.
* Alias por contexto (`"@sales/*": ["src/contexts/sales/*"]`, usado como `@sales/domain/order/Order`) para que los imports revelen la zona.
* `exactOptionalPropertyTypes` y `noUncheckedIndexedAccess` ayudan a que los value objects no acepten estados a medias.
