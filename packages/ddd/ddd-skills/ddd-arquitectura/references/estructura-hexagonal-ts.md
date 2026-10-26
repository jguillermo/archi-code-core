# Estructura hexagonal en TypeScript

## Estructura base (un contexto por carpeta)

`[Fuera de los libros: convención de @archi-code/ddd]` Traslado a TypeScript de las estructuras de IDDD cap. 9 y PHP: Modules, con una diferencia deliberada: dentro de `domain/` las carpetas agrupan por tipo de clase (`aggregate/`, `value-object/`, `event/`…), mientras que los libros nombran los módulos con el lenguaje ubicuo [IDDD cap. 9; PHP: Modules]. El lenguaje ubicuo vive en los nombres de las clases y, en `application/`, en una carpeta por acción de negocio.

```
src/
  shop.ts                          ← arranque: abre un canal de eventos y arranca cada contexto
  platform/
    http/http.ts                   (HttpRequest, HttpResponse, Http: traduce errores con ExceptionClassifier)
  contexts/
    shared-kernel/
      money/                       ← solo si hay un Shared Kernel acordado (ver ddd-skills/ddd-context-mapping/GUIA.md)
        Money.ts                   (Composite({ amount: Cents, currency: MoneyCurrency }))
        Cents.ts, CentsAmount.ts, MoneyCurrency.ts, CurrencyMismatch.ts
    sales/                         ← Bounded Context (nombre del modelo, no del producto comercial)
      domain/
        aggregate/
          Order.ts                 (extends AggregateRoot<OrderId>; constructor público + static create)
          NewOrderLine.ts          (interfaz de value objects que recibe Order.create)
        entity/
          OrderLine.ts             (extends Entity<LineNumber>)
        value-object/
          OrderId.ts               (extends IdType<'OrderId'>)
          OrderStatusType.ts       (enum OrderStatus + OrderStatusOption + OrderStatusType)
          Sku.ts, Quantity.ts      (Required(StringType) / Required(NumberType) + @Validations)
          ShippingAddress.ts       (Composite({ street: Street, city: City, country: Country }))
        event/
          OrderCreatedDomainEvent.ts, OrderPaidDomainEvent.ts   (extends EventBase, eventName 'order.created'…)
        exception/
          OrderNotModifiable.ts    (extends DomainException, código SAL001)
        repository/
          OrderRepository.ts       (abstract, extends AggregateRepository<Order>; findById, save, remove)
        service/
          OrderPricing.ts          (servicio de dominio)
          CouponCatalog.ts         (puerto de dominio)
        specification/
          FreeShippingEligible.ts  (extends Specification<Order>)
      application/
        place-order/
          place-order.ts           (PlaceOrder extends UseCase, con PlaceOrderInput y PlaceOrderCommand)
          money-data.ts, address-data.ts   (tipos de datos de la entrada)
        cancel-order/
          cancel-order.ts
        mark-order-paid/
          mark-order-paid-on-payment-captured.ts   (caso de uso por reacción: EventListener + @ListensTo)
          payment-captured-domain-event.ts         (copia del evento de Pagos que esta reacción escucha)
        order-summaries/           (read model)
          order-summary.ts, order-summary-store.ts, order-summaries.ts, order-summary-projection.ts
          mark-order-summary-paid/mark-order-summary-paid-on-order-paid.ts
      infrastructure/
        persistence/
          in-memory-order-repository.ts   (extends OrderRepository)
          mongo-order-repository.ts       (extends OrderRepository; constructor solo con la collection; cada save/remove atómico)
        coupon/
          in-memory-coupon-catalog.ts     (implements CouponCatalog)
        read-model/
          in-memory-order-summary-store.ts
        messaging/
          rabbit-mq-event-channel.ts      (implements EventChannel)
      interfaces/
        http/
          orders-controller.ts
      composition.ts               ← composition root del contexto: SalesContext.start / stop
    payments/
      ...
test/
  support/                         (fábricas de datos y dobles de test)
  contexts/sales/
    domain/                        (tests unitarios y de aceptación del modelo)
    application/                   (casos de uso con el repositorio en memoria e InMemoryEventChannel)
    infrastructure/                (integración con BD real o contenedor)
```

Nombres de fichero: PascalCase igual al nombre de la clase en `domain/` y `shared-kernel/`; kebab-case del export principal en todo lo demás. Imports relativos al fichero que declara cada símbolo, nunca a una carpeta ni a un `index.ts`, con `import type` para los tipos.

Lo que no aparece porque lo da `@archi-code/ddd`: clases base (`AggregateRoot`, `Entity`, `EventBase`, los tipos de value object, `Composite`), una interfaz de repositorio genérica (`AggregateRepository` y los roles `AggregateFinder`, `AggregateSaver` y `AggregateRemover` vienen de `@archi-code/ddd/domain`; el proyecto solo declara la clase abstracta `OrderRepository` que los usa), un `OrderMapper` (la conversión es del agregado, `toPrimitives()` y `static fromPrimitives()`, y cada repositorio los llama directamente; la versión la recuerda el propio repositorio en un `WeakMap<Order, number>`, nunca el agregado), un publicador de eventos (`DomainEventBus` implementa `EventBus`) y el puerto `Clock`. Tampoco hay un runner de transacciones ni una unidad de trabajo: la transacción es del repositorio `[Fuera de los libros: convención de @archi-code/ddd]`.

Lo que el paquete no da y escribe el proyecto: el repositorio abstracto de cada agregado en `domain/repository/`, que reciben todos sus casos de uso, y cada adaptador que lo extiende, uno por agregado y tecnología. Su constructor recibe solo las dependencias de su tecnología (la `collection` de Mongo, el `pool` de Postgres; nada en memoria), nunca la clase del agregado ni un mapper. Nada comprueba en ejecución la forma del agregado: que su estado sean value objects expuestos por getters y que `toPrimitives()`/`fromPrimitives()` no pierdan campos lo garantizan el agregado y su test de ida y vuelta. El repositorio en memoria es una implementación más [IDDD cap. 12]: vive en `infrastructure/persistence/` cuando la aplicación corre en memoria, o en `test/support/` cuando solo es un doble de test (ver `InMemoryOrderRepository` en `ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`).

Decisiones:
* Los tests de aceptación del modelo están junto al contexto, aunque en carpeta `test/` espejo [Destilado cap. 2 pide tenerlos con el código del contexto; la carpeta espejo mantiene esa correspondencia].
* Un contexto nunca importa otro. Solo se comparte `shared-kernel/` (el dinero); el resto viaja entre contextos como eventos, y cada contexto declara sus propios value objects y su propia copia de cada evento ajeno que escucha.
* Un caso de uso por reacción vive en la carpeta de su acción (`mark-order-paid/`), junto a la copia del evento que escucha; nunca en una carpeta `listeners/`.
* Los tipos de datos de la entrada (`MoneyData`) viven en la carpeta del caso de uso que los necesita primero; nunca en `domain/` ni compartidos entre contextos.
* El composition root vive por contexto para que cada contexto se pueda desplegar por separado si un día hace falta.

## Variante para proyectos con la lógica en `src/app/`

Algunos proyectos fijan `src/app/` para la lógica principal, `tests/` en raíz y `docs/` para las decisiones, y piden no crear carpetas raíz nuevas sin justificación `[Fuera de los libros]`. La estructura DDD encaja así:

```
src/
  app/
    contexts/
      shared-kernel/
      sales/ (domain, application, infrastructure, interfaces, composition.ts)
      payments/
    platform/
    shop.ts
  prompts/      (si el proyecto usa IA; nunca dentro del dominio)
config/
tests/
  contexts/sales/...
```

Reglas de encaje:
* El logger es el puerto `Logger` de `@archi-code/ddd/application` (`debug`, `info`, `warn`, `error`, cada uno con un mensaje estable en snake_case y un contexto). Lo reciben por constructor `application`, `infrastructure` e `interfaces`; el proveedor (`ConsoleLogger` del paquete, o un adaptador sobre pino, winston…) se elige en el arranque. El dominio no registra logs: registra eventos (`record`) o lanza un error de negocio con nombre y código. `[Fuera de los libros: convención de @archi-code/ddd]`
* Las variables de entorno se leen en el arranque y llegan a cada composition root como configuración tipada (`<Context>Settings`). Nunca `process.env` fuera de ahí.
* Los prompts de IA (si los hay) son infraestructura o aplicación; un modelo de lenguaje es un adaptador detrás de un puerto con nombre de negocio.

## Puertos y adaptadores

| Tipo | Ejemplo en el contexto de Ventas | Dónde se define la interfaz | Dónde se implementa |
|---|---|---|---|
| Entrada (driving) | HTTP `POST /orders`, un evento de Pagos | El caso de uso es la API de entrada (`execute(input)`, o `handle(event)` en un caso de uso por reacción) | `interfaces/` (controlador); el bus entrega el evento a la reacción |
| Salida de dominio | `OrderRepository` (tuyo, abstracto, sobre `AggregateRepository` y los roles del paquete); `CouponCatalog` (tuyo) | `domain/repository/`; `domain/service/` | `infrastructure/` (`InMemoryOrderRepository`, `MongoOrderRepository`, `InMemoryCouponCatalog`) |
| Salida de aplicación | `EventBus`, `Clock`, `Logger` (del paquete); el store y la consulta de un read model (tuyos) | `@archi-code/ddd/application`; `application/` | `DomainEventBus` sobre tu `EventChannel`, `SystemClock`, `ConsoleLogger` o tu adaptador; `InMemoryOrderSummaryStore` |

En IDDD los puertos no se implementan "a mano": el puerto es HTTP o el bus de mensajes, y el adaptador es el controlador o el suscriptor que traduce a la API de aplicación [IDDD cap. 4]. El interior se diseña por casos de uso, no por número de clientes [IDDD cap. 4].

Con el paquete, una tecnología de mensajería solo implementa `EventChannel` (`send` y `receive`); `DomainEventBus`, los casos de uso y las reacciones no cambian. `[Fuera de los libros: convención de @archi-code/ddd]`

## Composition root sin contenedor

Un composition root por contexto: una clase `<Context>Context` con `static async start(settings)`, `async stop()` y un `private static registry()` con cada evento que el contexto escucha.

```ts
// src/contexts/payments/composition.ts
import type { Clock, Logger } from '@archi-code/ddd/application';
import { DomainEventBus, EventRegistry } from '@archi-code/ddd/infrastructure';
import type { EventChannel, Subscription } from '@archi-code/ddd/infrastructure';
import { ConfirmTransferReceived } from './application/confirm-transfer-received/confirm-transfer-received';
import { OrderCreatedDomainEvent } from './application/request-payment/order-created-domain-event';
import { RequestPaymentOnOrderCreated } from './application/request-payment/request-payment-on-order-created';
import type { MoneyData } from './application/request-payment/money-data';
import { OrderCancelledDomainEvent } from './application/settle-cancelled-order-payment/order-cancelled-domain-event';
import { SettleCancelledOrderPaymentOnOrderCancelled } from './application/settle-cancelled-order-payment/settle-cancelled-order-payment-on-order-cancelled';
import { InMemoryPaymentRepository } from './infrastructure/persistence/in-memory-payment-repository';
import { PaymentsController } from './interfaces/http/payments-controller';

export interface PaymentsSettings {
  channel: EventChannel;
  clock: Clock;
  logger: Logger;
}

export class PaymentsContext {
  private constructor(
    readonly payments: InMemoryPaymentRepository,
    readonly controller: PaymentsController,
    private readonly subscriptions: Subscription[],
  ) {}

  static async start({ channel, clock, logger }: PaymentsSettings): Promise<PaymentsContext> {
    const bus = new DomainEventBus(channel, PaymentsContext.registry(), logger);
    const payments = new InMemoryPaymentRepository();
    const listeners = [
      new RequestPaymentOnOrderCreated(payments, bus, clock),
      new SettleCancelledOrderPaymentOnOrderCancelled(payments, bus, clock),
    ];
    const subscriptions: Subscription[] = [];
    for (const listener of listeners) {
      subscriptions.push(await bus.subscribe(listener));
    }
    const controller = new PaymentsController(
      new ConfirmTransferReceived(payments, bus, clock),
      logger,
    );
    return new PaymentsContext(payments, controller, subscriptions);
  }

  async stop(): Promise<void> {
    for (const subscription of this.subscriptions.splice(0)) {
      await subscription.unsubscribe();
    }
  }

  private static registry(): EventRegistry {
    return new EventRegistry()
      .register(
        OrderCreatedDomainEvent,
        (json) =>
          new OrderCreatedDomainEvent({
            orderId: json.orderId as string,
            total: json.total as MoneyData,
            paymentMethod: json.paymentMethod as string,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        OrderCancelledDomainEvent,
        (json) =>
          new OrderCancelledDomainEvent({
            orderId: json.orderId as string,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      );
  }
}
```

El arranque abre un canal y arranca cada contexto sobre él, con el mismo reloj y el mismo logger, y los para en orden inverso:

```ts
// src/shop.ts
const channel = new InMemoryEventChannel({ delivery: 'serial' });
const sales = await SalesContext.start({ channel, clock, logger, campaigns });
const payments = await PaymentsContext.start({ channel, clock, logger });
const shipping = await ShippingContext.start({ channel, clock, logger });
// cerrar: await shipping.stop(); await payments.stop(); await sales.stop();
```

Qué hace cada pieza:
* Del paquete, en `@archi-code/ddd/infrastructure`: `EventRegistry` (reconstruye cada evento desde su JSON; la factoría copia cada campo con un cast y pasa `eventId: json.eventId` y `occurredOn: json.occurredOn`, que las reacciones necesitan para ignorar una reentrega), `DomainEventBus` (implementa `EventBus`, lo único que reciben los casos de uso; su `subscribe(listener)` solo lo llama el composition root) y `SystemClock` o `FixedClock` (implementan `Clock`).
* Código del proyecto sobre los puertos del paquete `[Fuera de los libros: convención de @archi-code/ddd]`: el repositorio (`InMemoryPaymentRepository extends PaymentRepository`, el repositorio abstracto que declara el dominio; llama a `payment.toPrimitives()` y a `Payment.fromPrimitives(...)` y controla la versión, que recuerda por agregado en un `WeakMap`; responsable de toda la persistencia, ver `ddd-skills/ddd-repositorios-persistencia/GUIA.md`), el canal (`InMemoryEventChannel` del paquete, o un `EventChannel` propio como RabbitMQ, ver `ddd-skills/ddd-eventos-dominio/GUIA.md`) y el controlador.
* Cada caso de uso por reacción se construye con sus dependencias y se suscribe con `bus.subscribe(listener)`, que lee su `@ListensTo(OrderCreatedDomainEvent, { consumer: 'payments.request-payment-on-order-created' })` y rechaza un evento que el registro no sabe reconstruir (`UnknownEventException`). El composition root guarda cada `Subscription` para `stop()`.
* Cambiar la memoria por RabbitMQ o por un outbox cambia solo la línea del canal; con una base de datos real, `start` recibe la conexión en sus `Settings` y construye el repositorio de esa tecnología.
* Ni los casos de uso ni los repositorios reciben un runner de transacciones: el composition root no construye ninguno.

Por qué sin contenedor: en TypeScript las interfaces desaparecen en tiempo de ejecución y los contenedores necesitan tokens o decoradores. Para la mayoría de contextos, construir el grafo a mano es más legible y no mete decoradores de inyección en el dominio `[Fuera de los libros]`. Si usas NestJS, sus módulos y proveedores van en `interfaces/` e `infrastructure/`; el dominio sigue sin decoradores salvo `@Validations` de `@archi-code/validation` en los value objects.

## El mismo grafo en los tests de aplicación

Los tests de `application/` arrancan el contexto con su composition root sobre un `InMemoryEventChannel` y un `FixedClock`; los casos de uso y las reacciones son los mismos que en producción:

```ts
import { describe, expect, it } from 'vitest';
import {
  DomainEventBus,
  EventRegistry,
  FixedClock,
  InMemoryEventChannel,
  SilentLogger,
} from '@archi-code/ddd/infrastructure';

describe('Requesting the payment of a new order', () => {
  it('creates one payment per order even when the event arrives twice', async () => {
    const channel = new InMemoryEventChannel();
    const clock = new FixedClock('2026-03-01T09:30:00Z');
    const context = await PaymentsContext.start({ channel, clock, logger: new SilentLogger() });
    const bus = new DomainEventBus(channel, new EventRegistry());
    const orderCreated = new OrderCreatedDomainEvent({
      orderId,
      total: { amount: 4990, currency: 'EUR' },
      paymentMethod: 'card',
      clock,
    });

    await bus.publish([orderCreated]);
    await bus.publish([orderCreated]);

    expect(channel.sent.map((event) => event.eventName)).toEqual([
      'order.created',
      'payment.created',
      'payment.captured',
      'order.created',
    ]);
    await context.stop();
  });
});
```

El test comprueba lo que causó la reacción (lo que llevó el canal, `channel.sent`, o lo que guardó el repositorio) y entrega el mismo evento dos veces; nunca comprueba que se llamó a la reacción.

## Controlador como adaptador de entrada

Un ayudante técnico por protocolo, compartido por todos los contextos y sin reglas de negocio, traduce cada error con `ExceptionClassifier`. El paquete no trae nada de HTTP: `ExceptionClassifier.classify(error)` de `@archi-code/ddd/infrastructure` devuelve el `ExceptionKind` del fallo y cada protocolo (HTTP, un consumidor de mensajes, una CLI) lo traduce a sus códigos `[Fuera de los libros: convención de @archi-code/ddd]`:

```ts
// src/platform/http/http.ts
export class Http {
  private static readonly STATUS: Record<ExceptionKind, number> = {
    [ExceptionKind.NotFound]: 404,
    [ExceptionKind.NotAllowed]: 403,
    [ExceptionKind.Conflict]: 409,
    [ExceptionKind.Malformed]: 400,
    [ExceptionKind.Invalid]: 422,
    [ExceptionKind.Rejected]: 400,
    [ExceptionKind.Internal]: 500,
  };

  constructor(private readonly logger: Logger) {}

  async respond(action: () => Promise<HttpResponse>): Promise<HttpResponse> {
    try {
      return await action();
    } catch (error) {
      return this.failure(error);
    }
  }

  jsonBody(request: HttpRequest): JsonBody | null {
    const { body } = request;
    return typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as JsonBody)
      : null;
  }

  badRequest(message: string): HttpResponse {
    return { status: 400, body: { code: 'BAD_REQUEST', message } };
  }

  unauthenticated(): HttpResponse {
    return { status: 401, body: { code: 'UNAUTHENTICATED', message: 'Sign in first' } };
  }

  private failure(error: unknown): HttpResponse {
    const kind = ExceptionClassifier.classify(error);
    const known =
      error instanceof DomainException ||
      error instanceof ApplicationException ||
      error instanceof InfrastructureException;
    const code = known ? error.code : 'E000';
    if (kind === ExceptionKind.Internal) {
      this.logger.error('http_request_failed', { code, error });
      return { status: 500, body: { code, message: 'Internal server error' } };
    }
    const message = (error as Error).message;
    const errors = error instanceof ValidationException ? error.errors : undefined;
    return { status: Http.STATUS[kind], body: { code, message, errors } };
  }
}
```

El controlador recibe los casos de uso de usuario (o una interfaz `<Aggregates>UseCases` si son muchos), los puertos de consulta y el `logger` al final; cada endpoint comprueba el actor y la forma, llama al caso de uso y responde:

```ts
// src/contexts/payments/interfaces/http/payments-controller.ts
export class PaymentsController {
  private readonly http: Http;

  constructor(
    private readonly confirmTransferReceived: ConfirmTransferReceived,
    logger: Logger,
  ) {
    this.http = new Http(logger);
  }

  confirmTransfer(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const role = request.auth?.role;
      if (role === undefined) {
        return this.http.unauthenticated();
      }
      const body = this.http.jsonBody(request);
      if (body === null) {
        return this.http.badRequest('Send the received amount as a JSON object');
      }
      await this.confirmTransferReceived.execute({
        actorRole: role,
        paymentId: request.params?.paymentId as string,
        received: body as unknown as MoneyData,
      });
      return { status: 204 };
    });
  }
}
```

El controlador no sabe qué es un `Payment`. Comprueba solo la forma de la petición (el body es un objeto JSON, una lista es un array) [IDDD cap. 4]; las reglas de cada valor son de los value objects que `toCommand` construye con `ValueObjectBuilder.build`, y llegan como una `ValidationException` con todos los campos (422). La identidad o el rol del actor salen del token (`request.auth`), no del body, y van en el input para que el caso de uso decida la autorización. No captura errores ni elige estados: lo hace `Http.respond`. Crear responde 201 `{ id }`, un comando 204 y una consulta 200 (leyendo directamente el puerto de consulta del read model; una fila que falta, 404).

En HTTP: 404 `AggregateNotFoundException`, 403 `NotAllowedException`, 409 `ConcurrencyException`, 400 un error de conversión u obligatoriedad lanzado solo o cualquier otra `ApplicationException`, 422 `ValidationException` y cualquier otro error de negocio (`DomainException`), y 500 con un mensaje genérico para lo demás (también `UnexpectedErrorException`, el error ajeno que `UseCase.execute` envuelve). Cada 500 se registra una vez como `error`; el controlador no vuelve a registrarlo. Un consumidor de mensajes traduce el mismo `ExceptionKind` a confirmar, descartar o reintentar.

## Configuración de TypeScript

`[Fuera de los libros]`
* `strict: true`. El dominio se apoya en el tipado para expresar invariantes.
* `experimentalDecorators: true`: `@Validations` (value objects) y `@ListensTo` (casos de uso por reacción) son decoradores de clase.
* `moduleResolution` `node16`, `nodenext` o `bundler` para resolver los subpaths `@archi-code/ddd/domain`, `/application` y `/infrastructure` (cada uno exporta las excepciones de su capa); con `node` los resuelve el `typesVersions` del paquete.
* Imports relativos al fichero que declara cada símbolo; la ruta ya revela la zona (`../../domain/aggregate/Order`).
* `exactOptionalPropertyTypes` y `noUncheckedIndexedAccess` ayudan a que los value objects no acepten estados a medias.
